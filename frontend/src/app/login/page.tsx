"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, KeyRound, Loader2, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AuthShell from "@/components/AuthShell";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Enter your username and password to continue.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.detail || "We couldn't verify those credentials.");
      else {
        login("", data.user);
        router.push("/chat");
      }
    } catch {
      setError("The local authentication service is unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const field = "w-full rounded-xl border border-white/[0.08] bg-[#090c11] py-3.5 pl-11 pr-4 text-sm text-[#edf1f7] placeholder:text-[#414a58] outline-none transition focus:border-[#78a7ff]/55 focus:bg-[#0b0f15]";

  return (
    <AuthShell eyebrow="Secure workspace" title="Welcome back" description="Sign in to continue to your private intelligence environment.">
      {error && (
        <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#ff7f8f]/20 bg-[#ff7f8f]/[0.07] p-3.5 text-xs leading-5 text-[#ff9ba8]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-[10px] font-mono uppercase tracking-[.13em] text-[#6f7988]">Username or email</span>
          <span className="relative block">
            <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#586273]" />
            <input autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your identity" className={field} />
          </span>
        </label>
        <label className="block">
          <span className="mb-2 block text-[10px] font-mono uppercase tracking-[.13em] text-[#6f7988]">Password</span>
          <span className="relative block">
            <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#586273]" />
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className={field} />
          </span>
        </label>
        <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl accent-gradient px-4 py-3.5 text-xs font-semibold text-[#07101f] shadow-[0_12px_32px_rgba(68,108,190,.2)] transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying locally</> : <>Enter workspace <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
      <div className="mt-6 border-t border-white/[0.06] pt-5 text-center text-xs text-[#697383]">
        Need an account? <Link href="/register" className="ml-1 font-medium text-[#8eb1ff] hover:text-[#b5ccff]">Create one</Link>
      </div>
    </AuthShell>
  );
}
