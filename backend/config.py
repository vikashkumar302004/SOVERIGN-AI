import os
import shutil


def _csv_env(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]

TESSERACT_CMD = os.getenv("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
if not os.path.exists(TESSERACT_CMD):
    system_tesseract = shutil.which("tesseract")
    if system_tesseract:
        TESSERACT_CMD = system_tesseract
GXX_CMD = os.getenv(
    "GXX_CMD",
    r"C:\Users\vikash\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin\g++.exe",
)

if not os.path.exists(GXX_CMD):
    system_gxx = shutil.which("g++")
    if system_gxx:
        GXX_CMD = system_gxx

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploaded_documents")
SANDBOX_TEMP_DIR = os.path.join(os.path.dirname(__file__), "sandbox_temp")
DELIVERABLES_DIR = os.path.join(os.path.dirname(__file__), "deliverables")
TEMP_AUDIO_DIR = os.path.join(os.path.dirname(__file__), "temp_audio")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(SANDBOX_TEMP_DIR, exist_ok=True)
os.makedirs(DELIVERABLES_DIR, exist_ok=True)
os.makedirs(TEMP_AUDIO_DIR, exist_ok=True)

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
if ENVIRONMENT == "production" and SECRET_KEY == "dev-only-change-me":
    raise RuntimeError("SECRET_KEY must be set to a strong value in production")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8
LOGIN_MAX_FAILURES = int(os.getenv("LOGIN_MAX_FAILURES", "5"))
LOGIN_WINDOW_MINUTES = int(os.getenv("LOGIN_WINDOW_MINUTES", "15"))
AUTH_COOKIE_NAME = os.getenv("AUTH_COOKIE_NAME", "sovereign_session")
AUTH_COOKIE_SECURE = os.getenv(
    "AUTH_COOKIE_SECURE",
    "true" if ENVIRONMENT == "production" else "false",
).lower() in {"1", "true", "yes"}
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
CORS_ORIGINS = _csv_env(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
TRUSTED_HOSTS = _csv_env("TRUSTED_HOSTS", "localhost,127.0.0.1,testserver")
ENABLE_API_DOCS = os.getenv(
    "ENABLE_API_DOCS",
    "false" if ENVIRONMENT == "production" else "true",
).lower() in {"1", "true", "yes"}
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(25 * 1024 * 1024)))
MAX_PROMPT_CHARS = int(os.getenv("MAX_PROMPT_CHARS", "32000"))
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "4"))
RAG_MAX_CANDIDATE_CHUNKS = int(os.getenv("RAG_MAX_CANDIDATE_CHUNKS", "2000"))
CHAT_CONTEXT_CHARS = int(os.getenv("CHAT_CONTEXT_CHARS", "12000"))
CHAT_HISTORY_MESSAGE_CHARS = int(os.getenv("CHAT_HISTORY_MESSAGE_CHARS", "4000"))
CHAT_TEMPERATURE = float(os.getenv("CHAT_TEMPERATURE", "0.2"))
CHAT_NUM_CTX = int(os.getenv("CHAT_NUM_CTX", "8192"))
ENABLE_CODE_SANDBOX = os.getenv(
    "ENABLE_CODE_SANDBOX",
    "true" if ENVIRONMENT == "development" else "false",
).lower() in {"1", "true", "yes"}
REQUIRE_DATABASE_MIGRATIONS = os.getenv(
    "REQUIRE_DATABASE_MIGRATIONS",
    "true" if ENVIRONMENT == "production" else "false",
).lower() in {"1", "true", "yes"}
ALLOWED_UPLOAD_EXTENSIONS = {
    ".pdf", ".docx", ".xlsx", ".pptx", ".png", ".jpg", ".jpeg",
    ".bmp", ".tiff", ".txt", ".wav", ".mp3", ".m4a", ".ogg", ".webm",
}

