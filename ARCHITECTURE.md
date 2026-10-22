# Sovereign AI — System Architecture & Technical Specifications

> **Air-Gapped Enterprise Intelligent Command Center**  
> *Zero Outbound Connections | Local LLM Orchestration | Subprocess Isolation | Immutable Audit Trail*

---

## 📐 1. Architectural Vision & Core Principles

Sovereign AI is built ground-up to deliver enterprise-grade generative AI, semantic document RAG, automated inspection workflows, and isolated code execution **without sending a single byte of data outside localhost**.

### Core Pillars:
1. **Absolute Air-Gap Security**: Zero external network API dependencies (no OpenAI, Anthropic, or external telemetry).
2. **Dual Local LLM Router**: Context-aware routing between lightweight fast models (`llama3.2:3b`) and high-precision coding/reasoning models (`qwen2.5-coder:7b`).
3. **Multimodal Data Extraction**: Local PDF, DOCX, XLSX, PPTX parsing with PyMuPDF, `python-docx`, `openpyxl`, `python-pptx`, and offline **Tesseract OCR** for scanned images.
4. **Offline Speech-to-Text**: High-speed, local CTranslate2 audio transcription using `faster-whisper`.
5. **Isolated Execution Sandbox**: Windows subprocess isolation with stdout/stderr trapping, execution timeouts, and memory boundaries.
6. **Role-Based Access Control (RBAC)**: Fine-grained `ADMIN`, `MANAGER`, and `OPERATOR` permission matrix backed by JWT tokens and real-time user-attributed audit logging.

---

## 🏗️ 2. High-Level System Blueprint

```mermaid
graph TD
    subgraph Client Layer [Frontend - Next.js 15 / React 19 / TypeScript / Tailwind CSS]
        UI[User Interface & Dashboard]
        Monaco[Monaco Code Editor]
        AudioRec[Audio Recorder / Waveform]
        NetWidget[Real-time Network Auditor Widget]
    end

    subgraph API Gateway [FastAPI / Uvicorn Server - Port 8000]
        Router[API Gateway & CORS]
        AuthGuard[JWT Auth & RBAC Guard]
        AuditInterceptor[Immutable Audit Logger]
    end

    subgraph Security & Monitoring
        NetScanner[psutil Network Socket Auditor]
    end

    subgraph Intelligence Subsystems [Backend Processing Core]
        TaskClassifier[Task Intent Classifier]
        RAGEngine[SentenceTransformers Embeddings]
        DocExtractor[Multimodal Extractor & Tesseract OCR]
        STTEngine[Faster-Whisper Local STT]
        CodeSandbox[Subprocess Sandbox Execution Engine]
        DocxGen[Executive Report Generator python-docx]
    end

    subgraph Local LLM Provider [Local Ollama Service - Port 11434]
        Llama3[Llama 3.2 3B - General & Chat]
        Qwen25[Qwen 2.5 Coder 7B - Code & Inspection]
    end

    subgraph Persistence Layer [Local File System & SQLite]
        DB[(SQLite app.db)]
        DocStore[Uploaded Documents Storage]
        ReportStore[Generated Deliverables Store]
    end

    UI --> Router
    Monaco --> Router
    AudioRec --> Router
    NetWidget --> NetScanner

    Router --> AuthGuard
    AuthGuard --> AuditInterceptor

    AuditInterceptor --> TaskClassifier
    AuditInterceptor --> DocExtractor
    AuditInterceptor --> STTEngine
    AuditInterceptor --> CodeSandbox
    AuditInterceptor --> DocxGen

    TaskClassifier -->|General Prompt| Llama3
    TaskClassifier -->|Coding / Inspection| Qwen25
    TaskClassifier --> RAGEngine

    DocExtractor --> RAGEngine
    RAGEngine --> DB
    AuditInterceptor --> DB
    DocStore --> DB
    DocxGen --> ReportStore
```

---

## 🧩 3. Subsystem Architecture Deep Dives

### 3.1. Network Auditor & Air-Gap Compliance Layer (`network_monitor.py`)
- **Mechanism**: Utilizes `psutil.net_connections(kind='inet')` to scan active network sockets bound to the backend PID and child processes.
- **Verification Rule**: Filters out `127.0.0.1`, `localhost`, `0.0.0.0`, and loopback sockets. Any external IP connection triggers a security alert and log entry.
- **Audit Endpoint**: Exposes `/api/v1/system/network-log` returning total outbound attempts (guaranteed `0`) and real-time operational status.

