"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, Bot, CheckCircle2, ChevronRight, Clock3, FileSearch,
  FileText, ListChecks, Loader2, Pause, Play, Plus, Power, Sparkles, Workflow,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface Automation {
  id: number; name: string; description: string; instruction: string;
  trigger_type: string; enabled: boolean; run_count: number; last_run_at?: string | null;
}
interface DocumentItem { id: number; filename: string; file_size: number; }
interface AutomationRun {
  id: number; automation_id: number; automation_name: string; document_filename?: string;
  status: string; output?: string; error?: string; started_at: string;
}

const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://127.0.0.1:8000";
const templates = [
  {
    name: "Executive Brief",
    description: "Turn any long document into a decision-ready one-page brief.",
    instruction: "Create a concise executive brief with: purpose, key facts, important numbers, risks, decisions required, and recommended next actions.",
    icon: FileText,
    color: "text-blue-300 bg-blue-400/10 border-blue-400/20",
  },
  {
    name: "Risk Scanner",
    description: "Find contradictions, missing evidence, deadlines and operational risks.",
    instruction: "Audit this document for risks, contradictions, missing information, deadlines, compliance concerns, and unsupported claims. Rank findings by severity and give mitigation steps.",
    icon: FileSearch,
    color: "text-amber-300 bg-amber-400/10 border-amber-400/20",
  },
  {
    name: "Action Items",
    description: "Extract owners, deadlines, dependencies and a practical checklist.",
    instruction: "Extract every actionable task. Return a clear checklist with task, suggested owner, deadline if present, dependency, and priority. End with the next three actions.",
    icon: ListChecks,
    color: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
  },
] as const;

