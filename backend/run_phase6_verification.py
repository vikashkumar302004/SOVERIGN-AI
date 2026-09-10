import json
import os
import requests
import docx

BASE_URL = "http://127.0.0.1:8000"

def read_docx_content(file_path):
    doc = docx.Document(file_path)
    full_text = []
    for para in doc.paragraphs:
        if para.text.strip():
            full_text.append(para.text.strip())
    return "\n".join(full_text)

def main():
    print("=== STEP 1: UPLOADING DOCUMENT 1 (Turbine Vibration) ===")
    file1_path = "inspection_turbine_vibration.txt"
    with open(file1_path, "rb") as f:
        resp1 = requests.post(f"{BASE_URL}/api/v1/documents/upload", files={"file": (file1_path, f, "text/plain")})
    print(f"Upload 1 Status: {resp1.status_code}")
    data1 = resp1.json()
    doc_id_1 = data1["document_id"]
    print(f"Document 1 ID: {doc_id_1}, Filename: {data1['filename']}")

    print("\n=== STEP 2: UPLOADING DOCUMENT 2 (Transformer Thermal) ===")
    file2_path = "inspection_transformer_thermal.txt"
    with open(file2_path, "rb") as f:
        resp2 = requests.post(f"{BASE_URL}/api/v1/documents/upload", files={"file": (file2_path, f, "text/plain")})
    print(f"Upload 2 Status: {resp2.status_code}")
    data2 = resp2.json()
    doc_id_2 = data2["document_id"]
    print(f"Document 2 ID: {doc_id_2}, Filename: {data2['filename']}")

    print("\n=== STEP 3: RUNNING WORKFLOW ON DOCUMENT 1 (ID: {}) ===".format(doc_id_1))
    wf_resp1 = requests.post(f"{BASE_URL}/api/v1/workflows/inspection-approval", json={"document_id": doc_id_1})
    print(f"Workflow 1 Status: {wf_resp1.status_code}")
    wf1_data = wf_resp1.json()

    print("\n=== STEP 4: RUNNING WORKFLOW ON DOCUMENT 2 (ID: {}) ===".format(doc_id_2))
    wf_resp2 = requests.post(f"{BASE_URL}/api/v1/workflows/inspection-approval", json={"document_id": doc_id_2})
    print(f"Workflow 2 Status: {wf_resp2.status_code}")
    wf2_data = wf_resp2.json()

    print("\n=== STEP 5: DOWNLOADING & PARSING DOCX DELIVERABLES ===")
    
    # Download 1
    dl1_url = f"{BASE_URL}{wf1_data['download_url']}"
    dl1_resp = requests.get(dl1_url)
    out_docx1 = "downloaded_report_1.docx"
    with open(out_docx1, "wb") as f:
        f.write(dl1_resp.content)
    content1 = read_docx_content(out_docx1)

    # Download 2
    dl2_url = f"{BASE_URL}{wf2_data['download_url']}"
    dl2_resp = requests.get(dl2_url)
    out_docx2 = "downloaded_report_2.docx"
    with open(out_docx2, "wb") as f:
        f.write(dl2_resp.content)
    content2 = read_docx_content(out_docx2)

    summary = {
        "document_1": {
            "document_id": doc_id_1,
            "filename": data1["filename"],
            "workflow_id": wf1_data["workflow_id"],
            "deliverable_file_path": wf1_data["deliverable_file_path"],
            "download_url": wf1_data["download_url"],
            "model_analysis": wf1_data["model_analysis"],
            "related_context": wf1_data["related_context"],
            "docx_text_content": content1,
        },
        "document_2": {
            "document_id": doc_id_2,
            "filename": data2["filename"],
            "workflow_id": wf2_data["workflow_id"],
            "deliverable_file_path": wf2_data["deliverable_file_path"],
            "download_url": wf2_data["download_url"],
            "model_analysis": wf2_data["model_analysis"],
            "related_context": wf2_data["related_context"],
            "docx_text_content": content2,
        }
    }

    with open("phase6_results.json", "w") as f:
        json.dump(summary, f, indent=2)

    print("\nSUCCESS! Saved full results to phase6_results.json")

if __name__ == "__main__":
    main()
