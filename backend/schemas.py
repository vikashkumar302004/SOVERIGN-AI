from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel


class UserRoleEnum(str, Enum):
    EMPLOYEE = "EMPLOYEE"
    ANALYST = "ANALYST"
    MANAGER = "MANAGER"
    ADMIN = "ADMIN"


class UserRegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class UserLoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    created_at: str


class TokenResponse(BaseModel):
    user: UserResponse


class RoleUpdateRequest(BaseModel):
    role: str


class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int


class ChatRequest(BaseModel):
    session_id: Optional[int] = None
    prompt: str


class ChatResponse(BaseModel):
    session_id: int
    prompt: str
    content: str
    model_used: str
    routed_to_reason: str
    attached_document_id: Optional[int] = None
    attached_filename: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    ollama_reachable: bool
    database_connected: bool
    details: Optional[str] = None


class DocumentUploadResponse(BaseModel):
    document_id: int
    filename: str
    file_size: int
    extracted_text_preview: str
    total_text_length: int
    used_ocr: bool
    ocr_confidence: Optional[float] = None
    chunks_created: int


class DocumentItem(BaseModel):
    id: int
    filename: str
    file_size: int
    extracted_text_preview: str
    total_text_length: int
    used_ocr: bool
    ocr_confidence: Optional[float] = None
    created_at: str
    owner_id: Optional[int] = None
    owner_username: Optional[str] = None


class DocumentListResponse(BaseModel):
    documents: List[DocumentItem]
    total: int




class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5


class SearchResultItem(BaseModel):
    document_id: int
    filename: str
    chunk_id: int
    chunk_index: int
    chunk_text: str
    similarity_score: float


class SearchResponse(BaseModel):
    query: str
    status: str
    message: Optional[str] = None
    total_chunks_evaluated: int
    results: List[SearchResultItem]


class SandboxRequest(BaseModel):
    language: str
    code: str
    stdin: Optional[str] = None


class SandboxResponse(BaseModel):
    status: str
    stdout: str
    stderr: str
    exit_code: int


class WorkflowInspectionRequest(BaseModel):
    document_id: int


class RelatedContextItem(BaseModel):
    document_id: int
    filename: str
    chunk_text: str
    similarity_score: float


class WorkflowInspectionResponse(BaseModel):
    workflow_id: str
    document_id: int
    document_filename: str
    model_analysis: str
    ai_recommendation: str = "NEEDS REVIEW"
    approval_status: str = "PENDING_REVIEW"
    reviewed_by: Optional[str] = None
    reviewer_comment: Optional[str] = None
    reviewed_at: Optional[str] = None
    related_context: List[RelatedContextItem]
    deliverable_file_path: str
    download_url: str


class InspectionReviewItem(BaseModel):
    id: int
    workflow_id: str
    document_id: int
    document_filename: str
    ai_recommendation: str
    approval_status: str
    model_analysis: str
    submitted_by_username: str
    submitted_at: str
    reviewed_by_username: Optional[str] = None
    reviewer_comment: Optional[str] = None
    reviewed_at: Optional[str] = None
    download_url: str


class InspectionPendingReviewResponse(BaseModel):
    inspections: List[InspectionReviewItem]
    total: int


class InspectionReviewRequest(BaseModel):
    decision: str  # "APPROVED" or "REJECTED"
    comment: Optional[str] = None


class NetworkEventItem(BaseModel):
    timestamp: str
    remote_ip: str
    remote_port: int
    local_port: int
    pid: Optional[int] = None
    process_name: Optional[str] = None


class NetworkLogResponse(BaseModel):
    total_outbound_attempts: int
    events: List[NetworkEventItem]
    current_status: str


class AuditLogItem(BaseModel):
    id: int
    timestamp: str
    endpoint: str
    method: str
    status_code: int
    duration_ms: float
    summary: str
    username: str = "anonymous"
    role: str = "ANONYMOUS"


class AuditLogResponse(BaseModel):
    logs: List[AuditLogItem]
    total: int


class ChatSessionItem(BaseModel):
    id: int
    session_id: Optional[int] = None
    title: str
    is_starred: bool = False
    created_at: str
    last_message_preview: Optional[str] = None
    message_count: int = 0


class ChatSessionListResponse(BaseModel):
    sessions: List[ChatSessionItem]
    total: int


class ChatMessageItem(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    model_used: Optional[str] = None
    attached_document_id: Optional[int] = None
    attached_filename: Optional[str] = None
    timestamp: str


class ChatMessageHistoryResponse(BaseModel):
    session_id: int
    title: str
    messages: List[ChatMessageItem]


class DeliverableGenerateRequest(BaseModel):
    prompt: str
    output_format: str  # "docx" | "pptx" | "pdf"
    document_id: Optional[int] = None


class DeliverableGenerateResponse(BaseModel):
    filename: str
    download_url: str
    output_format: str
    model_used: str
    generated_content: Dict[str, Any]
    attached_document_filename: Optional[str] = None




