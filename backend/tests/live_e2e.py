"""Live smoke test for a running Sovereign AI frontend/backend/Ollama stack.

Run from backend/: python tests/live_e2e.py
The test uses unique users and prints their prefix so a failed run is traceable.
"""

import argparse
import json
import os
import sys
import time
import uuid

import httpx

BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database import SessionLocal  # noqa: E402
import config  # noqa: E402
from models import (  # noqa: E402
    AuditLog,
    ChatLog,
    ChatMessage,
    ChatSession,
    Document,
    DocumentChunk,
    GeneratedDeliverable,
    InspectionWorkflow,
    User,
    UserRole,
)


BASE_URL = os.getenv("E2E_BASE_URL", "http://127.0.0.1:3000")
PASSWORD = "Sovereign-E2E-Password-2026!"


def require(response: httpx.Response, expected: int, step: str) -> dict:
    if response.status_code != expected:
        raise RuntimeError(
            f"{step} failed: HTTP {response.status_code} {response.text[:1000]}"
        )
    if not response.content:
        return {}
    return response.json()


def register(client: httpx.Client, username: str) -> dict:
    return require(
        client.post(
            "/api/v1/auth/register",
            json={
                "username": username,
                "email": f"{username}@e2e.local",
                "password": PASSWORD,
            },
        ),
        200,
        f"register {username}",
    )


def promote_to_manager(username: str) -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).one()
        user.role = UserRole.MANAGER
        db.commit()
    finally:
        db.close()


def cleanup_run(run_id: str) -> None:
    """Remove only artifacts whose unique names belong to this E2E run."""
    db = SessionLocal()
    paths: set[str] = set()
    try:
        users = db.query(User).filter(User.username.like(f"{run_id}%")).all()
        user_ids = [user.id for user in users]
        documents = db.query(Document).filter(Document.filename == f"{run_id}.txt").all()
        document_ids = [document.id for document in documents]
        paths.update(document.file_path for document in documents if document.file_path)

        workflows = (
            db.query(InspectionWorkflow)
            .filter(InspectionWorkflow.document_id.in_(document_ids))
            .all()
            if document_ids
            else []
        )
        workflow_ids = [workflow.workflow_id for workflow in workflows]
        paths.update(
            workflow.deliverable_file_path
            for workflow in workflows
            if workflow.deliverable_file_path
        )

        deliverables_query = db.query(GeneratedDeliverable)
        if document_ids:
            deliverables_query = deliverables_query.filter(
                GeneratedDeliverable.source_document_id.in_(document_ids)
            )
            deliverables = deliverables_query.all()
            paths.update(item.file_path for item in deliverables if item.file_path)
            deliverables_query.delete(synchronize_session=False)

        session_ids = []
        if user_ids:
            session_ids = [
                row[0]
                for row in db.query(ChatSession.id)
                .filter(ChatSession.user_id.in_(user_ids))
                .all()
            ]
        if session_ids:
            db.query(ChatMessage).filter(ChatMessage.session_id.in_(session_ids)).delete(
                synchronize_session=False
            )
            db.query(ChatSession).filter(ChatSession.id.in_(session_ids)).delete(
                synchronize_session=False
            )
        if workflow_ids:
            db.query(InspectionWorkflow).filter(
                InspectionWorkflow.workflow_id.in_(workflow_ids)
            ).delete(synchronize_session=False)
        if document_ids:
            db.query(DocumentChunk).filter(
                DocumentChunk.document_id.in_(document_ids)
            ).delete(synchronize_session=False)
            db.query(Document).filter(Document.id.in_(document_ids)).delete(
                synchronize_session=False
            )
        if user_ids:
            db.query(AuditLog).filter(
                AuditLog.username.in_([f"{run_id}_operator", f"{run_id}_manager"])
            ).delete(synchronize_session=False)
            db.query(User).filter(User.id.in_(user_ids)).delete(synchronize_session=False)
        db.query(ChatLog).filter(
            ChatLog.prompt.like(f"Verification run {run_id}:%")
        ).delete(synchronize_session=False)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    allowed_roots = [os.path.realpath(config.UPLOAD_DIR), os.path.realpath(config.DELIVERABLES_DIR)]
    for path in paths:
        resolved = os.path.realpath(path)
        if any(os.path.commonpath([resolved, root]) == root for root in allowed_roots):
            if os.path.isfile(resolved):
                os.remove(resolved)
    print(json.dumps({"event": "e2e_cleanup", "run_id": run_id}))