### 3.2. Dual-Model Local LLM Router (`classifier.py`)
- **Intent Classifier**: Inspects incoming prompts for key indicators (code keywords, python snippets, technical inspection terminology, complex tabular data).
- **Routing Rules**:
  - `CODE_ANALYSIS` / `INSPECTION` $\rightarrow$ Routes to `qwen2.5-coder:7b` for precise code generation, syntax accuracy, and structured JSON outputs.
  - `GENERAL_CHAT` / `SUMMARIZATION` $\rightarrow$ Routes to `llama3.2:3b` for low latency and smooth natural conversation.
- **Provider Protocol**: Standard HTTP REST interface communicating directly with Ollama's local port (`11434`).

### 3.3. Multimodal Document Parsing & OCR Pipeline (`extractor.py`)
- **Supported Formats**: `.pdf`, `.docx`, `.xlsx`, `.pptx`, `.png`, `.jpg`, `.jpeg`, `.bmp`, `.tiff`, `.txt`.
- **Extraction Engines**:
  - **PDF**: PyMuPDF (`fitz`) for fast text extraction. If text density is low, automatically falls back to **Tesseract OCR**.
  - **Images**: Local Tesseract OCR engine (`pytesseract`).
  - **Office Documents**: Native parsing via `python-docx`, `openpyxl`, and `python-pptx`.
- **Chunking & Vectorization**: Documents are broken into overlapping semantic text chunks, vectorized using `sentence-transformers/all-MiniLM-L6-v2`, and stored with cosine embeddings in SQLite.

### 3.4. Air-Gapped Speech-to-Text Engine (`whisper_stt.py`)
- **Local Engine**: Uses `faster-whisper` backed by CTranslate2.
- **Execution**: Converts `.wav`, `.mp3`, `.m4a`, `.ogg`, `.webm` client recordings locally without sending audio to external APIs.
- **Resource Management**: Lazy-loads model weights (`base` or `small` quantized model) to maximize GPU/CPU efficiency on standard hardware.

### 3.5. Subprocess Execution Sandbox (`sandbox.py`)
- **Isolation Model**: Executes user Python code in an isolated Windows subprocess using `subprocess.Popen`.
- **Security Boundaries**:
  - **Timeout Enforcement**: Enforces strict execution limits (default 10 seconds).
  - **Memory Limits**: Monitored via `psutil` parent-child process tree inspection.
  - **Output Capture**: Stdout and Stderr piped directly to isolated buffer channels.
  - **Clean Up**: Temporary scripts (`sandbox_temp/`) are destroyed immediately upon execution completion.

### 3.6. Automated Technical Inspection & Executive Report Generator (`report_generator.py`)
- **Multi-Stage Workflow**:
  1. Technical telemetry / sensor data ingested via form or document upload.
  2. Local LLM reasons over parameters against engineering thresholds.
  3. Pending review generated for **Manager / Admin** approval.
  4. Upon approval, compiles an executive `.docx` report featuring custom styled tables, severity callouts, executive summaries, and action item checklists.

---

## 🗄️ 4. Data Model & Database Schema

The database uses SQLite (`app.db`) managed via SQLAlchemy 2.0 ORM:

```mermaid
erDiagram
    USERS ||--o{ CHAT_SESSIONS : owns
    USERS ||--o{ DOCUMENTS : uploads
    USERS ||--o{ EXECUTION_LOGS : executes
    USERS ||--o{ AUDIT_LOGS : triggers
    USERS ||--o{ INSPECTION_WORKFLOWS : inspects

    CHAT_SESSIONS ||--o{ CHAT_MESSAGES : contains
    DOCUMENTS ||--o{ DOCUMENT_CHUNKS : contains

    USERS {
        int id PK
        string username UK
        string email UK
        string hashed_password
        enum role "ADMIN | MANAGER | OPERATOR"
        datetime created_at
    }

    CHAT_SESSIONS {
        string id PK
        int user_id FK
        string title
        datetime created_at
        datetime updated_at
    }

    CHAT_MESSAGES {
        string id PK
        string session_id FK
        string sender "user | assistant"
        text text
        string model_used
        datetime timestamp
    }

    DOCUMENTS {
        int id PK
        string filename
        string file_type
        int file_size
        string file_path
        int uploaded_by FK
        datetime uploaded_at
    }

    DOCUMENT_CHUNKS {
        int id PK
        int document_id FK
        int chunk_index
        text chunk_text
        text embedding_json
    }

    AUDIT_LOGS {
        int id PK
        int user_id FK
        string username
        string role
        string action
        string resource
        string details
        string ip_address
        datetime timestamp
    }

    INSPECTION_WORKFLOWS {
        string id PK
        string equipment_name
        string serial_number
        string status "PENDING_APPROVAL | APPROVED | REJECTED"
        text structured_data_json
        string report_file_path
        int created_by FK
        int approved_by FK
        datetime created_at
    }
```

