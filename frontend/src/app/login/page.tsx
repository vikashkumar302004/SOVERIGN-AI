"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cpu, LogIn, AlertCircle, Lock, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }


    setError(null);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Authentication failed. Check credentials.");
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
      {/* Subtle Background Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-surface backdrop-blur-xl border border-token rounded-2xl p-8 shadow-xl relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-accent mb-3 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Cpu className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-primary tracking-wide uppercase">
            Sovereign AI
          </h1>
          <p className="text-xs text-accent font-mono tracking-widest uppercase mt-1">
            Secure Authentication Portal
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-mono flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">
              Username or Email
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full bg-base border border-token rounded-xl pl-10 pr-4 py-3 text-xs text-primary focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">
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
                className="w-full bg-base border border-token rounded-xl pl-10 pr-4 py-3 text-xs text-primary focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold tracking-wider uppercase transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 shadow-[0_0_20px_rgba(6,182,212,0.3)] mt-2"
          >
            {loading ? (
              <span className="animate-pulse">Authenticating...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-token">
          <p className="text-xs text-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-accent hover:underline font-medium ml-1"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
