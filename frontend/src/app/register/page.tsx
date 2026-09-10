"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cpu, UserPlus, AlertCircle, Lock, Mail, User as UserIcon, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError("Please fill out all fields.");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters long.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Registration failed.");
      } else {
        login(data.access_token, data.user);
        router.push("/chat");
      }
    } catch (err: any) {
      setError("Unable to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-base flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-surface backdrop-blur-xl border border-token rounded-2xl p-8 shadow-xl relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-accent mb-3 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Cpu className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-primary tracking-wide uppercase">
            Create Account
          </h1>
          <p className="text-xs text-accent font-mono tracking-widest uppercase mt-1">
            Register for Sovereign AI
          </p>
        </div>

        {/* Notice */}
        <div className="mb-6 p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-mono flex items-start space-x-2.5">
          <ShieldCheck className="w-4 h-4 shrink-0 text-accent mt-0.5" />
          <span>
            First registered user automatically becomes <strong className="text-cyan-800 dark:text-cyan-200">ADMIN</strong>. Subsequent accounts default to <strong className="text-primary">EMPLOYEE</strong>.
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-mono flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="choose_username"
                className="w-full bg-base border border-token rounded-xl pl-10 pr-4 py-2.5 text-xs text-primary focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@sovereign.ai"
                className="w-full bg-base border border-token rounded-xl pl-10 pr-4 py-2.5 text-xs text-primary focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-base border border-token rounded-xl pl-10 pr-4 py-2.5 text-xs text-primary focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold tracking-wider uppercase transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 shadow-[0_0_20px_rgba(6,182,212,0.3)] mt-2"
          >
            {loading ? (
              <span className="animate-pulse">Registering...</span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center pt-5 border-t border-token">
          <p className="text-xs text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-accent hover:underline font-medium ml-1"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
