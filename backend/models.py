import enum
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Boolean,
    Float,
    ForeignKey,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
from database import Base


class UserRole(str, enum.Enum):
    EMPLOYEE = "EMPLOYEE"
    ANALYST = "ANALYST"
    MANAGER = "MANAGER"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.EMPLOYEE)
    created_at = Column(DateTime, default=datetime.now)

    documents = relationship("Document", back_populates="owner")


class ChatLog(Base):
    __tablename__ = "chat_logs"

    id = Column(Integer, primary_key=True, index=True)
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    model = Column(String, nullable=False)
    routed_to_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    extracted_text = Column(Text, nullable=False)
    used_ocr = Column(Boolean, nullable=False, default=False)
    ocr_confidence = Column(Float, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    owner = relationship("User", back_populates="documents")
    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )



class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Text, nullable=False)  # JSON array string
    created_at = Column(DateTime, default=datetime.now)

    document = relationship("Document", back_populates="chunks")


class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id = Column(Integer, primary_key=True, index=True)
    language = Column(String, nullable=False)
    code = Column(Text, nullable=False)
    status = Column(String, nullable=False)
    stdout = Column(Text, nullable=True)
    stderr = Column(Text, nullable=True)
    exit_code = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.now)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.now)
    endpoint = Column(String, nullable=False)
    method = Column(String, nullable=False)
    status_code = Column(Integer, nullable=False)
    duration_ms = Column(Float, nullable=False)
    summary = Column(Text, nullable=False)
    username = Column(String, nullable=False, default="anonymous")
    role = Column(String, nullable=False, default="ANONYMOUS")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, default="New Chat")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_starred = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User")
    messages = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    model_used = Column(String, nullable=True)
    attached_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.now)

    session = relationship("ChatSession", back_populates="messages")
    attached_document = relationship("Document")


class ApprovalStatus(str, enum.Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class InspectionWorkflow(Base):
    __tablename__ = "inspection_workflows"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(String, unique=True, index=True, nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    ai_recommendation = Column(String, nullable=False)
    model_analysis = Column(Text, nullable=False)
    related_context_json = Column(Text, nullable=True)
    deliverable_file_path = Column(String, nullable=False)
    approval_status = Column(SQLEnum(ApprovalStatus), nullable=False, default=ApprovalStatus.PENDING_REVIEW)
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_comment = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    document = relationship("Document")
    submitted_by = relationship("User", foreign_keys=[submitted_by_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])


class GeneratedDeliverable(Base):
    __tablename__ = "generated_deliverables"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=True, index=True, nullable=False)
    file_path = Column(String, nullable=False)
    output_format = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    source_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    workflow_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.now)

    owner = relationship("User", foreign_keys=[owner_id])
    source_document = relationship("Document", foreign_keys=[source_document_id])