export default function AutomationsPage() {
  const { authFetch } = useAuth();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<number | "">("");
  const [creating, setCreating] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [activeRun, setActiveRun] = useState<AutomationRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [automationRes, documentRes, runRes] = await Promise.all([
      authFetch("/api/v1/automations"),
      authFetch("/api/v1/documents/list"),
      authFetch("/api/v1/automations/runs"),
    ]);
    if (!automationRes.ok) throw new Error("Could not load automations.");
    const [automationData, documentData, runData] = await Promise.all([
      automationRes.json(), documentRes.json(), runRes.json(),
    ]);
    setAutomations(automationData.automations || []);
    setDocuments(documentData.documents || []);
    setRuns(runData.runs || []);
    setSelectedDocument((current) => current || documentData.documents?.[0]?.id || "");
  };

  useEffect(() => {
    refresh().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const installedNames = useMemo(() => new Set(automations.map((item) => item.name)), [automations]);

  const installTemplate = async (template: typeof templates[number]) => {
    setCreating(template.name); setError(null);
    try {
      const res = await authFetch("/api/v1/automations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...template, trigger_type: "MANUAL", icon: undefined, color: undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Could not create automation.");
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Creation failed."); }
    finally { setCreating(null); }
  };

  const toggle = async (item: Automation) => {
    const res = await authFetch(`/api/v1/automations/${item.id}/toggle`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !item.enabled }),
    });
    if (res.ok) await refresh();
  };

  const run = async (item: Automation) => {
    if (!selectedDocument) { setError("Choose a document before running the automation."); return; }
    setRunningId(item.id); setError(null); setActiveRun(null);
    try {
      const res = await authFetch(`${backendOrigin}/api/v1/automations/${item.id}/run`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: Number(selectedDocument) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Automation failed.");
      setActiveRun({
        id: data.run_id, automation_id: item.id, automation_name: item.name,
        document_filename: data.document_filename, status: data.status,
        output: data.output, started_at: new Date().toISOString(),
      });
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Automation failed."); }
    finally { setRunningId(null); }
  };

  return (
    <div className="workspace-page max-w-[1180px] space-y-8 font-sans">
      <header className="flex items-end justify-between gap-6 border-b border-token pb-6">
        <div>
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[#8fb1fb]"><Workflow className="h-5 w-5" /> Local automation studio</div>
          <h1 className="mt-3 text-[32px] font-semibold tracking-[-.04em] text-primary">Put your private AI to work</h1>
          <p className="mt-3 max-w-3xl text-[17px] leading-7 text-secondary">Create reusable AI workers, run them on registry documents and keep every result on this machine.</p>
        </div>
        <div className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/[.07] px-4 py-2 text-[14px] font-medium text-emerald-300 md:flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Offline engine ready
        </div>
      </header>

      {error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/[.07] p-5 text-[15px] text-rose-200"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div><h2 className="text-[20px] font-semibold text-primary">Quick-start workers</h2><p className="mt-1 text-[15px] text-muted">Install a proven workflow with one click.</p></div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {templates.map((template) => {
            const Icon = template.icon; const installed = installedNames.has(template.name);
            return <div key={template.name} className="rounded-2xl border border-token bg-surface p-5 transition hover:-translate-y-1 hover:border-accent/30">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${template.color}`}><Icon className="h-5 w-5" /></div>
              <h3 className="mt-5 text-[18px] font-semibold text-primary">{template.name}</h3>
              <p className="mt-2 min-h-[48px] text-[15px] leading-6 text-muted">{template.description}</p>
              <button disabled={installed || creating === template.name} onClick={() => installTemplate(template)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-token bg-base px-4 py-3 text-[15px] font-semibold text-primary transition hover:border-accent/40 disabled:opacity-50">
                {creating === template.name ? <Loader2 className="h-4 w-4 animate-spin" /> : installed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Plus className="h-4 w-4 text-accent" />}
                {installed ? "Installed" : "Add automation"}
              </button>
            </div>;
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-token bg-surface p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><h2 className="text-[20px] font-semibold text-primary">Your automations</h2><p className="mt-1 text-[15px] text-muted">{automations.length} reusable local workers</p></div>
          <label className="min-w-[320px]"><span className="mb-2 block text-[14px] font-semibold text-secondary">Run against document</span>
            <select value={selectedDocument} onChange={(e) => setSelectedDocument(Number(e.target.value))} className="w-full rounded-xl border border-token bg-base px-4 py-3 text-[15px] text-primary outline-none focus:border-accent/50">
              {documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.filename}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-6 space-y-3">
          {loading ? <div className="py-10 text-center text-muted"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div> :
          automations.length === 0 ? <div className="rounded-xl border border-dashed border-token py-10 text-center"><Bot className="mx-auto h-7 w-7 text-muted" /><p className="mt-3 text-[16px] text-secondary">Add a quick-start worker above to begin.</p></div> :
          automations.map((item) => <div key={item.id} className="flex flex-col gap-4 rounded-xl border border-token bg-base p-4 lg:flex-row lg:items-center">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.enabled ? "bg-[#78a7ff]/10 text-[#8fb1fb]" : "bg-white/[.04] text-muted"}`}><Sparkles className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-[17px] font-semibold text-primary">{item.name}</h3><span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${item.enabled ? "bg-emerald-400/10 text-emerald-300" : "bg-white/[.05] text-muted"}`}>{item.enabled ? "Active" : "Paused"}</span></div><p className="mt-1 truncate text-[14px] text-muted">{item.description}</p></div>
            <div className="text-[13px] text-muted">{item.run_count} runs</div>
            <button onClick={() => toggle(item)} title={item.enabled ? "Pause automation" : "Enable automation"} className="rounded-xl border border-token p-3 text-muted transition hover:text-primary">{item.enabled ? <Pause className="h-4 w-4" /> : <Power className="h-4 w-4" />}</button>
            <button onClick={() => run(item)} disabled={!item.enabled || runningId !== null} className="flex min-w-[150px] items-center justify-center gap-2 rounded-xl accent-gradient px-5 py-3 text-[15px] font-bold text-[#07101f] disabled:opacity-40">
              {runningId === item.id ? <><Loader2 className="h-4 w-4 animate-spin" /> Working…</> : <><Play className="h-4 w-4 fill-current" /> Run now</>}
            </button>
          </div>)}
        </div>
      </section>

      {activeRun && <section className="animate-fadeIn rounded-2xl border border-[#78a7ff]/20 bg-surface p-6">
        <div className="flex items-center justify-between border-b border-token pb-4"><div><div className="text-[14px] font-semibold text-emerald-300">Automation completed</div><h2 className="mt-1 text-[22px] font-semibold text-primary">{activeRun.automation_name}</h2></div><span className="rounded-full bg-emerald-400/10 px-3 py-1.5 text-[13px] font-semibold text-emerald-300">{activeRun.status}</span></div>
        <div className="mt-5 rounded-xl border border-token bg-base p-5"><MarkdownRenderer content={activeRun.output || ""} /></div>
      </section>}

      {runs.length > 0 && <section><h2 className="mb-4 text-[20px] font-semibold text-primary">Recent activity</h2><div className="overflow-hidden rounded-2xl border border-token bg-surface">{runs.slice(0, 6).map((run) => <button key={run.id} onClick={() => setActiveRun(run)} className="flex w-full items-center gap-4 border-b border-token px-5 py-4 text-left last:border-0 hover:bg-surface-hover"><div className={`h-2.5 w-2.5 rounded-full ${run.status === "COMPLETED" ? "bg-emerald-400" : run.status === "FAILED" ? "bg-rose-400" : "bg-amber-300"}`} /><div className="min-w-0 flex-1"><div className="text-[15px] font-semibold text-primary">{run.automation_name}</div><div className="mt-1 truncate text-[14px] text-muted">{run.document_filename || "No document"} · {new Date(run.started_at).toLocaleString()}</div></div><ChevronRight className="h-4 w-4 text-muted" /></button>)}</div></section>}
    </div>
  );
}
