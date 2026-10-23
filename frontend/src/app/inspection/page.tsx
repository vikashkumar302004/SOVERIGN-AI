"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, ArrowRight, CheckCircle2, Clock3, Download, FileCheck2,
  FileText, Play, RefreshCw, SearchCheck, ShieldCheck, Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface DocItem { id: number; filename: string; file_size: number; }
interface WorkflowResponse {
  workflow_id: string;
  document_id: number;
  document_filename: string;
  model_analysis: string;
  ai_recommendation?: string;
  approval_status?: string;
  related_context: Array<{ document_id: number; filename: string; chunk_text: string; similarity_score: number }>;
  deliverable_file_path: string;
  download_url: string;
}

const steps = [
  [FileText, "Read document", "Extract every inspection detail"],
  [SearchCheck, "Run AI audit", "Check readings and anomalies"],
  [FileCheck2, "Create report", "Generate a review-ready file"],
] as const;

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
    setError(null);
    try {
      const res = await authFetch("/api/v1/documents/list");
      if (!res.ok) throw new Error("Could not load your document registry.");
      const data = await res.json();
      const docs = data.documents || [];
      setDocuments(docs);
      setSelectedDocId((current) => current || docs[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load documents.");
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleRunWorkflow = async () => {
    if (!selectedDocId || runningWorkflow) return;
    setRunningWorkflow(true);
    setError(null);
    setWorkflowResult(null);
    try {
      const res = await authFetch("/api/v1/workflows/inspection-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: Number(selectedDocId) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `Inspection failed (HTTP ${res.status}).`);
      setWorkflowResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inspection workflow failed.");
    } finally {
      setRunningWorkflow(false);
    }
  };

  const verdict = (workflowResult?.ai_recommendation || "NEEDS REVIEW").replace("_", " ");
  const verdictStyle = verdict === "PASS"
    ? "border-emerald-400/20 bg-emerald-400/[.08] text-emerald-300"
    : verdict === "FAIL"
      ? "border-rose-400/20 bg-rose-400/[.08] text-rose-300"
      : "border-amber-400/20 bg-amber-400/[.08] text-amber-200";

  return (
    <div className="workspace-page max-w-[1120px] space-y-7">
      <header className="flex items-end justify-between gap-6 border-b border-token pb-6">
        <div>
          <div className="workspace-eyebrow flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Inspection workflow</div>
          <h1 className="workspace-title mt-3">From document to decision</h1>
          <p className="mt-3 max-w-2xl text-[16px] leading-7 text-secondary">
            Choose an inspection file. Sovereign AI reads it, checks the findings and prepares a report for manager approval.
          </p>
        </div>
        <Link href="/reviews" className="hidden items-center gap-2 rounded-xl border border-token bg-surface px-4 py-3 text-[15px] font-medium text-primary transition hover:-translate-y-0.5 hover:border-accent/40 lg:flex">
          Open approvals <ArrowRight className="h-4 w-4 text-accent" />
        </Link>
      </header>

      <section className="grid grid-cols-3 overflow-hidden rounded-2xl border border-token bg-surface">
        {steps.map(([Icon, title, copy], index) => (
          <div key={title} className={`relative p-5 ${index !== 2 ? "border-r border-token" : ""}`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${runningWorkflow || workflowResult ? "border-[#78a7ff]/25 bg-[#78a7ff]/10 text-[#91b3ff]" : "border-token bg-base text-muted"}`}>
                {workflowResult ? <CheckCircle2 className="h-5 w-5" /> : <Icon className={`h-5 w-5 ${runningWorkflow ? "animate-pulse" : ""}`} />}
              </div>
              <div>
                <div className="text-[15px] font-semibold text-primary">{index + 1}. {title}</div>
                <div className="mt-1 text-[14px] text-muted">{copy}</div>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-token bg-surface p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-end gap-4">
          <label className="min-w-0 flex-1">
            <span className="mb-2 block text-[15px] font-semibold text-primary">Inspection document</span>
            <select value={selectedDocId} onChange={(e) => setSelectedDocId(Number(e.target.value))} disabled={loadingDocs || runningWorkflow}
              className="w-full rounded-xl border border-token bg-base px-4 py-3.5 text-[15px] text-primary outline-none transition focus:border-accent/60">
              {documents.length === 0 && <option value="">{loadingDocs ? "Loading documents…" : "No documents available"}</option>}
              {documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.filename} · {(doc.file_size / 1024).toFixed(1)} KB</option>)}
            </select>
          </label>
          <button onClick={handleRunWorkflow} disabled={!selectedDocId || runningWorkflow}
            className="flex min-h-[50px] min-w-[230px] items-center justify-center gap-2 rounded-xl accent-gradient px-6 text-[15px] font-bold text-[#07101f] shadow-[0_12px_30px_rgba(55,94,174,.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0">
            {runningWorkflow ? <><RefreshCw className="h-5 w-5 animate-spin" /> Running inspection…</> : <><Play className="h-5 w-5 fill-current" /> Start inspection</>}
          </button>
        </div>
        {documents.length === 0 && !loadingDocs && (
          <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[.06] p-4 text-[15px] text-amber-100">
            Upload a document in the <Link href="/documents" className="font-semibold text-amber-200 underline">Document Registry</Link> before starting an inspection.
          </div>
        )}
      </section>

      {error && (
        <div role="alert" className="animate-fadeIn flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/[.07] p-5 text-[15px] leading-6 text-rose-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>Inspection could not finish.</strong><div className="mt-1 text-rose-200/80">{error}</div></div>
        </div>
      )}

      {runningWorkflow && (
        <div className="animate-fadeIn rounded-2xl border border-[#78a7ff]/20 bg-[#78a7ff]/[.045] p-8">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#78a7ff]/25 bg-[#78a7ff]/10 text-[#9dbaff]">
              <Sparkles className="h-7 w-7 animate-pulse" /><span className="absolute inset-0 animate-ping rounded-2xl border border-[#78a7ff]/20" />
            </div>
            <h2 className="mt-5 text-[20px] font-semibold text-primary">Sovereign AI is reviewing the file</h2>
            <p className="mt-2 text-[15px] leading-6 text-secondary">Reading measurements, checking anomalies and preparing the approval report. Local models can take a moment.</p>
          </div>
        </div>
      )}

      {workflowResult && (
        <section className="animate-fadeIn overflow-hidden rounded-2xl border border-token bg-surface shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-5 border-b border-token p-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[14px] font-medium text-accent"><CheckCircle2 className="h-4 w-4" /> Inspection complete</div>
              <h2 className="mt-2 truncate text-[22px] font-semibold tracking-[-.02em] text-primary">{workflowResult.document_filename}</h2>
              <div className="mt-1 text-[14px] text-muted">Workflow {workflowResult.workflow_id}</div>
            </div>
            <div className={`rounded-full border px-4 py-2 text-[14px] font-bold ${verdictStyle}`}>AI verdict · {verdict}</div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_310px]">
            <div>
              <h3 className="mb-4 text-[17px] font-semibold text-primary">Inspection analysis</h3>
              <div className="rounded-xl border border-token bg-base p-5 text-[15px] leading-7 text-secondary">
                <MarkdownRenderer content={workflowResult.model_analysis} />
              </div>
            </div>
            <aside className="space-y-4">
              <div className="rounded-xl border border-token bg-base p-5">
                <div className="flex items-center gap-2 text-[15px] font-semibold text-primary"><Clock3 className="h-4 w-4 text-amber-300" /> Awaiting manager</div>
                <p className="mt-2 text-[14px] leading-6 text-muted">The audit is saved and ready for a human decision in Approvals.</p>
                <Link href="/reviews" className="mt-4 flex items-center justify-between rounded-xl border border-token bg-surface px-4 py-3 text-[15px] font-medium text-primary transition hover:border-accent/40">
                  Review decision <ArrowRight className="h-4 w-4 text-accent" />
                </Link>
              </div>
              <a href={workflowResult.download_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl accent-gradient px-5 py-3.5 text-[15px] font-bold text-[#07101f] transition hover:-translate-y-0.5">
                <Download className="h-5 w-5" /> Download report
              </a>
              <div className="rounded-xl border border-token bg-base p-5">
                <div className="text-[15px] font-semibold text-primary">Related references</div>
                <div className="mt-3 space-y-3">
                  {workflowResult.related_context.length === 0 ? <p className="text-[14px] leading-6 text-muted">No separate reference document matched this inspection.</p> :
                    workflowResult.related_context.map((item, index) => (
                      <div key={`${item.document_id}-${index}`} className="border-t border-token pt-3 first:border-0 first:pt-0">
                        <div className="truncate text-[14px] font-medium text-primary">{item.filename}</div>
                        <div className="mt-1 text-[13px] text-muted">{Math.round(item.similarity_score * 100)}% relevance</div>
                      </div>
                    ))}
                </div>
              </div>
            </aside>
          </div>
        </section>
      )}
    </div>
  );
}
