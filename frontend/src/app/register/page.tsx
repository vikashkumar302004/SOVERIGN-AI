"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, AtSign, KeyRound, Loader2, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AuthShell from "@/components/AuthShell";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) return setError("Complete every field to create your account.");
    if (password.length < 12) return setError("Use at least 12 characters for your password.");
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), email: email.trim(), password: password.trim() }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.detail || "Account creation failed.");
      else {
        login("", data.user);
        router.push("/chat");
      }
    } catch {
      setError("The local registration service is unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const field = "w-full rounded-xl border border-white/[0.08] bg-[#090c11] py-4 pl-12 pr-4 text-[15px] text-[#edf1f7] placeholder:text-[#596273] outline-none transition focus:border-[#78a7ff]/55 focus:bg-[#0b0f15]";
  return (
    <AuthShell eyebrow="Local identity" title="Create your access" description="Set up a secure account for this private Sovereign AI deployment.">
      <div className="mb-6 flex gap-3 rounded-xl border border-[#78a7ff]/16 bg-[#78a7ff]/[0.06] p-4 text-sm leading-6 text-[#98a3b4]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#83a8fb]" />
        <span>The first account becomes administrator. Later accounts begin with employee access.</span>
      </div>
      {error && <div role="alert" className="mb-5 flex gap-2.5 rounded-xl border border-[#ff7f8f]/20 bg-[#ff7f8f]/[0.07] p-3.5 text-xs text-[#ff9ba8]"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {[
          { label: "Username", icon: User, type: "text", value: username, set: setUsername, placeholder: "Choose a workspace name", auto: "username" },
          { label: "Email", icon: AtSign, type: "email", value: email, set: setEmail, placeholder: "you@company.com", auto: "email" },
          { label: "Password", icon: KeyRound, type: "password", value: password, set: setPassword, placeholder: "12 characters minimum", auto: "new-password" },
        ].map(({ label, icon: Icon, type, value, set, placeholder, auto }) => (
          <label className="block" key={label}>
            <span className="mb-2.5 block text-xs font-mono uppercase tracking-[.11em] text-[#7d8796]">{label}</span>
            <span className="relative block">
              <Icon className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#687385]" />
              <input type={type} autoComplete={auto} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} className={field} />
            </span>
          </label>
        ))}
        <button type="submit" disabled={loading} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl accent-gradient px-4 py-4 text-sm font-semibold text-[#07101f] shadow-[0_12px_32px_rgba(68,108,190,.2)] transition hover:-translate-y-0.5 disabled:opacity-50">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating identity</> : <>Create account <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
      <div className="mt-7 border-t border-white/[0.06] pt-6 text-center text-sm text-[#7d8796]">
        Already have access? <Link href="/login" className="ml-1 font-medium text-[#8eb1ff] hover:text-[#b5ccff]">Sign in</Link>
      </div>
    </AuthShell>
  );
}
