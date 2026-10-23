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

  const field = "w-full rounded-2xl border border-white/[0.09] bg-[#090c11] py-[18px] pl-14 pr-5 text-[17px] text-[#edf1f7] placeholder:text-[#687386] outline-none transition duration-200 focus:-translate-y-px focus:border-[#78a7ff]/60 focus:bg-[#0b0f15] focus:shadow-[0_12px_30px_rgba(34,63,121,.12)]";

  return (
    <AuthShell eyebrow="Secure workspace" title="Welcome back" description="Sign in to continue to your private intelligence environment.">
      {error && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-[#ff7f8f]/20 bg-[#ff7f8f]/[0.07] p-4 text-[15px] leading-6 text-[#ffabb6] animate-fadeIn">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /> {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="mb-3 block text-sm font-semibold uppercase tracking-[.08em] text-[#929cab]">Username or email</span>
          <span className="relative block">
            <User className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7d899c]" />
            <input autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your identity" className={field} />
          </span>
        </label>
        <label className="block">
          <span className="mb-3 block text-sm font-semibold uppercase tracking-[.08em] text-[#929cab]">Password</span>
          <span className="relative block">
            <KeyRound className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7d899c]" />
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className={field} />
          </span>
        </label>
        <button type="submit" disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-2xl accent-gradient px-5 py-[18px] text-base font-bold text-[#07101f] shadow-[0_14px_36px_rgba(68,108,190,.24)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_46px_rgba(68,108,190,.3)] active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0">
          {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Verifying locally</> : <>Enter workspace <ArrowRight className="h-5 w-5" /></>}
        </button>
      </form>
      <div className="mt-8 border-t border-white/[0.07] pt-7 text-center text-base text-[#8c96a5]">
        Need an account? <Link href="/register" className="ml-1 font-medium text-[#8eb1ff] hover:text-[#b5ccff]">Create one</Link>
      </div>
    </AuthShell>
  );
}
