"use client";

import { useState } from "react";
import { Search, Database, Layers, AlertCircle, RefreshCw, BarChart2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface SearchResult {
  document_id: number;
  filename: string;
  chunk_id: number;
  chunk_index: number;
  chunk_text: string;
  similarity_score: number;
}

export default function KnowledgePage() {
  const { authFetch } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalChunks, setTotalChunks] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setSearchedQuery(query.trim());

    try {
      const res = await authFetch("http://localhost:8000/api/v1/knowledge/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), top_k: 5 }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Search failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      setResults(data.results || []);
      setTotalChunks(data.total_chunks_evaluated || 0);
    } catch (err: any) {
      setError(err.message || "Failed to execute vector search");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 select-none">
      {/* Header */}
      <div className="pb-4 border-b border-token flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary flex items-center gap-2.5">
            <Database className="w-5 h-5 text-accent" />
            Vector Knowledge Search (RAG Engine)
          </h1>
          <p className="text-xs text-muted font-mono mt-1">
            SentenceTransformers (all-MiniLM-L6-v2) &bull; Cosine Similarity Search
          </p>
        </div>
      </div>

      {/* Search Bar Surface Card */}
      <form onSubmit={handleSearch} className="space-y-2">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 absolute left-4 text-muted pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vector database (e.g. vibration threshold limit, pressure valve specification)..."
            className="w-full bg-surface border border-token focus:border-accent/60 focus:ring-2 focus:ring-accent/30 text-primary placeholder-muted rounded-2xl pl-12 pr-36 py-4 text-sm outline-none transition-all shadow-md font-sans"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-3 px-4 py-2 accent-gradient accent-gradient-hover text-[#0A0E14] font-bold text-xs rounded-xl disabled:opacity-40 transition-all flex items-center space-x-2 shadow-md active:scale-95 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search Index</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs font-mono flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Header Stats */}
      {searchedQuery && !loading && (
        <div className="flex items-center justify-between text-xs font-mono text-muted bg-surface p-4 rounded-xl border border-token shadow-sm">
          <div>
            Search Query: <span className="text-accent font-semibold">"{searchedQuery}"</span>
          </div>
          <div>
            Evaluated <span className="text-primary">{totalChunks}</span> chunks &bull; Returned <span className="text-[#10B981] font-bold">{results.length}</span> top matches
          </div>
        </div>
      )}

      {/* Vector Results Cards */}
      <div className="space-y-4">
        {results.map((res, idx) => {
          const scorePercent = (res.similarity_score * 100).toFixed(1);
          return (
            <div
              key={idx}
              className="bg-surface border border-token rounded-2xl p-6 space-y-3 shadow-md hover:border-accent/40 transition-all"
            >
              <div className="flex items-center justify-between border-b border-token pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-accent/10 border border-accent/30 text-accent flex items-center justify-center font-mono text-xs font-bold">
                    #{idx + 1}
                  </span>
                  <span className="font-semibold text-primary text-sm">{res.filename}</span>
                  <span className="text-xs text-muted font-mono">(Chunk #{res.chunk_index})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BarChart2 className="w-4 h-4 text-[#10B981]" />
                  <span className="px-2.5 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs font-mono font-bold">
                    {scorePercent}% Similarity
                  </span>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-base border border-token text-xs font-mono text-primary whitespace-pre-wrap leading-relaxed">
                {res.chunk_text}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
