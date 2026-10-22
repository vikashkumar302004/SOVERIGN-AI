from datetime import datetime, timezone
import json
import os
import shutil
import time
import uuid
from typing import BinaryIO, List, Optional
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Request, Form
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
import httpx

import config
from database import engine, Base, get_db, SessionLocal
from models import (
    User,
    UserRole,
    ChatLog,
    Document,
    DocumentChunk,
    ExecutionLog,
    AuditLog,
    ChatSession,
    ChatMessage,
    ApprovalStatus,
    InspectionWorkflow,
)
from schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
    RoleUpdateRequest,
    UserListResponse,
    ChatRequest,
    ChatResponse,
    HealthResponse,
    DocumentUploadResponse,
    DocumentItem,
    DocumentListResponse,
    SearchRequest,
    SearchResponse,
    SearchResultItem,
    SandboxRequest,
    SandboxResponse,
    WorkflowInspectionRequest,
    WorkflowInspectionResponse,
    RelatedContextItem,
    NetworkLogResponse,
    AuditLogResponse,
    AuditLogItem,
    ChatSessionItem,
    ChatSessionListResponse,
    ChatMessageItem,
    ChatMessageHistoryResponse,
    DeliverableGenerateRequest,
    DeliverableGenerateResponse,
    InspectionReviewItem,
    InspectionPendingReviewResponse,
    InspectionReviewRequest,
)
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_roles,
)
from classifier import classify_task
from extractor import extract_text_from_file
from embeddings import get_embedding, cosine_similarity
from sandbox import execute_code
from report_generator import generate_inspection_report_docx, structured_content_to_file
from network_monitor import network_monitor
from whisper_stt import init_whisper, transcribe_audio_file

from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

# Ensure username and role columns exist in audit_logs table
try:
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(audit_logs)"))
        existing_cols = [row[1] for row in result.fetchall()]
        if "username" not in existing_cols:
            conn.execute(text("ALTER TABLE audit_logs ADD COLUMN username VARCHAR DEFAULT 'anonymous'"))
            conn.commit()
        if "role" not in existing_cols:
            conn.execute(text("ALTER TABLE audit_logs ADD COLUMN role VARCHAR DEFAULT 'ANONYMOUS'"))
            conn.commit()
except Exception as _mig_err:
    print(f"Audit log column migration check: {_mig_err}")


app = FastAPI(title="Sovereign AI Backend", version="5.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
)


@app.on_event("startup")
def startup_event():
    network_monitor.start()


@app.middleware("http")
async def audit_logger_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)

    endpoint = request.url.path
    method = request.method
    status_code = response.status_code

    username = "anonymous"
    role = "ANONYMOUS"

    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            from jose import jwt
            payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
            token_sub = payload.get("sub") or payload.get("username")
            token_role = payload.get("role")
            if token_sub:
                username = token_sub
            if token_role:
                role = str(token_role)
        except Exception:
            username = "anonymous"
            role = "ANONYMOUS"

    summary = getattr(request.state, "audit_summary", None)
    if not summary:
        if endpoint == "/health":
            summary = f"System health check (HTTP {status_code})"
        elif endpoint == "/api/v1/system/network-log":
            summary = "Queried background network monitor status"
        elif endpoint == "/api/v1/audit/logs":
            summary = "Queried system audit logs"
        elif endpoint == "/api/v1/documents/list":
            summary = "Fetched registered documents list"
        else:
            summary = f"API Request: {method} {endpoint}"

    try:
        db = SessionLocal()
        log_entry = AuditLog(
            timestamp=datetime.now(),
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            duration_ms=duration_ms,
            summary=summary,
            username=username,
            role=role,
        )
        db.add(log_entry)
        db.commit()
        db.close()
    except Exception as e:
        print(f"Failed to save audit log: {e}")

    return response


OLLAMA_URL = config.OLLAMA_URL


def _owned_session_query(db: Session, session_id: int, user_id: int):
    return db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == user_id,
    )


def _can_access_document(document: Document, user: User) -> bool:
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    return document.owner_id == user.id or role in {"MANAGER", "ADMIN"}


def _validate_upload_name(filename: str) -> str:
    safe_name = os.path.basename(filename)
    ext = os.path.splitext(safe_name)[1].lower()
    if not safe_name or ext not in config.ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    return safe_name


def _save_upload_limited(source: BinaryIO, destination: str) -> int:
    total = 0
    try:
        with open(destination, "wb") as buffer:
            while chunk := source.read(1024 * 1024):
                total += len(chunk)
                if total > config.MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="Uploaded file is too large")
                buffer.write(chunk)
        return total
    except Exception:
        if os.path.exists(destination):
            os.remove(destination)
        raise


def chunk_text(text: str, max_chars: int = 400) -> List[str]:
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    if not paragraphs:
        return [text] if text.strip() else []

    chunks = []
    current_chunk = []
    current_len = 0
    for p in paragraphs:
        if current_len + len(p) > max_chars and current_chunk:
            chunks.append("\n".join(current_chunk))
            current_chunk = [p]
            current_len = len(p)
        else:
            current_chunk.append(p)
            current_len += len(p)
    if current_chunk:
        chunks.append("\n".join(current_chunk))
    return chunks


_health_cache = {"timestamp": 0, "ollama_reachable": False, "details": None}


