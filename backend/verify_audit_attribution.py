import os
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_verification():
    print("--- 1. Logging in as User 1: admin_user (ADMIN) ---")
    res1 = requests.post(f"{BASE_URL}/auth/login", json={"username": "admin_user", "password": "admin123"})
    if res1.status_code != 200:
        print("Admin login failed:", res1.text)
        return
    admin_token = res1.json()["access_token"]
    print("admin_user logged in successfully.")

    print("\n--- 2. admin_user performs Real Action: Creating a Chat Session ---")
    chat_headers = {"Authorization": f"Bearer {admin_token}"}
    session_res = requests.post(
        f"{BASE_URL}/chat/sessions",
        json={"title": "Admin Turbine Audit Discussion"},
        headers=chat_headers
    )
    print("Create Chat Session Status:", session_res.status_code)

    print("\n--- 3. Registering / Logging in as User 2: employee_audit_test (EMPLOYEE) ---")
    emp_login = requests.post(f"{BASE_URL}/auth/login", json={"username": "employee_audit_test", "password": "employee123"})
    emp_token = emp_login.json()["access_token"]
    print("employee_audit_test logged in successfully.")

    print("\n--- 4. employee_audit_test performs Real Action: Document Upload ---")
    emp_headers = {"Authorization": f"Bearer {emp_token}"}
    upload_res = requests.post(
        f"{BASE_URL}/documents/upload",
        files={"file": ("audit_sample.txt", b"Safety guidelines for turbine operation.", "text/plain")},
        headers=emp_headers
    )
    print("Document Upload Status:", upload_res.status_code)

    print("\n--- 5. Fetching GET /api/v1/audit/logs as Admin ---")
    audit_res = requests.get(f"{BASE_URL}/audit/logs", headers=chat_headers)
    print("Audit Logs Status:", audit_res.status_code)
    audit_data = audit_res.json()

    print("\n--- 6. Inspection of Returned Audit Log Entries ---")
    logs = audit_data.get("logs", [])
    for l in logs[:10]:
        print(f"ID: #{l['id']} | User: {l.get('username')} ({l.get('role')}) | Method: {l['method']} | Endpoint: {l['endpoint']} | Summary: {l['summary']}")

if __name__ == "__main__":
    run_verification()
