import os
import shutil

TESSERACT_CMD = os.getenv("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
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

SECRET_KEY = os.getenv("SECRET_KEY", "sovereign_ai_super_secret_jwt_key_2026_x987a")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8

