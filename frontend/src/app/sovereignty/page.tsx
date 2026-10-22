"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, WifiOff, RefreshCw, AlertTriangle, Cpu, CheckCircle2, Lock, Radio } from "lucide-react";

interface NetworkEvent {
  timestamp: string;
  remote_ip: string;
  remote_port: number;
  local_port: number;
  pid?: number | null;
  process_name?: string | null;
}

interface NetworkLogData {
  total_outbound_attempts: number;
  events: NetworkEvent[];
  current_status: string;
}

import { useAuth } from "@/context/AuthContext";

export default function SovereigntyPage() {
  const { authFetch } = useAuth();
  const [data, setData] = useState<NetworkLogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNetworkLog = async () => {
    try {
      const res = await authFetch("/api/v1/system/network-log");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to connect to Network Monitor daemon");
    } finally {
      setLoading(false);
    }

  };


  useEffect(() => {
    fetchNetworkLog();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchNetworkLog();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const isClean = data ? data.total_outbound_attempts === 0 : true;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-token flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-accent" />
            Air-Gap Network Monitor & Sovereignty Inspector
          </h1>
          <p className="text-xs text-muted font-mono mt-1">
            GET /api/v1/system/network-log &bull; Background psutil daemon (2s interval) checking outbound TCP
          </p>
        </div>
        <button
          onClick={fetchNetworkLog}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface border border-token hover:border-cyan-500/40 text-xs font-mono text-primary transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-accent" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Status Banner */}
      <div
        className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all ${
          isClean
            ? "bg-emerald-950/10 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
            : "bg-rose-950/10 dark:bg-rose-950/20 border-rose-500/40 text-rose-700 dark:text-rose-300"
        }`}
      >
        <div className="flex items-start space-x-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
              isClean
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 animate-pulse"
            }`}
          >
            {isClean ? <ShieldCheck className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-bold font-mono tracking-wide">
                {data ? data.current_status : "Scanning..."}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold border ${
                  isClean
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-500/20 border-rose-500/50 text-rose-700 dark:text-rose-300"
                }`}
              >
                {isClean ? "0 OUTBOUND ATTEMPTS" : "ALERT DETECTED"}
              </span>
            </div>
            <p className="text-xs text-muted mt-1 font-sans">
              Background thread actively inspects socket table via <code className="text-accent">psutil.net_connections()</code> every 2 seconds. Outbound TCP connections to non-LAN/non-loopback remote IPs are flagged immediately.
            </p>
          </div>
        </div>

        <div className="shrink-0 bg-base p-4 rounded-xl border border-token text-center min-w-[180px]">
          <span className="text-[10px] text-muted font-mono uppercase tracking-widest block">
            Outbound Count
          </span>
          <span
            className={`text-3xl font-extrabold font-mono ${
              isClean ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {data ? data.total_outbound_attempts : 0}
          </span>
        </div>
      </div>

      {/* Rules & Whitelist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-token space-y-2">
          <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-primary">
            <Lock className="w-4 h-4 text-accent" />
            <span>Allowed Loopback Range</span>
          </div>
          <p className="text-[11px] text-muted font-mono">
            127.0.0.1, ::1, localhost
          </p>
          <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
            WHITELISTED
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-token space-y-2">
          <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-primary">
            <Radio className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>Allowed Private Subnets</span>
          </div>
          <p className="text-[11px] text-muted font-mono">
            10.x.x.x, 172.16-31.x.x, 192.168.x.x
          </p>
          <span className="inline-block px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-mono">
            LAN ONLY
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-token space-y-2">
          <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-primary">
            <Cpu className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            <span>Blocked Public IPs</span>
          </div>
          <p className="text-[11px] text-muted font-mono">
            All external internet IPs & cloud APIs
          </p>
          <span className="inline-block px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-mono">
            STRICTLY BLOCKED & LOGGED
          </span>
        </div>
      </div>

      {/* Captured Events Table */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold font-mono text-primary uppercase tracking-wider flex items-center justify-between">
          <span>Captured External Network Events ({data?.events?.length || 0})</span>
          <span className="text-xs text-muted font-normal">In-memory buffer max 100 events</span>
        </h2>

        {data?.events && data.events.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-token bg-surface">
            <table className="w-full text-left text-xs font-mono text-primary">
              <thead className="bg-base text-muted border-b border-token uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Remote Address</th>
                  <th className="px-4 py-3">Local Port</th>
                  <th className="px-4 py-3">PID / Process</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-token">
                {data.events.map((evt, i) => (
                  <tr key={i} className="hover:bg-surface-hover">
                    <td className="px-4 py-3 text-muted">{evt.timestamp}</td>
                    <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-bold">
                      {evt.remote_ip}:{evt.remote_port}
                    </td>
                    <td className="px-4 py-3 text-accent">{evt.local_port}</td>
                    <td className="px-4 py-3 text-primary">
                      {evt.process_name || "unknown"} (PID: {evt.pid || "N/A"})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 rounded-xl border border-token bg-surface text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-primary">No External Connections Captured</p>
            <p className="text-xs text-muted max-w-md mx-auto font-sans">
              The daemon has detected 0 outbound connections to external public IP addresses during server uptime. All LLM queries, vector embeddings, and document parsing run locally.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