---

## 🔄 5. Data Flow Sequence Diagrams

### 5.1. Air-Gapped Chat & Semantic RAG Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Frontend Next.js
    participant API as FastAPI Backend
    participant RAG as Vector Engine
    participant Ollama as Local Ollama LLM
    participant Audit as SQLite Audit Log

    User->>UI: Submit Prompt ("Explain turbine vibration log")
    UI->>API: POST /api/v1/chat (JWT Bearer)
    API->>Audit: Log user action ("CHAT_QUERY")
    API->>RAG: Compute prompt embedding & search chunks
    RAG-->>API: Return top-k relevant document chunks
    API->>API: Classify task intent (Routing -> qwen2.5-coder:7b)
    API->>Ollama: POST http://localhost:11434/api/chat (Prompt + Context)
    Ollama-->>API: Stream LLM response
    API-->>UI: Stream HTTP SSE response
    UI-->>User: Render markdown formatted output with citations
```

### 5.2. Technical Inspection Approval Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Operator
    actor Manager
    participant UI as Frontend Next.js
    participant API as FastAPI Backend
    participant ReportGen as python-docx Compiler
    participant DB as SQLite Database

    Operator->>UI: Input Equipment Telemetry & Submit Inspection
    UI->>API: POST /api/v1/inspection/submit
    API->>DB: Save Workflow (Status: PENDING_APPROVAL)
    
    Manager->>UI: View Pending Reviews (/reviews)
    Manager->>UI: Click "Approve & Generate Executive Report"
    UI->>API: POST /api/v1/inspection/approve/{id}
    API->>ReportGen: Build styled .docx deliverable
    ReportGen-->>API: Saved deliverable to /deliverables/*.docx
    API->>DB: Update Status -> APPROVED & link report_file_path
    API-->>UI: Return report download URL
    UI-->>Manager: Trigger DOCX file download
```

---

## 🛡️ 6. Security Boundaries & Air-Gap Compliance Checklist

| Security Control | Implementation Mechanism | Verification Method |
| :--- | :--- | :--- |
| **Zero Outbound Sockets** | In-process PID net-connection monitoring via `psutil` | `/api/v1/system/network-log` |
| **Data At Rest** | Local SQLite storage with parameterized SQLAlchemy query defense | DB file inspection |
| **Authentication & RBAC** | Passlib Password Hashing (Bcrypt) + PyJWT Token verification | Endpoint Guard Middleware |
| **Code Execution Sandbox** | Isolated subprocess with timeout & memory bounds | Code execution tests |
| **Immutable Audit Trail** | User-attributed audit log entries capturing user ID, role, IP, and timestamp | `/api/v1/audit/logs` |

---

## 🏆 Summary

Sovereign AI's architecture ensures complete data autonomy, zero cloud leakages, and instant local execution for high-security defense, industrial, healthcare, and enterprise environments.

## Database release lifecycle

Database changes are versioned in `backend/migrations` with Alembic. Every release must run
`alembic upgrade head` before the API process starts. Production startup compares the database's
recorded revision with the migration head and fails fast on drift, preventing mixed application and
schema versions. CI verifies upgrade, downgrade, re-upgrade, and model-to-schema drift on SQLite;
production deployments can use PostgreSQL through `DATABASE_URL`.

## Production container topology

The Compose deployment exposes only the Next.js frontend. Next.js proxies same-origin API and health traffic to FastAPI over a private bridge network, and FastAPI connects to PostgreSQL on that same network. Ollama remains host-managed so operators can control GPU drivers and model storage independently. Both application containers run as unprivileged users; the backend performs `alembic upgrade head` before accepting traffic. Liveness gates container orchestration without depending on the model runtime, while `/health` reports database, Ollama, and required-model readiness.