def stream_chat(
    client: httpx.Client, session_id: int, document_id: int, run_id: str
) -> dict:
    tokens: list[str] = []
    done: dict = {}
    with client.stream(
        "POST",
        "/api/v1/chat",
        data={
            "session_id": str(session_id),
            "document_id": str(document_id),
            "prompt": (
                f"Verification run {run_id}: What is the vibration reading and "
                "required action? Cite the source."
            ),
        },
        timeout=180,
    ) as response:
        if response.status_code != 200:
            raise RuntimeError(f"chat failed: HTTP {response.status_code} {response.read()[:1000]}")
        for line in response.iter_lines():
            if not line.startswith("data: "):
                continue
            frame = json.loads(line[6:])
            if frame.get("type") == "token":
                tokens.append(frame.get("token", ""))
            elif frame.get("type") == "error":
                raise RuntimeError(f"chat stream error: {frame}")
            elif frame.get("type") == "done":
                done = frame
    answer = "".join(tokens).strip()
    if not answer or done.get("finish_reason") != "complete":
        raise RuntimeError(f"chat did not complete correctly: done={done}, chars={len(answer)}")
    if "[S1]" not in answer:
        raise RuntimeError(f"chat answer did not cite retrieved evidence: {answer[:500]}")
    return {"answer_chars": len(answer), "done": done}


def main(keep_data: bool = False) -> None:
    run_id = f"e2e_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    operator_name = f"{run_id}_operator"
    manager_name = f"{run_id}_manager"
    print(json.dumps({"event": "e2e_start", "run_id": run_id, "base_url": BASE_URL}))

    operator = httpx.Client(base_url=BASE_URL, timeout=180, follow_redirects=True)
    manager = httpx.Client(base_url=BASE_URL, timeout=180, follow_redirects=True)
    try:
        operator_user = register(operator, operator_name)["user"]
        register(manager, manager_name)
        promote_to_manager(manager_name)

        me = require(manager.get("/api/v1/auth/me"), 200, "manager identity")
        if me["role"] != "MANAGER":
            raise RuntimeError(f"manager role did not refresh from database: {me}")

        document_text = (
            "E2E turbine inspection record. Bearing vibration measured 8.2 mm/s. "
            "The shutdown threshold is 7.1 mm/s. Required action: stop the turbine, "
            "inspect the bearing, and obtain manager approval before restart."
        )
        uploaded = require(
            operator.post(
                "/api/v1/documents/upload",
                files={"file": (f"{run_id}.txt", document_text.encode(), "text/plain")},
            ),
            200,
            "document upload",
        )
        document_id = uploaded["document_id"]

        search = require(
            operator.post(
                "/api/v1/knowledge/search",
                json={"query": "bearing vibration shutdown threshold", "top_k": 3},
            ),
            200,
            "knowledge search",
        )
        if not search["results"] or search["results"][0]["document_id"] != document_id:
            raise RuntimeError(f"RAG search did not return the uploaded document: {search}")

        session = require(
            operator.post("/api/v1/chat/sessions"), 200, "chat session"
        )
        chat_result = stream_chat(operator, session["session_id"], document_id, run_id)

        history = require(
            operator.get(f"/api/v1/chat/sessions/{session['session_id']}/messages"),
            200,
            "chat history",
        )
        if len(history["messages"]) < 2:
            raise RuntimeError(f"streamed conversation was not persisted: {history}")

        inspection = require(
            operator.post(
                "/api/v1/workflows/inspection-approval",
                json={"document_id": document_id},
            ),
            200,
            "inspection workflow",
        )
        workflow_id = inspection["workflow_id"]

        pending = require(
            manager.get("/api/v1/inspections/pending-review"),
            200,
            "manager pending queue",
        )
        if workflow_id not in {item["workflow_id"] for item in pending["inspections"]}:
            raise RuntimeError("inspection missing from manager pending queue")

        reviewed = require(
            manager.patch(
                f"/api/v1/inspections/{workflow_id}/review",
                json={"decision": "APPROVED", "comment": "Live E2E approval verified."},
            ),
            200,
            "manager approval",
        )
        if reviewed["approval_status"] != "APPROVED":
            raise RuntimeError(f"approval did not persist: {reviewed}")

        report = manager.get(reviewed["download_url"])
        if report.status_code != 200 or len(report.content) < 1000:
            raise RuntimeError(
                f"approved report download failed: HTTP {report.status_code}, bytes={len(report.content)}"
            )

        audit = require(manager.get("/api/v1/audit/logs"), 200, "audit log")
        if not any(item["username"] in {operator_name, manager_name} for item in audit["logs"]):
            raise RuntimeError("test actors were not visible in recent audit records")

        print(
            json.dumps(
                {
                    "event": "e2e_pass",
                    "run_id": run_id,
                    "operator_id": operator_user["id"],
                    "document_id": document_id,
                    "workflow_id": workflow_id,
                    "answer_chars": chat_result["answer_chars"],
                    "report_bytes": len(report.content),
                }
            )
        )
        if not keep_data:
            cleanup_run(run_id)
    finally:
        operator.close()
        manager.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--keep-data", action="store_true")
    parser.add_argument("--cleanup-run")
    args = parser.parse_args()
    if args.cleanup_run:
        cleanup_run(args.cleanup_run)
    else:
        main(keep_data=args.keep_data)
