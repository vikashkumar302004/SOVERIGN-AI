"use client";

import { useEffect, useState } from "react";
import { ClipboardList, RefreshCw, Clock, CheckCircle2, AlertCircle, FileText, Activity, Search, User as UserIcon } from "lucide-react";

interface AuditLogItem {
  id: number;
  timestamp: string;
  endpoint: string;
  method: string;
  status_code: number;
  duration_ms: number;
  summary: string;
  username?: string;
  role?: string;
}

interface AuditLogResponse {
  logs: AuditLogItem[];
  total: number;
}

import { useAuth } from "@/context/AuthContext";

export default function AuditPage() {
  const { authFetch } = useAuth();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = async () => {
    try {
      const res = await authFetch("http://localhost:8000/api/v1/audit/logs");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: AuditLogResponse = await res.json();
      setLogs(data.logs || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch audit logs from backend");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchAuditLogs();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAuditLogs();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30";
      case "POST":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "DELETE":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
      default:
        return "bg-slate-500/10 text-muted border-slate-500/30";
    }
  };

  const getStatusBadgeClass = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    }
    if (statusCode >= 400 && statusCode < 500) {
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    }
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
  };

  const getRoleBadgeClass = (role?: string) => {
    switch ((role || "").toUpperCase()) {
      case "ADMIN":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
      case "MANAGER":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
      case "ANALYST":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "EMPLOYEE":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      default:
        return "bg-slate-500/10 text-muted border-slate-500/30";
    }
  };

  const formatLocalTime = (ts: string) => {
    if (!ts) return "";
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    }
    return ts.split("T")[1]?.split(".")[0] || ts;
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const u = (log.username || "anonymous").toLowerCase();
    const r = (log.role || "").toLowerCase();
    const s = (log.summary || "").toLowerCase();
    const e = (log.endpoint || "").toLowerCase();
    return u.includes(q) || r.includes(q) || s.includes(q) || e.includes(q);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-token flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-accent" />
            System Real-Time Audit Log
          </h1>
          <p className="text-xs text-muted font-mono mt-1">
            GET /api/v1/audit/logs &bull; SQLite <code className="text-accent">audit_logs</code> table & FastAPI automatic middleware
          </p>
        </div>
        <button
          onClick={fetchAuditLogs}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface border border-token hover:border-cyan-500/40 text-xs font-mono text-primary transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-accent" : ""}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-token flex items-center justify-between">
          <div>
            <span className="text-[10px] text-muted font-mono uppercase tracking-widest block">
              Total Recorded Requests
            </span>
            <span className="text-2xl font-bold font-mono text-accent mt-1 block">
              {logs.length}
            </span>
          </div>
          <Activity className="w-8 h-8 text-accent/40" />
        </div>

        <div className="p-4 rounded-xl bg-surface border border-token flex items-center justify-between">
          <div>
            <span className="text-[10px] text-muted font-mono uppercase tracking-widest block">
              Successful HTTP 200s
            </span>
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
              {logs.filter((l) => l.status_code >= 200 && l.status_code < 300).length}
            </span>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
        </div>

        <div className="p-4 rounded-xl bg-surface border border-token flex items-center justify-between">
          <div>
            <span className="text-[10px] text-muted font-mono uppercase tracking-widest block">
              Database Persistence
            </span>
            <span className="text-sm font-semibold font-mono text-primary mt-1 block">
              SQLite <code className="text-amber-500 dark:text-amber-400 text-xs">app.db</code>
            </span>
          </div>
          <Clock className="w-8 h-8 text-amber-500/40" />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/10 dark:bg-rose-950/20 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-mono flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-sm font-bold font-mono text-primary uppercase tracking-wider">
            Recent Audit Trail Entries ({filteredLogs.length})
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by user, role, action..."
              className="w-full bg-surface border border-token rounded-lg pl-9 pr-3 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-cyan-500/50 transition-all font-mono"
            />
          </div>
        </div>

        {filteredLogs.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-token bg-surface">
            <table className="w-full text-left text-xs font-mono text-primary">
              <thead className="bg-base text-muted border-b border-token uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Endpoint</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Real Action Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-token">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3 text-muted font-bold">#{log.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="font-semibold text-primary">{log.username || "anonymous"}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getRoleBadgeClass(log.role)}`}>
                          {log.role || "ANONYMOUS"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted text-[11px]">
                      {formatLocalTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getMethodBadgeClass(log.method)}`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-cyan-600 dark:text-cyan-300 font-semibold">{log.endpoint}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClass(log.status_code)}`}>
                        {log.status_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-amber-600 dark:text-amber-400 font-bold">{log.duration_ms} ms</td>
                    <td className="px-4 py-3 text-primary font-sans text-xs">{log.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 rounded-xl border border-token bg-surface text-center space-y-2">
            <FileText className="w-8 h-8 text-muted mx-auto" />
            <p className="text-sm font-semibold text-primary">No Matching Audit Logs</p>
            <p className="text-xs text-muted font-sans">
              Try adjusting your filter search or perform actions on the platform to generate audit logs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