@app.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    global _health_cache
    now = time.time()

    db_connected = False
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
    except Exception as e:
        db_connected = False

    if now - _health_cache["timestamp"] < 5.0:
        ollama_reachable = _health_cache["ollama_reachable"]
        details = _health_cache["details"]
    else:
        ollama_reachable = False
        details = None
        try:
            async with httpx.AsyncClient(timeout=0.5) as client:
                resp = await client.get(f"{OLLAMA_URL}/api/tags")
                if resp.status_code == 200:
                    ollama_reachable = True
                else:
                    details = f"Ollama returned HTTP status {resp.status_code}"
        except Exception as e:
            ollama_reachable = False
            details = f"Ollama connection error: {str(e)}"

        _health_cache = {
            "timestamp": now,
            "ollama_reachable": ollama_reachable,
            "details": details,
        }

    status = "ok" if (ollama_reachable and db_connected) else "degraded"
    return HealthResponse(
        status=status,
        ollama_reachable=ollama_reachable,
        database_connected=db_connected,
        details=details,
    )


# --- AUTH & ADMIN ENDPOINTS ---

@app.post("/api/v1/auth/register", response_model=TokenResponse)
async def register_user(request: UserRegisterRequest, db: Session = Depends(get_db)):
    if not request.username or not request.username.strip():
        raise HTTPException(status_code=400, detail="Username is required")
    if not request.email or not request.email.strip():
        raise HTTPException(status_code=400, detail="Email is required")
    if not request.password or len(request.password) < 12:
        raise HTTPException(
            status_code=400, detail="Password must be at least 12 characters long"
        )

    username_clean = request.username.strip()
    email_clean = request.email.strip().lower()

    existing_user = (
        db.query(User)
        .filter((User.username == username_clean) | (User.email == email_clean))
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=400, detail="Username or email already registered"
        )

    user_count = db.query(User).count()
    assigned_role = UserRole.ADMIN if user_count == 0 else UserRole.EMPLOYEE

    hashed_pwd = hash_password(request.password)
    user = User(
        username=username_clean,
        email=email_clean,
        hashed_password=hashed_pwd,
        role=assigned_role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    role_str = (
        user.role.value if hasattr(user.role, "value") else str(user.role)
    )
    token = create_access_token(
        {"sub": user.username, "user_id": user.id, "role": role_str}
    )

    user_resp = UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=role_str,
        created_at=user.created_at.isoformat() if user.created_at else "",
    )
    return TokenResponse(access_token=token, token_type="bearer", user=user_resp)


@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login_user(request: UserLoginRequest, db: Session = Depends(get_db)):
    if not request.username or not request.password:
        raise HTTPException(
            status_code=400, detail="Username and password are required"
        )

    login_id = request.username.strip()
    user = (
        db.query(User)
        .filter((User.username == login_id) | (User.email == login_id.lower()))
        .first()
    )

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=401, detail="Invalid username or password"
        )

    role_str = (
        user.role.value if hasattr(user.role, "value") else str(user.role)
    )
    token = create_access_token(
        {"sub": user.username, "user_id": user.id, "role": role_str}
    )

    user_resp = UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=role_str,
        created_at=user.created_at.isoformat() if user.created_at else "",
    )
    return TokenResponse(access_token=token, token_type="bearer", user=user_resp)


@app.get("/api/v1/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    role_str = (
        current_user.role.value
        if hasattr(current_user.role, "value")
        else str(current_user.role)
    )
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=role_str,
        created_at=current_user.created_at.isoformat()
        if current_user.created_at
        else "",
    )


@app.get("/api/v1/admin/users", response_model=UserListResponse)
async def list_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles(["ADMIN"])),
):
    users = db.query(User).order_by(User.id.asc()).all()
    user_items = []
    for u in users:
        r_str = u.role.value if hasattr(u.role, "value") else str(u.role)
        user_items.append(
            UserResponse(
                id=u.id,
                username=u.username,
                email=u.email,
                role=r_str,
                created_at=u.created_at.isoformat() if u.created_at else "",
            )
        )
    return UserListResponse(users=user_items, total=len(user_items))


@app.patch("/api/v1/admin/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    req: RoleUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles(["ADMIN"])),
):
    target_role = req.role.upper().strip()
    valid_roles = [r.value for r in UserRole]
    if target_role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{req.role}'. Must be one of {valid_roles}.",
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=404, detail=f"User with ID {user_id} not found"
        )

    target_user.role = UserRole(target_role)
    db.commit()
    db.refresh(target_user)

    r_str = (
        target_user.role.value
        if hasattr(target_user.role, "value")
        else str(target_user.role)
    )
    return UserResponse(
        id=target_user.id,
        username=target_user.username,
        email=target_user.email,
        role=r_str,
        created_at=target_user.created_at.isoformat()
        if target_user.created_at
        else "",
    )


@app.post("/api/v1/chat/sessions", response_model=ChatSessionItem)
async def create_chat_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = ChatSession(title="New Chat", user_id=current_user.id, is_starred=False)
    db.add(session)
    db.commit()
    db.refresh(session)
    return ChatSessionItem(
        id=session.id,
        session_id=session.id,
        title=session.title,
        is_starred=False,
        created_at=session.created_at.isoformat() if session.created_at else "",
        last_message_preview=None,
        message_count=0,
    )


@app.get("/api/v1/chat/sessions", response_model=ChatSessionListResponse)
async def list_chat_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.is_starred.desc(), ChatSession.id.desc())
        .all()
    )
    items = []
    for s in sessions:
        last_msg = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == s.id)
            .order_by(ChatMessage.id.desc())
            .first()
        )
        msg_count = (
            db.query(ChatMessage).filter(ChatMessage.session_id == s.id).count()
        )
        items.append(
            ChatSessionItem(
                id=s.id,
                session_id=s.id,
                title=s.title,
                is_starred=bool(s.is_starred),
                created_at=s.created_at.isoformat() if s.created_at else "",
                last_message_preview=last_msg.content[:60] if last_msg else None,
                message_count=msg_count,
            )
        )
    return ChatSessionListResponse(sessions=items, total=len(items))


