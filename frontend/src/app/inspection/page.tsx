"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Play, Download, AlertCircle, FileText, CheckCircle2, XCircle, AlertTriangle, Layers, Clock, Cpu } from "lucide-react";

interface DocItem {
  id: number;
  filename: string;
  file_size: number;
}

interface WorkflowResponse {
  workflow_id: string;
  document_id: number;
  document_filename: string;
  model_analysis: string;
  ai_recommendation?: string;
  approval_status?: string;
  reviewed_by?: string | null;
  reviewer_comment?: string | null;
  reviewed_at?: string | null;
  related_context: Array<{
    document_id: number;
    filename: string;
    chunk_text: string;
    similarity_score: number;
  }>;
  deliverable_file_path: string;
  download_url: string;
}

import { useAuth } from "@/context/AuthContext";

export default function InspectionPage() {
  const { authFetch } = useAuth();
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | "">("");
  const [loadingDocs, setLoadingDocs] = useState(true);

  const [runningWorkflow, setRunningWorkflow] = useState(false);
  const [workflowResult, setWorkflowResult] = useState<WorkflowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await authFetch("http://localhost:8000/api/v1/documents/list");
      if (res.ok) {
        const data = await res.json();
        const docs = data.documents || [];
        setDocuments(docs);
        if (docs.length > 0) {
          setSelectedDocId(docs[0].id);
        }
      }
    } catch (err: any) {
      console.error("Failed to load documents for workflow", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleRunWorkflow = async () => {
    if (!selectedDocId || runningWorkflow) return;

    setRunningWorkflow(true);
    setError(null);
    setWorkflowResult(null);

    try {
      const res = await authFetch("http://localhost:8000/api/v1/workflows/inspection-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: Number(selectedDocId) }),
      });


      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Workflow execution failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      setWorkflowResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to execute inspection approval workflow");
    } finally {
      setRunningWorkflow(false);
    }
  };

  // Extract Recommendation Badge Status from real model output
  const getRecommendationBadge = (analysisText: string) => {
    const textUpper = analysisText.toUpperCase();
    if (textUpper.includes("FAIL") || textUpper.includes("ANOMALY")) {
      return { label: "FAIL", color: "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40", icon: XCircle };
    }
    if (textUpper.includes("NEEDS REVIEW") || textUpper.includes("NEEDS-REVIEW") || textUpper.includes("BORDERLINE")) {
      return { label: "NEEDS REVIEW", color: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40", icon: AlertTriangle };
    }
    return { label: "PASS", color: "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40", icon: CheckCircle2 };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 select-none">
      {/* Header */}
      <div className="pb-4 border-b border-token flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            Inspection & Approval Workflow
          </h1>
          <p className="text-xs text-muted font-mono mt-1">
            POST /api/v1/workflows/inspection-approval &bull; Real Document Extraction, Ollama Audit, RAG SOP Match & .docx Generation
          </p>
        </div>
      </div>

      {/* Selector & Action Bar */}
      <div className="bg-surface border border-token rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex-1 w-full space-y-1">
          <label className="text-xs font-mono text-muted block">Select Registered Target Document:</label>
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(Number(e.target.value))}
            disabled={loadingDocs || runningWorkflow}
            className="w-full bg-base border border-token focus:border-accent/60 text-primary text-xs font-mono rounded-lg p-3 outline-none"
          >
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                #{doc.id} - {doc.filename} ({(doc.file_size / 1024).toFixed(1)} KB)
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleRunWorkflow}
          disabled={!selectedDocId || runningWorkflow}
          className="w-full sm:w-auto px-6 py-3 accent-gradient accent-gradient-hover text-[#0A0E14] font-bold text-xs rounded-lg disabled:opacity-40 transition-all flex items-center justify-center space-x-2 shrink-0 shadow-md active:scale-95 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-[#0A0E14]" />
          <span>{runningWorkflow ? "Auditing Document..." : "Run Inspection Workflow"}</span>
        </button>
      </div>

      {/* Error Box */}
      {error && (
        <div className="p-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] text-xs font-mono flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {runningWorkflow && (
        <div className="p-8 rounded-xl bg-surface border border-token space-y-4 text-center shadow-md">
          <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent mx-auto animate-pulse">
            <Cpu className="w-5 h-5 animate-spin" />
          </div>
          <div className="text-xs font-mono text-primary">
            Running Sovereign AI Reasoning Audit (llama3.2:3b) & Knowledge Vector Matching...
          </div>
        </div>
      )}

      {/* Structured Result Card */}
      {workflowResult && (
        <div className="bg-surface border border-token rounded-xl overflow-hidden space-y-6 p-6 shadow-md">
          {/* Card Header & Recommendation Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-token">
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-base font-bold text-primary">
                  AI Recommendation: {workflowResult.document_filename}
                </h2>
                <span className="text-xs font-mono text-accent">
                  ({workflowResult.workflow_id})
                </span>
              </div>
              <p className="text-xs font-mono text-muted mt-1">
                Document ID: #{workflowResult.document_id} &bull; Engine: Sovereign AI Auditor (llama3.2:3b)
              </p>
            </div>

            {/* Badges: AI Verdict & Manager Sign-off Status */}
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const badge = getRecommendationBadge(workflowResult.ai_recommendation || workflowResult.model_analysis);
                const BadgeIcon = badge.icon;
                return (
                  <div className={`px-3 py-1.5 rounded-xl border flex items-center space-x-2 font-mono text-xs font-bold ${badge.color}`}>
                    <BadgeIcon className="w-3.5 h-3.5" />
                    <span>AI RECOMMENDATION: {badge.label}</span>
                  </div>
                );
              })()}

              <div className="px-3 py-1.5 rounded-xl border bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40 flex items-center space-x-2 font-mono text-xs font-bold">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                <span>Pending Manager Review</span>
              </div>
            </div>
          </div>

          {/* Section 1: Executive Summary / Model Analysis */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono text-accent font-bold uppercase tracking-wider">
              1. Executive Summary & Reasoning Analysis
            </h3>
            <div className="p-4 rounded-lg bg-base border border-token text-primary text-xs font-sans leading-relaxed whitespace-pre-wrap">
              {workflowResult.model_analysis}
            </div>
          </div>

          {/* Section 2: Related SOP Context (RAG Results) */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono text-accent font-bold uppercase tracking-wider">
              2. Related Standard Operating Procedure (SOP) Context
            </h3>
            {workflowResult.related_context.length === 0 ? (
              <div className="p-3 rounded-lg bg-base border border-token text-muted text-xs font-mono italic">
                No relevant SOP/reference context found in knowledge base (similarity &gt; 0.20).
              </div>
            ) : (
              <div className="space-y-3">
                {workflowResult.related_context.map((sop, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-base border border-token text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between text-muted">
                      <span className="text-primary font-medium">Reference #{idx + 1}: {sop.filename}</span>
                      <span className="text-accent font-bold">Similarity: {sop.similarity_score.toFixed(4)}</span>
                    </div>
                    <p className="text-primary italic text-[11px]">&quot;{sop.chunk_text}&quot;</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Download Button */}
          <div className="pt-4 border-t border-token flex items-center justify-between">
            <div className="text-xs font-mono text-muted">
              Generated Deliverable File: <span className="text-primary">{workflowResult.deliverable_file_path.split('\\').pop()?.split('/').pop()}</span>
            </div>
            <a
              href={`http://localhost:8000${workflowResult.download_url}`}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 accent-gradient accent-gradient-hover text-[#0A0E14] font-bold text-xs rounded-xl transition-all flex items-center space-x-2 shadow-md cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download Approval Note (.docx)</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
