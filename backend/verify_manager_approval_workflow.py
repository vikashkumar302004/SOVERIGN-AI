import requests
import json
import uuid
import os

BASE_URL = "http://127.0.0.1:8000"

def run_verification():
    print("==================================================")
    print("VERIFICATION: MANAGER APPROVAL & SIGN-OFF WORKFLOW")
    print("==================================================\n")

    # 1. Setup/Login Users
    # Employee User
    emp_user = f"emp_{uuid.uuid4().hex[:6]}"
    emp_email = f"{emp_user}@example.com"
    emp_pass = "employee12345"
    employee_session = requests.Session()
    reg_resp = employee_session.post(
        f"{BASE_URL}/api/v1/auth/register",
        json={"username": emp_user, "email": emp_email, "password": emp_pass, "role": "EMPLOYEE"},
    )
    assert reg_resp.status_code == 200, f"Employee registration failed: {reg_resp.text}"

    emp_login = employee_session.post(f"{BASE_URL}/api/v1/auth/login", json={"username": emp_user, "password": emp_pass})
    assert emp_login.status_code == 200, f"Employee login failed: {emp_login.text}"
    print(f"Logged in as EMPLOYEE user: '{emp_user}'")

    # Admin/Manager User
    admin_user = "admin_user"
    admin_pass = "admin123"
    admin_session = requests.Session()
    admin_login = admin_session.post(f"{BASE_URL}/api/v1/auth/login", json={"username": admin_user, "password": admin_pass})
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    print(f"Logged in as ADMIN/MANAGER user: '{admin_user}'")

    # Upload test document as EMPLOYEE
    test_file_path = "inspection_turbine_vibration.txt"
    if not os.path.exists(test_file_path):
        with open(test_file_path, "w", encoding="utf-8") as f:
            f.write("Turbine vibration 7.8 mm/s exceeding limit 4.5 mm/s. Bearing temperature 88.5C.")

    with open(test_file_path, "rb") as f:
        upload_resp = employee_session.post(
            f"{BASE_URL}/api/v1/documents/upload",
            files={"file": (test_file_path, f, "text/plain")},
        )
    assert upload_resp.status_code == 200, f"Document upload failed: {upload_resp.text}"
    uploaded_doc = upload_resp.json()
    doc_id = uploaded_doc["document_id"]
    doc_filename = uploaded_doc["filename"]
    print(f"\nUploaded Target Document as EMPLOYEE: #{doc_id} - {doc_filename}")

    # STEP 1: Run Inspection Workflow as EMPLOYEE
    print("\n--- STEP 1: Run Inspection Workflow as EMPLOYEE ---")
    wf_resp = employee_session.post(
        f"{BASE_URL}/api/v1/workflows/inspection-approval",
        json={"document_id": doc_id},
    )
    assert wf_resp.status_code == 200, f"Workflow execution failed: {wf_resp.text}"
    wf_data = wf_resp.json()
    wf_id = wf_data["workflow_id"]
    print(f"Workflow executed successfully!")
    print(f"Workflow ID: {wf_id}")
    print(f"AI Verdict Recommendation: {wf_data.get('ai_recommendation')}")
    print(f"Approval Status (Real DB/API): {wf_data.get('approval_status')}")

    assert wf_data.get("approval_status") == "PENDING_REVIEW", f"Expected PENDING_REVIEW, got {wf_data.get('approval_status')}"

    # STEP 2: Manager/Admin calls GET /api/v1/inspections/pending-review
    print("\n--- STEP 2: Log in as MANAGER/ADMIN and fetch /api/v1/inspections/pending-review ---")
    pending_resp = admin_session.get(f"{BASE_URL}/api/v1/inspections/pending-review")
    assert pending_resp.status_code == 200, f"GET pending-review failed: {pending_resp.text}"
    pending_data = pending_resp.json()
    pending_items = pending_data.get("inspections", [])
    print(f"Pending Reviews Total Count: {pending_data.get('total')}")

    found_item = next((item for item in pending_items if item["workflow_id"] == wf_id), None)
    assert found_item is not None, f"Workflow {wf_id} not found in pending reviews list!"
    print(f"Successfully verified workflow {wf_id} appears in real PENDING_REVIEW list!")
    print(f"Details: Submitted by '{found_item['submitted_by_username']}', AI Rec: '{found_item['ai_recommendation']}'")

    # STEP 3: EMPLOYEE attempts to directly review/PATCH endpoint -> Expect 403 Forbidden
    print("\n--- STEP 3: Test Security Role Enforcement (EMPLOYEE PATCH request) ---")
    emp_patch_resp = employee_session.patch(
        f"{BASE_URL}/api/v1/inspections/{wf_id}/review",
        json={"decision": "APPROVED", "comment": "Unauthorized approval attempt"},
    )
    print(f"Employee PATCH status code: {emp_patch_resp.status_code}")
    print(f"Employee PATCH response: {emp_patch_resp.text}")
    assert emp_patch_resp.status_code == 403, f"Expected HTTP 403 Forbidden, got {emp_patch_resp.status_code}"
    print("CONFIRMED: Employee attempt to review returned REAL HTTP 403 Forbidden!")

    # STEP 4: MANAGER/ADMIN approves via PATCH endpoint
    print("\n--- STEP 4: Approve inspection via PATCH /api/v1/inspections/{workflow_id}/review as MANAGER/ADMIN ---")
    review_comment = "Verified vibration and thermal logs against emergency threshold specs. Approved with shaft realignment recommendation."
    patch_resp = admin_session.patch(
        f"{BASE_URL}/api/v1/inspections/{wf_id}/review",
        json={"decision": "APPROVED", "comment": review_comment},
    )
    assert patch_resp.status_code == 200, f"PATCH review failed: {patch_resp.text}"
    reviewed_item = patch_resp.json()
    print("PATCH Review Succeeded!")
    print(f"Updated Approval Status: {reviewed_item['approval_status']}")
    print(f"Reviewed By (User): {reviewed_item['reviewed_by_username']}")
    print(f"Reviewer Comment: {reviewed_item['reviewer_comment']}")
    print(f"Reviewed At Timestamp: {reviewed_item['reviewed_at']}")
    print(f"Regenerated Deliverable URL: {reviewed_item['download_url']}")

    assert reviewed_item["approval_status"] == "APPROVED"
    assert reviewed_item["reviewed_by_username"] == admin_user
    assert reviewed_item["reviewer_comment"] == review_comment
    assert reviewed_item["reviewed_at"] is not None

    # STEP 5: Verify item is moved out of pending list into reviewed history
    print("\n--- STEP 5: Verify item moved to Reviewed History ---")
    history_resp = admin_session.get(f"{BASE_URL}/api/v1/inspections/reviewed-history")
    assert history_resp.status_code == 200
    history_items = history_resp.json().get("inspections", [])
    history_found = next((item for item in history_items if item["workflow_id"] == wf_id), None)
    assert history_found is not None, f"Workflow {wf_id} not found in reviewed history!"
    print(f"CONFIRMED: Workflow {wf_id} is in real reviewed history list with status '{history_found['approval_status']}'!")

    print("\n==================================================")
    print("SUCCESS: ALL END-TO-END MANAGER APPROVAL TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_verification()