@app.patch("/api/v1/chat/sessions/{session_id}/star", response_model=ChatSessionItem)
async def toggle_star_chat_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _owned_session_query(db, session_id, current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    session.is_starred = not bool(session.is_starred)
    db.commit()
    db.refresh(session)

    last_msg = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.id.desc())
        .first()
    )
    msg_count = db.query(ChatMessage).filter(ChatMessage.session_id == session.id).count()

    return ChatSessionItem(
        id=session.id,
        session_id=session.id,
        title=session.title,
        is_starred=bool(session.is_starred),
        created_at=session.created_at.isoformat() if session.created_at else "",
        last_message_preview=last_msg.content[:60] if last_msg else None,
        message_count=msg_count,
    )


@app.delete("/api/v1/chat/sessions/{session_id}")
async def delete_chat_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _owned_session_query(db, session_id, current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete(synchronize_session=False)
    db.delete(session)
    db.commit()

    return {"message": "Chat session deleted successfully", "deleted_id": session_id}


@app.get(
    "/api/v1/chat/sessions/{session_id}/messages",
    response_model=ChatMessageHistoryResponse,
)
async def get_session_messages(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _owned_session_query(db, session_id, current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.id.asc())
        .all()
    )
    items = []
    for m in messages:
        attached_fn = None
        if m.attached_document_id and m.attached_document:
            attached_fn = m.attached_document.filename
        items.append(
            ChatMessageItem(
                id=m.id,
                session_id=m.session_id,
                role=m.role,
                content=m.content,
                model_used=m.model_used,
                attached_document_id=m.attached_document_id,
                attached_filename=attached_fn,
                timestamp=m.timestamp.isoformat() if m.timestamp else "",
            )
        )
    return ChatMessageHistoryResponse(
        session_id=session.id, title=session.title, messages=items
    )


@app.post("/api/v1/chat")
async def chat(
    http_req: Request,
    prompt: Optional[str] = Form(None),
    session_id: Optional[int] = Form(None),
    document_id: Optional[int] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Support JSON fallback if Form parameters are missing
    if prompt is None:
        try:
            body = await http_req.json()
            prompt = body.get("prompt")
            session_id = body.get("session_id")
            document_id = body.get("document_id")
        except Exception:
            pass

    if not prompt or not prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt must not be empty")

    prompt_text = prompt.strip()

    # Retrieve or Create ChatSession
    session = None
    if session_id:
        session = _owned_session_query(db, session_id, current_user.id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
    if session is None:
        session = ChatSession(title="New Chat", user_id=current_user.id)
        db.add(session)
        db.commit()
        db.refresh(session)
        session_id = session.id

    # Process Optional File Attachment via Phase 3 Extraction Pipeline
    attached_doc_record = None
    extracted_file_text = None

    if file and file.filename:
        original_filename = _validate_upload_name(file.filename)
        ext = os.path.splitext(original_filename)[1].lower()
        stored_name = f"{uuid.uuid4().hex}{ext}"
        saved_path = os.path.join(config.UPLOAD_DIR, stored_name)

        try:
            file_size = _save_upload_limited(file.file, saved_path)

            extraction = extract_text_from_file(saved_path, original_filename)
            extracted_file_text = extraction["extracted_text"]
            used_ocr = extraction["used_ocr"]
            ocr_confidence = extraction["ocr_confidence"]

            attached_doc_record = Document(
                filename=original_filename,
                file_path=saved_path,
                file_size=file_size,
                extracted_text=extracted_file_text,
                used_ocr=used_ocr,
                ocr_confidence=ocr_confidence,
                owner_id=current_user.id,
            )
            db.add(attached_doc_record)
            db.commit()
            db.refresh(attached_doc_record)

            text_chunks = chunk_text(extracted_file_text)
            for idx, c_text in enumerate(text_chunks):
                if not c_text.strip():
                    continue
                vec = get_embedding(c_text)
                chunk_obj = DocumentChunk(
                    document_id=attached_doc_record.id,
                    chunk_index=idx,
                    chunk_text=c_text,
                    embedding=json.dumps(vec),
                )
                db.add(chunk_obj)
            db.commit()

        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail="File attachment processing failed",
            )

    elif document_id is not None:
        attached_doc_record = db.query(Document).filter(Document.id == document_id).first()
        if not attached_doc_record or not _can_access_document(attached_doc_record, current_user):
            raise HTTPException(status_code=404, detail="Document not found")
        extracted_file_text = attached_doc_record.extracted_text

    model_used, routed_to_reason = classify_task(prompt_text)

    # Auto-generate title for first user message in session
    if session.title in ("New Chat", ""):
        first_line = prompt_text.split("\n")[0].strip()
        auto_title = first_line[:40] if len(first_line) > 40 else first_line
        session.title = auto_title
        db.commit()

    # Fetch last ~10 messages from ChatMessage memory
    past_messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.id.asc())
        .all()
    )
    recent_past = past_messages[-10:] if len(past_messages) > 10 else past_messages

    # Format user prompt for this turn (include file content if attached)
    if extracted_file_text:
        user_turn_content = (
            f"[ATTACHED FILE: '{attached_doc_record.filename}']\n"
            f"--- EXTRACTED FILE CONTENT ---\n"
            f"{extracted_file_text}\n"
            f"--- END EXTRACTED FILE CONTENT ---\n\n"
            f"User Question: {prompt_text}"
        )
    else:
        user_turn_content = prompt_text

    # Build Ollama messages array for multi-turn chat memory
    ollama_messages = []
    for pm in recent_past:
        ollama_messages.append({"role": pm.role, "content": pm.content})

    ollama_messages.append({"role": "user", "content": user_turn_content})

    # Save User ChatMessage immediately before streaming starts
    user_msg_entry = ChatMessage(
        session_id=session.id,
        role="user",
        content=prompt_text,
        attached_document_id=attached_doc_record.id if attached_doc_record else None,
    )
    db.add(user_msg_entry)
    db.commit()
    db.refresh(user_msg_entry)

    att_info = f", attached '{attached_doc_record.filename}'" if attached_doc_record else ""
    http_req.state.audit_summary = f"Streaming Chat (Session #{session.id}) via {model_used}: prompt '{prompt_text[:30]}...'{att_info}"

    async def event_generator():
        # 1. Send initial metadata payload
        init_frame = {
            "type": "init",
            "session_id": session.id,
            "session_title": session.title,
            "user_message_id": user_msg_entry.id,
            "model_used": model_used,
            "attached_filename": attached_doc_record.filename if attached_doc_record else None,
            "attached_document_id": attached_doc_record.id if attached_doc_record else None,
        }
        yield f"data: {json.dumps(init_frame)}\n\n"

        full_response_text = ""
        payload = {
            "model": model_used,
            "messages": ollama_messages,
            "stream": True,
        }

        try:
            async with httpx.AsyncClient(timeout=180.0) as client:
                async with client.stream("POST", f"{OLLAMA_URL}/api/chat", json=payload) as resp:
                    if resp.status_code == 200:
                        async for line in resp.aiter_lines():
                            if await http_req.is_disconnected():
                                return
                            if not line.strip():
                                continue
                            try:
                                chunk_json = json.loads(line)
                                token = chunk_json.get("message", {}).get("content", "")
                                if token:
                                    full_response_text += token
                                    token_frame = {
                                        "type": "token",
                                        "token": token,
                                        "model_used": model_used,
                                        "session_id": session.id,
                                    }
                                    yield f"data: {json.dumps(token_frame)}\n\n"
                            except Exception:
                                pass
                    else:
                        # Fallback to /api/generate
                        gen_payload = {
                            "model": model_used,
                            "prompt": user_turn_content,
                            "stream": True,
                        }
                        async with client.stream("POST", f"{OLLAMA_URL}/api/generate", json=gen_payload) as gen_resp:
                            if gen_resp.status_code == 200:
                                async for line in gen_resp.aiter_lines():
                                    if await http_req.is_disconnected():
                                        return
                                    if not line.strip():
                                        continue
                                    try:
                                        chunk_json = json.loads(line)
                                        token = chunk_json.get("response", "")
                                        if token:
                                            full_response_text += token
                                            token_frame = {
                                                "type": "token",
                                                "token": token,
                                                "model_used": model_used,
                                                "session_id": session.id,
                                            }
                                            yield f"data: {json.dumps(token_frame)}\n\n"
                                    except Exception:
                                        pass
                            else:
                                err_frame = {"type": "error", "error": f"Ollama returned HTTP {gen_resp.status_code}"}
                                yield f"data: {json.dumps(err_frame)}\n\n"

        except Exception as exc:
            err_frame = {"type": "error", "error": f"Ollama connection stream error: {str(exc)}"}
            yield f"data: {json.dumps(err_frame)}\n\n"

        # Save Assistant ChatMessage to DB once streaming finishes
        if full_response_text:
            try:
                save_db = SessionLocal()
                ai_msg_entry = ChatMessage(
                    session_id=session.id,
                    role="assistant",
                    content=full_response_text,
                    model_used=model_used,
                )
                save_db.add(ai_msg_entry)
                log_entry = ChatLog(
                    prompt=prompt_text,
                    response=full_response_text,
                    model=model_used,
                    routed_to_reason=routed_to_reason,
                )
                save_db.add(log_entry)
                save_db.commit()
                ai_msg_id = ai_msg_entry.id
                save_db.close()
            except Exception as e:
                print(f"Failed saving streamed assistant message: {e}")
                ai_msg_id = None

            done_frame = {
                "type": "done",
                "full_text": full_response_text,
                "ai_message_id": ai_msg_id,
                "model_used": model_used,
                "session_id": session.id,
            }
            yield f"data: {json.dumps(done_frame)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )



@app.post("/api/v1/documents/upload", response_model=DocumentUploadResponse)
async def upload_document(
    http_req: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    original_filename = _validate_upload_name(file.filename)
    ext = os.path.splitext(original_filename)[1].lower()
    stored_name = f"{uuid.uuid4().hex}{ext}"
    saved_path = os.path.join(config.UPLOAD_DIR, stored_name)

    try:
        file_size = _save_upload_limited(file.file, saved_path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save uploaded file: {str(e)}"
        )

    try:
        extraction = extract_text_from_file(saved_path, original_filename)
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Text extraction failed: {str(exc)}"
        )

    extracted_text = extraction["extracted_text"]
    used_ocr = extraction["used_ocr"]
    ocr_confidence = extraction["ocr_confidence"]

    doc_record = Document(
        filename=original_filename,
        file_path=saved_path,
        file_size=file_size,
        extracted_text=extracted_text,
        used_ocr=used_ocr,
        ocr_confidence=ocr_confidence,
        owner_id=current_user.id,
    )
    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)

    text_chunks = chunk_text(extracted_text)
    chunks_created = 0
    for idx, c_text in enumerate(text_chunks):
        if not c_text.strip():
            continue
        vec = get_embedding(c_text)
        chunk_obj = DocumentChunk(
            document_id=doc_record.id,
            chunk_index=idx,
            chunk_text=c_text,
            embedding=json.dumps(vec),
        )
        db.add(chunk_obj)
        chunks_created += 1

    db.commit()

    preview = (
        extracted_text[:500] if len(extracted_text) > 500 else extracted_text
    )

    ocr_info = f"OCR confidence {ocr_confidence:.1f}%" if used_ocr and ocr_confidence is not None else "Text parser"
    http_req.state.audit_summary = f"Uploaded '{file.filename}' by user {current_user.username} ({file_size} bytes, {chunks_created} chunks, {ocr_info})"

    return DocumentUploadResponse(
        document_id=doc_record.id,
        filename=doc_record.filename,
        file_size=doc_record.file_size,
        extracted_text_preview=preview,
        total_text_length=len(extracted_text),
        used_ocr=used_ocr,
        ocr_confidence=ocr_confidence,
        chunks_created=chunks_created,
    )


