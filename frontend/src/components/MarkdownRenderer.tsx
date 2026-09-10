"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Copy, Check, Code, GitFork, FileText } from "lucide-react";
import mermaid from "mermaid";
import { useTheme } from "@/context/ThemeContext";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

// Code Block Component with Header Bar & Icon-only Copy Button
function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl border border-token overflow-hidden bg-surface shadow-md font-mono">
      {/* Two-tone Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-hover border-b border-token text-xs select-none">
        <span className="font-semibold text-accent uppercase text-[11px] tracking-wider flex items-center gap-1.5 font-mono">
          <Code className="w-3.5 h-3.5 text-accent" />
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-base hover:bg-surface text-muted hover:text-primary transition-all border border-token text-xs font-sans shadow-sm"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="text-[#10B981] font-medium text-[11px]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Syntax Highlighted Code */}
      <div className="p-4 text-xs overflow-x-auto leading-relaxed tracking-normal font-mono">
        <SyntaxHighlighter
          language={language || "text"}
          style={theme === "light" ? vs : vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: 0,
            background: "transparent",
            fontSize: "13px",
            lineHeight: "1.65",
            letterSpacing: "0.01em",
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

// Mermaid Diagram Component
function MermaidDiagram({ chartCode }: { chartCode: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
      themeVariables: {
        darkMode: true,
        background: "#080D1A",
        primaryColor: "#06B6D4",
        lineColor: "#38BDF8",
      },
    });

    if (containerRef.current && chartCode) {
      const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
      try {
        mermaid
          .render(uniqueId, chartCode)
          .then(({ svg }) => {
            if (containerRef.current) {
              containerRef.current.innerHTML = svg;
              setRenderError(false);
            }
          })
          .catch((err) => {
            console.error("Mermaid render error:", err);
            setRenderError(true);
          });
      } catch (e) {
        setRenderError(true);
      }
    }
  }, [chartCode]);

  if (renderError) {
    return (
      <div className="my-3 p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-400">
        (Could not render diagram preview)
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 p-5 bg-[#080D1A] border border-slate-800 rounded-xl flex justify-center overflow-x-auto shadow-xl"
    />
  );
}

// Helper to check if content contains diagram sequence or mermaid block
function extractDiagramInfo(text: string): { hasDiagram: boolean; chartCode: string | null } {
  if (!text) return { hasDiagram: false, chartCode: null };
  const mermaidMatch = /```mermaid\s*\n([\s\S]*?)\n```/i.exec(text);
  if (mermaidMatch && mermaidMatch[1] && mermaidMatch[1].trim()) {
    return { hasDiagram: true, chartCode: mermaidMatch[1].trim() };
  }

  const arrowRegex = /([A-Za-z0-9_\s]{2,25})\s*(?:->|-->|=>)\s*([A-Za-z0-9_\s]{2,25})/g;
  const matches = [...text.matchAll(arrowRegex)];

  if (matches.length >= 2) {
    let graphDef = "graph TD\n";
    matches.forEach((m, idx) => {
      const from = m[1].trim().replace(/\n/g, " ");
      const to = m[2].trim().replace(/\n/g, " ");
      if (from && to && from !== to) {
        const fromId = `N${idx}_A`;
        const toId = `N${idx}_B`;
        graphDef += `  ${fromId}["${from}"] --> ${toId}["${to}"]\n`;
      }
    });
    if (graphDef !== "graph TD\n") {
      return { hasDiagram: true, chartCode: graphDef };
    }
  }

  return { hasDiagram: false, chartCode: null };
}

export default function MarkdownRenderer({ content, isStreaming }: MarkdownRendererProps) {
  const [viewAsDiagram, setViewAsDiagram] = useState(false);
  const { hasDiagram, chartCode } = extractDiagramInfo(content);

  return (
    <div className="space-y-3">
      {/* Optional Diagram Toggle Button */}
      {hasDiagram && chartCode && (
        <div className="flex justify-end mb-1">
          <button
            onClick={() => setViewAsDiagram(!viewAsDiagram)}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all shadow-sm backdrop-blur-sm"
          >
            {viewAsDiagram ? (
              <>
                <FileText className="w-3.5 h-3.5" />
                <span>View Text</span>
              </>
            ) : (
              <>
                <GitFork className="w-3.5 h-3.5" />
                <span>View as Diagram</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Render Diagram or Document Markdown */}
      {viewAsDiagram && chartCode ? (
        <MermaidDiagram chartCode={chartCode} />
      ) : (
        <div className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed font-sans">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || "");
                const codeString = String(children).replace(/\n$/, "");

                if (!inline && (match || codeString.includes("\n") || className)) {
                  return (
                    <CodeBlock
                      language={match ? match[1] : "text"}
                      value={codeString}
                    />
                  );
                }
                return (
                  <code
                    className="bg-slate-800/80 text-cyan-300 px-1.5 py-0.5 rounded text-[12.5px] font-mono border border-slate-700/60"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              table({ children }: any) {
                return (
                  <div className="overflow-x-auto my-4 border border-slate-800 rounded-xl shadow-xl bg-[#090E1A]">
                    <table className="min-w-full divide-y divide-slate-800 text-xs text-slate-200">
                      {children}
                    </table>
                  </div>
                );
              },
              thead({ children }: any) {
                return (
                  <thead className="bg-[#121929] text-cyan-300 font-semibold uppercase tracking-wider">
                    {children}
                  </thead>
                );
              },
              tbody({ children }: any) {
                return <tbody className="divide-y divide-slate-800/80 bg-[#070B14]">{children}</tbody>;
              },
              tr({ children }: any) {
                return <tr className="hover:bg-slate-800/30 transition-colors">{children}</tr>;
              },
              th({ children }: any) {
                return (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-400 border-b border-slate-800">
                    {children}
                  </th>
                );
              },
              td({ children }: any) {
                return (
                  <td className="px-4 py-2.5 text-slate-300 font-mono text-xs whitespace-normal">
                    {children}
                  </td>
                );
              },
              blockquote({ children }: any) {
                return (
                  <blockquote className="border-l-4 border-cyan-500 pl-4 py-2 my-4 bg-cyan-950/20 text-slate-300 italic text-xs rounded-r-lg border-y border-r border-slate-800/40">
                    {children}
                  </blockquote>
                );
              },
              h1({ children }: any) {
                return (
                  <h1 className="text-lg font-bold text-slate-100 mt-5 mb-2.5 pb-1 border-b border-slate-800">
                    {children}
                  </h1>
                );
              },
              h2({ children }: any) {
                return <h2 className="text-base font-semibold text-slate-100 mt-4 mb-2">{children}</h2>;
              },
              h3({ children }: any) {
                return <h3 className="text-sm font-semibold text-slate-200 mt-3 mb-1.5">{children}</h3>;
              },
              ul({ children }: any) {
                return <ul className="list-disc list-inside my-3 space-y-1.5 text-slate-300 text-sm pl-1">{children}</ul>;
              },
              ol({ children }: any) {
                return <ol className="list-decimal list-inside my-3 space-y-1.5 text-slate-300 text-sm pl-1">{children}</ol>;
              },
              p({ children }: any) {
                return <p className="mb-3.5 last:mb-0 text-slate-200 leading-relaxed">{children}</p>;
              },
            }}
          >
            {content}
          </ReactMarkdown>

          {/* Real-time Blinking Cursor while streaming */}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse rounded-sm align-middle shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          )}
        </div>
      )}
    </div>
  );
}
