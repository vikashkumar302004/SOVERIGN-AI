"use client";

import { useState, useEffect } from "react";
import {
  FileOutput,
  Download,
  FileText,
  Presentation,
  FileSpreadsheet,
  Cpu,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Loader2,
} from "lucide-react";

interface DocItem {
  id: number;
  filename: string;
  file_size: number;
}

interface DeliverableResult {
  filename: string;
  download_url: string;
  output_format: string;
  model_used: string;
  generated_content: any;
  attached_document_filename?: string | null;
}

import { useAuth } from "@/context/AuthContext";

export default function DeliverableGeneratorPage() {
  const { authFetch } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<"docx" | "pptx" | "pdf">("docx");
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeliverableResult | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await authFetch("http://localhost:8000/api/v1/documents/list");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error("Failed to load documents list", e);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: any = {
        prompt: prompt.trim(),
        output_format: format,
      };

      if (selectedDocId) {
        payload.document_id = parseInt(selectedDocId, 10);
      }

      const res = await authFetch("http://localhost:8000/api/v1/deliverables/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });


      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate deliverable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-token">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <FileOutput className="w-5 h-5 text-accent" />
            Standalone Deliverable Generator
          </h1>
          <p className="text-xs text-muted font-mono mt-1">
            POST /api/v1/deliverables/generate &bull; Dynamic DOCX, PPTX & PDF Authoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-mono font-semibold">
            Multi-Format AI Engine
          </span>
        </div>
      </div>

      {/* Generation Form */}
      <div className="bg-surface border border-token rounded-xl p-6 space-y-5 shadow-md">
        <form onSubmit={handleGenerate} className="space-y-5">
          {/* Prompt Area */}
          <div>
            <label className="block text-xs font-mono uppercase text-muted mb-2 font-semibold">
              What do you want to create? <span className="text-[#EF4444]">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="e.g. Write a 1-page summary report on preventive maintenance best practices for centrifugal pumps, or Make a 5-slide presentation introducing our new safety protocol..."
              className="w-full bg-base border border-token focus:border-accent/60 text-primary placeholder-muted rounded-xl p-4 text-sm outline-none transition-all font-sans"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Document Context Selector (Optional) */}
            <div>
              <label className="block text-xs font-mono uppercase text-muted mb-2 font-semibold flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-accent" />
                Attach Existing Document Context (Optional)
              </label>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="w-full bg-base border border-token focus:border-accent/60 text-primary rounded-xl px-4 py-3 text-sm outline-none font-sans"
                disabled={loading}
              >
                <option value="">-- None (Standalone Prompt Only) --</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Doc #{doc.id}: {doc.filename} ({(doc.file_size / 1024).toFixed(1)} KB)
                  </option>
                ))}
              </select>
            </div>

            {/* Format Selector */}
            <div>
              <label className="block text-xs font-mono uppercase text-muted mb-2 font-semibold">
                Output Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat("docx")}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    format === "docx"
                      ? "bg-accent/15 border-accent/60 text-accent font-semibold"
                      : "bg-base border-token text-muted hover:text-primary"
                  }`}
                >
                  <FileText className="w-4 h-4 text-accent" />
                  <span>Report (.docx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat("pptx")}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    format === "pptx"
                      ? "bg-[#F59E0B]/15 border-[#F59E0B]/60 text-[#F59E0B] font-semibold"
                      : "bg-base border-token text-muted hover:text-primary"
                  }`}
                >
                  <Presentation className="w-4 h-4 text-[#F59E0B]" />
                  <span>Slides (.pptx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat("pdf")}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    format === "pdf"
                      ? "bg-[#EF4444]/15 border-[#EF4444]/60 text-[#EF4444] font-semibold"
                      : "bg-base border-token text-muted hover:text-primary"
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#EF4444]" />
                  <span>PDF Document</span>
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 accent-gradient accent-gradient-hover text-[#0A0E14] font-bold py-3.5 px-6 rounded-xl transition-all disabled:opacity-40 text-sm shadow-md cursor-pointer active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Synthesizing Content & Building {format.toUpperCase()} Deliverable...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Deliverable</span>
              </>
            )}
          </button>
        </form>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Generation Error: {error}</span>
          </div>
        )}
      </div>

      {/* Generated Result Display */}
      {result && (
        <div className="bg-surface border border-token rounded-xl p-6 space-y-6 animate-fadeIn shadow-md">
          {/* Header Status & Download */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-base border border-token">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                <h3 className="text-sm font-bold text-primary">
                  Deliverable Successfully Created: {result.filename}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-muted pl-7">
                <span className="flex items-center gap-1 text-accent font-semibold">
                  <Cpu className="w-3.5 h-3.5" />
                  Model: {result.model_used}
                </span>
                <span>Format: {result.output_format.toUpperCase()}</span>
                {result.attached_document_filename && (
                  <span className="text-[#F59E0B]">
                    Attached Context: {result.attached_document_filename}
                  </span>
                )}
              </div>
            </div>

            <a
              href={`http://localhost:8000${result.download_url}`}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#059669] text-[#0A0E14] font-bold px-5 py-2.5 rounded-lg text-xs transition-all shadow-md shrink-0 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download {result.output_format.toUpperCase()} File</span>
            </a>
          </div>

          {/* Structured Content Preview */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-wider text-muted">
              Model Generated Content Preview
            </h4>

            <div className="bg-base border border-token rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-accent">
                  {result.generated_content.title || "Untitled Deliverable"}
                </h2>
                {result.generated_content.subtitle && (
                  <p className="text-xs text-muted italic mt-0.5">
                    {result.generated_content.subtitle}
                  </p>
                )}
              </div>

              {/* Render Sections if present */}
              {result.generated_content.sections && (
                <div className="space-y-4 pt-2 border-t border-token">
                  {result.generated_content.sections.map((sec: any, idx: number) => (
                    <div key={idx} className="space-y-1.5">
                      <h3 className="text-sm font-semibold text-primary">
                        {sec.heading}
                      </h3>
                      {sec.content && (
                        <p className="text-xs text-primary leading-relaxed font-sans">
                          {sec.content}
                        </p>
                      )}
                      {sec.bullet_points && sec.bullet_points.length > 0 && (
                        <ul className="list-disc list-inside space-y-1 text-xs text-primary pl-2">
                          {sec.bullet_points.map((bp: string, bIdx: number) => (
                            <li key={bIdx}>{bp}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Render Slides if present */}
              {result.generated_content.slides && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-token">
                  {result.generated_content.slides.map((slide: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-surface border border-token space-y-2"
                    >
                      <div className="text-[10px] font-mono text-accent uppercase font-bold">
                        Slide {idx + 1}
                      </div>
                      <h4 className="text-xs font-bold text-primary">
                        {slide.title}
                      </h4>
                      {slide.bullet_points && (
                        <ul className="list-disc list-inside space-y-1 text-[11px] text-primary">
                          {slide.bullet_points.map((bp: string, bIdx: number) => (
                            <li key={bIdx}>{bp}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