@app.get("/api/v1/documents/list", response_model=DocumentListResponse)
async def list_documents(
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role_str = (
        current_user.role.value
        if hasattr(current_user.role, "value")
        else str(current_user.role)
    )

    if role_str in ["MANAGER", "ADMIN"]:
        docs = db.query(Document).order_by(Document.created_at.desc()).all()
    else:
        docs = (
            db.query(Document)
            .filter(Document.owner_id == current_user.id)
            .order_by(Document.created_at.desc())
            .all()
        )

    items = []
    for d in docs:
        text_preview = (
            d.extracted_text[:300] if len(d.extracted_text) > 300 else d.extracted_text
        )
        owner_name = d.owner.username if d.owner else None
        items.append(
            DocumentItem(
                id=d.id,
                filename=d.filename,
                file_size=d.file_size,
                extracted_text_preview=text_preview,
                total_text_length=len(d.extracted_text),
                used_ocr=d.used_ocr,
                ocr_confidence=d.ocr_confidence,
                created_at=d.created_at.isoformat() if d.created_at else "",
                owner_id=d.owner_id,
                owner_username=owner_name,
            )
        )
    http_req.state.audit_summary = (
        f"Fetched registry of {len(items)} document(s) for role {role_str}"
    )
    return DocumentListResponse(documents=items, total=len(items))



@app.post("/api/v1/knowledge/search", response_model=SearchResponse)
async def knowledge_search(
    request: SearchRequest,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query string must not be empty")

    top_k = request.top_k if (request.top_k and request.top_k > 0) else 5

    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    chunks_query = db.query(DocumentChunk).join(Document)
    if role_str not in {"MANAGER", "ADMIN"}:
        chunks_query = chunks_query.filter(Document.owner_id == current_user.id)
    chunks = chunks_query.all()

    if not chunks:
        http_req.state.audit_summary = f"Vector search for '{request.query[:30]}' (Knowledge base empty)"
        return SearchResponse(
            query=request.query,
            status="empty",
            message="Knowledge base is empty. Upload documents first.",
            total_chunks_evaluated=0,
            results=[],
        )

    query_vector = get_embedding(request.query)

    scored_results = []
    for chunk in chunks:
        chunk_vector = json.loads(chunk.embedding)
        score = cosine_similarity(query_vector, chunk_vector)
        scored_results.append(
            SearchResultItem(
                document_id=chunk.document_id,
                filename=chunk.document.filename if chunk.document else "unknown",
                chunk_id=chunk.id,
                chunk_index=chunk.chunk_index,
                chunk_text=chunk.chunk_text,
                similarity_score=score,
            )
        )

    scored_results.sort(key=lambda x: x.similarity_score, reverse=True)
    http_req.state.audit_summary = f"Vector RAG search for '{request.query[:35]}' evaluated {len(chunks)} chunk(s)"

    return SearchResponse(
        query=request.query,
        status="ok",
        message=None,
        total_chunks_evaluated=len(chunks),
        results=scored_results[:top_k],
    )


@app.post("/api/v1/sandbox/execute", response_model=SandboxResponse)
async def sandbox_execute(
    request: SandboxRequest,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not config.ENABLE_CODE_SANDBOX:
        raise HTTPException(
            status_code=503,
            detail="Code execution is disabled until an isolated sandbox worker is configured",
        )
    if not request.code or not request.code.strip():
        raise HTTPException(status_code=400, detail="Code string must not be empty")

    try:
        res = execute_code(
            language=request.language, code=request.code, stdin=request.stdin
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Sandbox execution error: {str(exc)}"
        )

    log_entry = ExecutionLog(
        language=request.language,
        code=request.code,
        status=res["status"],
        stdout=res["stdout"],
        stderr=res["stderr"],
        exit_code=res["exit_code"],
    )
    db.add(log_entry)
    db.commit()

    http_req.state.audit_summary = f"Subprocess code execution ({request.language}): status {res['status']}, exit code {res['exit_code']}"

    return SandboxResponse(
        status=res["status"],
        stdout=res["stdout"],
        stderr=res["stderr"],
        exit_code=res["exit_code"],
    )


@app.post("/api/v1/workflows/inspection-approval", response_model=WorkflowInspectionResponse)
async def inspection_approval_workflow(
    request: WorkflowInspectionRequest,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc_record = db.query(Document).filter(Document.id == request.document_id).first()
    if not doc_record or not _can_access_document(doc_record, current_user):
        raise HTTPException(
            status_code=404, detail=f"Document with ID {request.document_id} not found."
        )

    extracted_text = doc_record.extracted_text
    if not extracted_text or not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail=f"Document ID {request.document_id} has no extracted text content.",
        )

    prompt = (
        "You are an expert technical inspection auditor. Analyze the following document text:\n\n"
        f"--- DOCUMENT CONTENT (Filename: {doc_record.filename}) ---\n"
        f"{extracted_text}\n"
        "--- END DOCUMENT CONTENT ---\n\n"
        "Please provide a rigorous evaluation containing:\n"
        "1. Key Findings: Identify specific readings, measurements, anomalies, or issues present in the text.\n"
        "2. Readings & Thresholds: List all numeric values with their associated units and threshold comparisons.\n"
        "3. Final Recommendation: Give a clear PASS, FAIL, or NEEDS-REVIEW recommendation based strictly on the text provided."
    )

    model_used, routed_to_reason = classify_task(prompt)

    payload = {
        "model": model_used,
        "prompt": prompt,
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(f"{OLLAMA_URL}/api/generate", json=payload)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=503,
                    detail=f"Ollama error for model '{model_used}' (HTTP {resp.status_code}): {resp.text}",
                )

            data = resp.json()
            model_analysis = data.get("response", "")

    except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama server is unavailable at {OLLAMA_URL}: {str(exc)}",
        )

    search_query = f"Inspection standards SOP threshold limit {extracted_text[:150]}"
    query_vector = get_embedding(search_query)

    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    chunks_query = db.query(DocumentChunk).join(Document).filter(
        DocumentChunk.document_id != request.document_id
    )
    if role_str not in {"MANAGER", "ADMIN"}:
        chunks_query = chunks_query.filter(Document.owner_id == current_user.id)
    chunks = chunks_query.all()
    if not chunks:
        fallback_query = db.query(DocumentChunk).join(Document)
        if role_str not in {"MANAGER", "ADMIN"}:
            fallback_query = fallback_query.filter(Document.owner_id == current_user.id)
        chunks = fallback_query.all()

    related_context = []
    if chunks:
        scored_results = []
        for chunk in chunks:
            chunk_vector = json.loads(chunk.embedding)
            score = cosine_similarity(query_vector, chunk_vector)
            if score > 0.20:
                scored_results.append(
                    {
                        "document_id": chunk.document_id,
                        "filename": chunk.document.filename if chunk.document else "unknown",
                        "chunk_text": chunk.chunk_text,
                        "similarity_score": float(score),
                    }
                )
        scored_results.sort(key=lambda x: x["similarity_score"], reverse=True)
        related_context = scored_results[:3]

    rec_upper = model_analysis.upper()
    if "FAIL" in rec_upper:
        ai_rec = "FAIL"
    elif "PASS" in rec_upper:
        ai_rec = "PASS"
    else:
        ai_rec = "NEEDS REVIEW"

    workflow_id = f"wf-{uuid.uuid4().hex[:12]}"
    report_meta = generate_inspection_report_docx(
        workflow_id=workflow_id,
        document_id=doc_record.id,
        document_filename=doc_record.filename,
        model_analysis=model_analysis,
        related_context=related_context,
        ai_recommendation=ai_rec,
        approval_status="PENDING_REVIEW",
    )

    deliverable_file_path = report_meta["deliverable_file_path"]
    download_filename = report_meta["filename"]
    download_url = f"/api/v1/deliverables/{download_filename}"

    # Persist Inspection Workflow in DB
    inspection_wf = InspectionWorkflow(
        workflow_id=workflow_id,
        document_id=doc_record.id,
        submitted_by_id=current_user.id,
        ai_recommendation=ai_rec,
        model_analysis=model_analysis,
        related_context_json=json.dumps(related_context) if related_context else None,
        deliverable_file_path=deliverable_file_path,
        approval_status=ApprovalStatus.PENDING_REVIEW,
    )
    db.add(inspection_wf)
    db.commit()
    db.refresh(inspection_wf)

    context_items = [
        RelatedContextItem(
            document_id=item["document_id"],
            filename=item["filename"],
            chunk_text=item["chunk_text"],
            similarity_score=item["similarity_score"],
        )
        for item in related_context
    ]

    http_req.state.audit_summary = f"Inspection approval workflow for '{doc_record.filename}': recommendation analysis & docx report generated"

    return WorkflowInspectionResponse(
        workflow_id=workflow_id,
        document_id=doc_record.id,
        document_filename=doc_record.filename,
        model_analysis=model_analysis,
        ai_recommendation=ai_rec,
        approval_status="PENDING_REVIEW",
        reviewed_by=None,
        reviewer_comment=None,
        reviewed_at=None,
        related_context=context_items,
        deliverable_file_path=deliverable_file_path,
        download_url=download_url,
    )


@app.get("/api/v1/inspections/pending-review", response_model=InspectionPendingReviewResponse)
async def get_pending_inspections(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["MANAGER", "ADMIN"])),
):
    pending_items = (
        db.query(InspectionWorkflow)
        .filter(InspectionWorkflow.approval_status == ApprovalStatus.PENDING_REVIEW)
        .order_by(InspectionWorkflow.created_at.desc())
        .all()
    )

    items = []
    for item in pending_items:
        filename = item.document.filename if item.document else "unknown"
        submitted_by_name = item.submitted_by.username if item.submitted_by else "system"
        download_fn = os.path.basename(item.deliverable_file_path)
        items.append(
            InspectionReviewItem(
                id=item.id,
                workflow_id=item.workflow_id,
                document_id=item.document_id,
                document_filename=filename,
                ai_recommendation=item.ai_recommendation,
                approval_status=item.approval_status.value if isinstance(item.approval_status, ApprovalStatus) else str(item.approval_status),
                model_analysis=item.model_analysis,
                submitted_by_username=submitted_by_name,
                submitted_at=item.created_at.strftime("%Y-%m-%d %H:%M:%S") if item.created_at else "",
                reviewed_by_username=item.reviewed_by.username if item.reviewed_by else None,
                reviewer_comment=item.reviewer_comment,
                reviewed_at=item.reviewed_at.strftime("%Y-%m-%d %H:%M:%S") if item.reviewed_at else None,
                download_url=f"/api/v1/deliverables/{download_fn}",
            )
        )

    return InspectionPendingReviewResponse(inspections=items, total=len(items))


