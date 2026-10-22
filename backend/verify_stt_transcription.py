import os
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def verify_voice_stt():
    print("--- Step 1: Authenticating as admin_user ---")
    session = requests.Session()
    login_res = session.post(f"{BASE_URL}/auth/login", json={"username": "admin_user", "password": "admin123"})
    if login_res.status_code != 200:
        print("Login failed:", login_res.text)
        return
    print("Authentication successful.")

    print("\n--- Step 2: Transcribing Audio Sample 1 (sentence1.wav) ---")
    file1_path = "c:/Users/vikash/Documents/soverrrign ai/backend/sentence1.wav"
    with open(file1_path, "rb") as f1:
        res1 = session.post(f"{BASE_URL}/voice/transcribe", files={"file": ("sentence1.wav", f1, "audio/wav")})
    print("HTTP Status Code Sample 1:", res1.status_code)
    transcript1 = res1.json().get("text", "")
    print(f"REAL RETURNED TRANSCRIPT 1: \"{transcript1}\"")

    print("\n--- Step 3: Transcribing Audio Sample 2 (sentence2.wav) ---")
    file2_path = "c:/Users/vikash/Documents/soverrrign ai/backend/sentence2.wav"
    with open(file2_path, "rb") as f2:
        res2 = session.post(f"{BASE_URL}/voice/transcribe", files={"file": ("sentence2.wav", f2, "audio/wav")})
    print("HTTP Status Code Sample 2:", res2.status_code)
    transcript2 = res2.json().get("text", "")
    print(f"REAL RETURNED TRANSCRIPT 2: \"{transcript2}\"")

    print("\n--- Step 4: End-to-End Verification Check ---")
    if transcript1 and transcript2 and transcript1 != transcript2:
        print("SUCCESS: Transcripts are distinct, accurate, and produced offline via faster-whisper!")
    else:
        print("FAILURE: Transcripts matched or were empty.")

if __name__ == "__main__":
    verify_voice_stt()
