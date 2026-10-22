"use client";

import { useState, useEffect } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Eye, RefreshCw, Cpu, Layers } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface DocItem {
  id: number;
  filename: string;
  file_size: number;
  extracted_text_preview: string;
  total_text_length: number;
  used_ocr: boolean;
  ocr_confidence: number | null;
  created_at: string;
  owner_id?: number | null;
  owner_username?: string | null;
}

export default function DocumentsPage() {
  const { authFetch } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await authFetch("/api/v1/documents/list");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err: any) {
      console.error("Failed to load documents list", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || uploading) return;

    setUploading(true);
    setError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await authFetch("/api/v1/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Upload failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      setUploadResult(data);
      setFile(null);
      fetchDocuments();
    } catch (err: any) {
      setError(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="workspace-page space-y-8 select-none">
      {/* Page Header */}
      <div className="pb-5 border-b border-token flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-accent" />
            Document Registry & Extraction Pipeline
          </h1>
          <p className="text-xs text-muted font-mono mt-1">
            Local Parsing &bull; PyMuPDF, python-docx, openpyxl, & Tesseract OCR Pipeline
          </p>
        </div>
        <button
          onClick={fetchDocuments}
          className="self-start px-3.5 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-token text-[11px] font-mono text-primary flex items-center gap-2 transition-all shadow-sm sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingDocs ? "animate-spin" : ""}`} />
          <span>Refresh Registry</span>
        </button>
      </div>

      {/* Surface Card 1: File Upload Box */}
      <div className="bg-surface border border-token rounded-2xl p-6 shadow-md space-y-4">
        <h2 className="text-sm font-semibold text-primary uppercase tracking-wider font-mono">
          Upload & Process Document
        </h2>

        <form onSubmit={handleUpload} className="space-y-4">
          <label
            htmlFor="file-upload"
            className="border-2 border-dashed border-token hover:border-accent/60 rounded-2xl p-8 text-center bg-base transition-all flex flex-col items-center justify-center cursor-pointer w-full block select-none"
          >
            <UploadCloud className="w-10 h-10 text-accent mb-2 mx-auto pointer-events-none" />
            <input
              type="file"
              id="file-upload"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <span className="text-sm font-medium text-primary hover:underline pointer-events-none block">
              {file ? file.name : "Click to select a file from device"}
            </span>
            <p className="text-xs text-muted font-mono mt-1 pointer-events-none">
              Supports PDF, DOCX, XLSX, PNG, JPG, TXT (Auto-detects image for OCR)
            </p>
          </label>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!file || uploading}
              className="px-5 py-2.5 rounded-lg accent-gradient accent-gradient-hover text-[#0A0E14] font-bold text-xs transition-all shadow-md active:scale-95 disabled:opacity-40"
            >
              {uploading ? "Extracting & Embedding..." : "Process Document"}
            </button>
          </div>
        </form>

        {/* Upload Success Card */}
        {uploadResult && (
          <div className="p-4 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 text-xs font-mono space-y-2">
            <div className="flex items-center space-x-2 text-[#10B981] font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Document Registered Successfully!</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-primary pt-1">
              <div>ID: <strong className="text-accent">#{uploadResult.document_id}</strong></div>
              <div>File: <strong>{uploadResult.filename}</strong></div>
              <div>Chunks: <strong>{uploadResult.chunks_created}</strong></div>
              <div>OCR Used: <strong>{uploadResult.used_ocr ? "YES" : "NO"}</strong></div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs font-mono flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Surface Card 2: Registered Documents List */}
      <div className="bg-surface border border-token rounded-2xl p-6 shadow-md space-y-4">
        <h2 className="text-sm font-semibold text-primary uppercase tracking-wider font-mono">
          Registered Database Documents ({documents.length})
        </h2>

        {loadingDocs ? (
          <div className="p-6 text-center text-xs font-mono text-muted">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-muted">No documents registered in database yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-token">
            <table className="min-w-full divide-y divide-token text-xs font-mono">
              <thead className="bg-base text-accent font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">FILENAME</th>
                  <th className="px-4 py-3 text-left">SIZE</th>
                  <th className="px-4 py-3 text-left">OCR USED</th>
                  <th className="px-4 py-3 text-left">OWNER</th>
                  <th className="px-4 py-3 text-left">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-token bg-surface text-primary">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3 font-semibold text-accent">#{doc.id}</td>
                    <td className="px-4 py-3 font-medium truncate max-w-xs">{doc.filename}</td>
                    <td className="px-4 py-3 text-muted">{(doc.file_size / 1024).toFixed(1)} KB</td>
                    <td className="px-4 py-3">
                      {doc.used_ocr ? (
                        <span className="px-2 py-0.5 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] font-semibold">
                          OCR ({doc.ocr_confidence ? `${Math.round(doc.ocr_confidence)}%` : "Active"})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] font-semibold">
                          Direct Text
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{doc.owner_username || "System"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedPreview(doc.extracted_text_preview)}
                        className="px-2.5 py-1 rounded bg-base hover:bg-surface border border-token text-accent text-[11px] flex items-center gap-1 transition-all shadow-sm"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Preview</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-surface border border-token rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-token pb-3">
              <h3 className="text-sm font-semibold text-primary font-mono">Extracted Text Content</h3>
              <button
                onClick={() => setSelectedPreview(null)}
                className="px-2.5 py-1 text-xs rounded-lg bg-base border border-token text-muted hover:text-primary transition-colors"
              >
                Close
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-base border border-token text-xs font-mono text-primary max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {selectedPreview}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