@app.get("/api/v1/inspections/reviewed-history", response_model=InspectionPendingReviewResponse)
async def get_reviewed_inspections(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["MANAGER", "ADMIN"])),
):
    reviewed_items = (
        db.query(InspectionWorkflow)
        .filter(InspectionWorkflow.approval_status != ApprovalStatus.PENDING_REVIEW)
        .order_by(InspectionWorkflow.reviewed_at.desc())
        .all()
    )

    items = []
    for item in reviewed_items:
        filename = item.document.filename if item.document else "unknown"
        submitted_by_name = item.submitted_by.username if item.submitted_by else "system"
        download_fn = os.path.basename(item.deliverable_file_path)
        items.append(
            InspectionReviewItem(
                id=item.id,
                workflow_id=item.workflow_id,
                document_id=item.document_id,
                document_filename=filename,
                ai_recommendation=item.ai_recommendation,
                approval_status=item.approval_status.value if isinstance(item.approval_status, ApprovalStatus) else str(item.approval_status),
                model_analysis=item.model_analysis,
                submitted_by_username=submitted_by_name,
                submitted_at=item.created_at.strftime("%Y-%m-%d %H:%M:%S") if item.created_at else "",
                reviewed_by_username=item.reviewed_by.username if item.reviewed_by else None,
                reviewer_comment=item.reviewer_comment,
                reviewed_at=item.reviewed_at.strftime("%Y-%m-%d %H:%M:%S") if item.reviewed_at else None,
                download_url=f"/api/v1/deliverables/{download_fn}",
            )
        )

    return InspectionPendingReviewResponse(inspections=items, total=len(items))


@app.patch("/api/v1/inspections/{workflow_id}/review", response_model=InspectionReviewItem)
async def review_inspection(
    workflow_id: str,
    request: InspectionReviewRequest,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["MANAGER", "ADMIN"])),
):
    wf_record = db.query(InspectionWorkflow).filter(InspectionWorkflow.workflow_id == workflow_id).first()
    if not wf_record:
        raise HTTPException(
            status_code=404, detail=f"Inspection workflow '{workflow_id}' not found."
        )

    decision_upper = request.decision.upper().strip()
    if decision_upper not in ["APPROVED", "REJECTED"]:
        raise HTTPException(
            status_code=400, detail="Decision must be either 'APPROVED' or 'REJECTED'."
        )

    now = datetime.now(timezone.utc)
    wf_record.approval_status = ApprovalStatus.APPROVED if decision_upper == "APPROVED" else ApprovalStatus.REJECTED
    wf_record.reviewed_by_id = current_user.id
    wf_record.reviewer_comment = request.comment
    wf_record.reviewed_at = now

    # Regenerate deliverable .docx report showing human decision alongside AI recommendation
    related_context = json.loads(wf_record.related_context_json) if wf_record.related_context_json else []
    doc_filename = wf_record.document.filename if wf_record.document else f"Document_{wf_record.document_id}"

    reviewed_at_str = now.strftime("%Y-%m-%d %H:%M:%S UTC")
    report_meta = generate_inspection_report_docx(
        workflow_id=wf_record.workflow_id,
        document_id=wf_record.document_id,
        document_filename=doc_filename,
        model_analysis=wf_record.model_analysis,
        related_context=related_context,
        ai_recommendation=wf_record.ai_recommendation,
        approval_status=decision_upper,
        reviewed_by_name=current_user.username,
        reviewer_comment=wf_record.reviewer_comment,
        reviewed_at_str=reviewed_at_str,
    )

    wf_record.deliverable_file_path = report_meta["deliverable_file_path"]

    db.commit()
    db.refresh(wf_record)

    http_req.state.audit_summary = f"Inspection workflow '{workflow_id}' reviewed: {decision_upper} by {current_user.username}"

    download_fn = os.path.basename(wf_record.deliverable_file_path)
    return InspectionReviewItem(
        id=wf_record.id,
        workflow_id=wf_record.workflow_id,
        document_id=wf_record.document_id,
        document_filename=doc_filename,
        ai_recommendation=wf_record.ai_recommendation,
        approval_status=wf_record.approval_status.value if isinstance(wf_record.approval_status, ApprovalStatus) else str(wf_record.approval_status),
        model_analysis=wf_record.model_analysis,
        submitted_by_username=wf_record.submitted_by.username if wf_record.submitted_by else "system",
        submitted_at=wf_record.created_at.strftime("%Y-%m-%d %H:%M:%S") if wf_record.created_at else "",
        reviewed_by_username=current_user.username,
        reviewer_comment=wf_record.reviewer_comment,
        reviewed_at=wf_record.reviewed_at.strftime("%Y-%m-%d %H:%M:%S") if wf_record.reviewed_at else "",
        download_url=f"/api/v1/deliverables/{download_fn}",
    )


@app.post("/api/v1/deliverables/generate", response_model=DeliverableGenerateResponse)
async def generate_deliverable(
    request: DeliverableGenerateRequest,
    http_req: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt must not be empty")

    output_fmt = request.output_format.lower().strip()
    if output_fmt not in ["docx", "pptx", "pdf"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid output_format. Must be 'docx', 'pptx', or 'pdf'."
        )

    attached_doc_filename = None
    doc_context = ""
    if request.document_id:
        doc_record = db.query(Document).filter(Document.id == request.document_id).first()
        if not doc_record or not _can_access_document(doc_record, current_user):
            raise HTTPException(
                status_code=404,
                detail=f"Document with ID {request.document_id} not found."
            )
        attached_doc_filename = doc_record.filename
        if doc_record.extracted_text and doc_record.extracted_text.strip():
            doc_context = (
                f"\n\n--- ATTACHED DOCUMENT CONTEXT (Filename: {doc_record.filename}) ---\n"
                f"{doc_record.extracted_text}\n"
                f"--- END ATTACHED DOCUMENT CONTEXT ---\n"
            )

    model_used, routed_reason = classify_task(request.prompt)

    if output_fmt in ["docx", "pdf"]:
        json_structure_instruction = (
            "Return a valid JSON object matching this schema:\n"
            "{\n"
            '  "title": "Document Title",\n'
            '  "subtitle": "Brief subtitle or executive summary note",\n'
            '  "sections": [\n'
            '    {\n'
            '      "heading": "Section Heading",\n'
            '      "content": "Detailed explanatory text for this section.",\n'
            '      "bullet_points": ["Key point 1", "Key point 2"]\n'
            "    }\n"
            "  ]\n"
            "}\n"
        )
    else:  # pptx
        json_structure_instruction = (
            "Return a valid JSON object matching this schema:\n"
            "{\n"
            '  "title": "Presentation Title",\n'
            '  "subtitle": "Presentation Subtitle",\n'
            '  "slides": [\n'
            '    {\n'
            '      "title": "Slide Title",\n'
            '      "bullet_points": ["Key bullet point 1", "Key bullet point 2", "Key bullet point 3"]\n'
            "    }\n"
            "  ]\n"
            "}\n"
        )

    full_prompt = (
        f"User Request: {request.prompt}\n"
        f"{doc_context}\n"
        f"INSTRUCTION: You are a professional document author. Produce comprehensive, well-structured content for a {output_fmt.upper()} deliverable based on the user request and document context.\n"
        f"CRITICAL: Respond ONLY with a valid, raw JSON object matching the requested schema below. Do NOT add markdown code blocks (no ```), do NOT add introductory prose.\n\n"
        f"{json_structure_instruction}"
    )

    payload = {
        "model": model_used,
        "prompt": full_prompt,
        "format": "json",
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(f"{OLLAMA_URL}/api/generate", json=payload)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=503,
                    detail=f"Ollama error for model '{model_used}' (HTTP {resp.status_code}): {resp.text}",
                )

            data = resp.json()
            raw_response = data.get("response", "").strip()

    except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama server is unavailable at {OLLAMA_URL}: {str(exc)}",
        )

    clean_json_str = raw_response
    if clean_json_str.startswith("```"):
        lines = clean_json_str.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        clean_json_str = "\n".join(lines).strip()

    try:
        structured_content = json.loads(clean_json_str)
    except Exception:
        structured_content = {
            "title": request.prompt[:60],
            "subtitle": f"Generated via {model_used}",
            "sections": [
                {
                    "heading": "Overview & Model Output",
                    "content": raw_response,
                    "bullet_points": [],
                }
            ],
        }

    gen_result = structured_content_to_file(
        content=structured_content,
        output_format=output_fmt,
        filename_prefix=f"deliverable_{output_fmt}",
    )

    http_req.state.audit_summary = (
        f"Generated {output_fmt.upper()} deliverable '{gen_result['filename']}' "
        f"via {model_used} for prompt '{request.prompt[:30]}...'"
    )

    return DeliverableGenerateResponse(
        filename=gen_result["filename"],
        download_url=gen_result["download_url"],
        output_format=output_fmt,
        model_used=model_used,
        generated_content=structured_content,
        attached_document_filename=attached_doc_filename,
    )


@app.get("/api/v1/deliverables/{filename}")
async def get_deliverable(
    filename: str,
    http_req: Request,
    current_user: User = Depends(get_current_user),
):
    safe_filename = os.path.basename(filename)
    if safe_filename != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    file_path = os.path.join(config.DELIVERABLES_DIR, safe_filename)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404, detail=f"Deliverable file '{filename}' not found."
        )
    ext = os.path.splitext(filename)[1].lower()
    media_types = {
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".pdf": "application/pdf",
    }
    media_type = media_types.get(ext, "application/octet-stream")
    http_req.state.audit_summary = f"Downloaded deliverable file '{filename}'"
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=media_type,
    )


@app.get("/api/v1/system/network-log", response_model=NetworkLogResponse)
async def get_network_log(
    current_user: User = Depends(require_roles(["MANAGER", "ADMIN"])),
):
    return network_monitor.get_status()


@app.get("/api/v1/audit/logs", response_model=AuditLogResponse)
async def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["MANAGER", "ADMIN"])),
):
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(50).all()
    items = [
        AuditLogItem(
            id=l.id,
            timestamp=l.timestamp.isoformat() if l.timestamp else "",
            endpoint=l.endpoint,
            method=l.method,
            status_code=l.status_code,
            duration_ms=l.duration_ms,
            summary=l.summary,
            username=getattr(l, "username", "anonymous") or "anonymous",
            role=getattr(l, "role", "ANONYMOUS") or "ANONYMOUS",
        )
        for l in logs
    ]
    return AuditLogResponse(logs=items, total=len(items))


@app.post("/api/v1/voice/transcribe")
async def transcribe_voice(
    file: UploadFile = File(...),
    http_req: Request = None,
    current_user: User = Depends(get_current_user),
):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Audio file must be provided")

    original_filename = _validate_upload_name(file.filename)
    temp_filename = f"voice_{uuid.uuid4().hex}_{original_filename}"
    temp_path = os.path.join(config.TEMP_AUDIO_DIR, temp_filename)

    try:
        _save_upload_limited(file.file, temp_path)

        transcript = transcribe_audio_file(temp_path)
        if not transcript or not transcript.strip():
            raise HTTPException(status_code=422, detail="No speech detected in audio recording")

        if http_req and hasattr(http_req, "state"):
            http_req.state.audit_summary = f"Transcribed offline voice input ({len(transcript)} chars)"

        return {"text": transcript}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice transcription failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass




