"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cpu, LogIn, AlertCircle, Lock, User as UserIcon, ShieldCheck, ArrowRight, Bot, Code, Eye, Globe } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  // Active Model Routing Cycle State (0: GENERAL, 1: CODING, 2: VISION, 3: MULTILINGUAL)
  const [activeModelIndex, setActiveModelIndex] = useState(0);

  const modelNodes = [
    {
      id: "general",
      name: "llama3.2:3b",
      label: "GENERAL",
      color: "#22D3EE",
      glow: "shadow-[0_0_16px_rgba(34,211,238,0.5)]",
      border: "border-[#22D3EE]",
      icon: Bot,
    },
    {
      id: "coding",
      name: "qwen2.5-coder:7b",
      label: "CODING",
      color: "#A855F7",
      glow: "shadow-[0_0_16px_rgba(168,85,247,0.5)]",
      border: "border-[#A855F7]",
      icon: Code,
    },
    {
      id: "vision",
      name: "llava:7b",
      label: "VISION",
      color: "#F59E0B",
      glow: "shadow-[0_0_16px_rgba(245,158,11,0.5)]",
      border: "border-[#F59E0B]",
      icon: Eye,
    },
    {
      id: "multilingual",
      name: "qwen2.5:7b",
      label: "MULTILINGUAL",
      color: "#10B981",
      glow: "shadow-[0_0_16px_rgba(16,185,129,0.5)]",
      border: "border-[#10B981]",
      icon: Globe,
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveModelIndex((prev) => (prev + 1) % modelNodes.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
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
        login("", data.user);
        router.push("/chat");
      }
    } catch (err: any) {
      setError("Unable to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  const activeModel = modelNodes[activeModelIndex];

  return (
    <div className="h-screen w-screen bg-[#0A0E14] flex items-center justify-center relative overflow-hidden select-none font-sans">
      {/* 1. ANIMATED BACKGROUND: Drifting Radial Gradient */}
      <div className="absolute inset-0 animated-bg-glow pointer-events-none z-0" />

      {/* 2. SUBTLE ANIMATED GRID OVERLAY */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
        }}
      />

      {/* 3. 18 DRIFTING FLOATING PARTICLES */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {Array.from({ length: 18 }).map((_, idx) => {
          const size = (idx % 3) + 2;
          const left = (idx * 5.5 + 3) % 96;
          const duration = 9 + (idx % 7);
          const delay = (idx * 0.7) % 6;
          const opacity = 0.15 + (idx % 4) * 0.05;

          return (
            <div
              key={idx}
              className="particle"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${left}%`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                opacity: opacity,
              }}
            />
          );
        })}
      </div>

      {/* MAIN CONTAINER: Flex layout holding Login Card + Architecture Diagram */}
      <div className="relative z-10 max-w-5xl w-full px-6 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16">
        
        {/* CENTER CONTENT: GLASSMORPHISM LOGIN CARD */}
        <div className="max-w-[420px] w-full bg-white/[0.03] backdrop-blur-[20px] border border-white/[0.08] border-t-[#22D3EE]/50 rounded-[24px] p-8 md:p-10 shadow-2xl relative overflow-hidden">
          
          {/* Pulsing Logo Backdrop Glow */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="rise relative mb-4" style={{ "--i": 0 } as React.CSSProperties}>
              <div className="absolute -inset-3 rounded-2xl bg-[#22D3EE]/20 blur-lg opacity-60 animate-pulse" />
              <div className="w-14 h-14 rounded-2xl bg-[#141822] border border-[#22D3EE]/40 flex items-center justify-center text-[#22D3EE] shadow-[0_0_20px_rgba(34,211,238,0.25)] relative z-10">
                <Cpu className="w-7 h-7" />
              </div>
            </div>

            <h1
              className="rise text-3xl font-bold text-[#E5E7EB] tracking-tight font-sans"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              Sovereign AI
            </h1>
            <p
              className="rise text-[11px] text-[#6B7280] font-mono tracking-[0.2em] font-medium uppercase mt-1"
              style={{ "--i": 2 } as React.CSSProperties}
            >
              Command Center
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rise" style={{ "--i": 3 } as React.CSSProperties}>
              <label className="block text-[11px] font-mono text-[#6B7280] uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#4B5563] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin_user"
                  className="w-full bg-[#12161F] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-xs text-[#E5E7EB] placeholder-[#4B5563] focus:border-[#22D3EE]/40 focus:ring-0 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="rise" style={{ "--i": 4 } as React.CSSProperties}>
              <label className="block text-[11px] font-mono text-[#6B7280] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#4B5563] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#12161F] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-xs text-[#E5E7EB] placeholder-[#4B5563] focus:border-[#22D3EE]/40 focus:ring-0 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="rise pt-1" style={{ "--i": 5 } as React.CSSProperties}>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl accent-gradient text-[#0A0E14] text-xs font-semibold tracking-wider uppercase transition-all duration-200 active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-50 shadow-[0_0_20px_rgba(34,211,238,0.3)] cursor-pointer"
              >
                {loading ? (
                  <span className="animate-pulse">Authenticating...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 stroke-[2.5]" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Air-Gapped Status Badge & Registration link */}
          <div className="rise mt-6 pt-5 border-t border-white/[0.06] flex items-center justify-between text-xs" style={{ "--i": 6 } as React.CSSProperties}>
            <div className="inline-flex items-center space-x-2 text-[10px] font-mono text-[#6B7280]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span>100% AIR-GAPPED</span>
            </div>

            <Link
              href="/register"
              className="text-[11px] font-mono text-[#22D3EE] hover:underline flex items-center space-x-1"
            >
              <span>Register</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* ANIMATED ARCHITECTURE DIAGRAM SIGNATURE ELEMENT */}
        <div className="hidden md:flex flex-col items-center justify-center max-w-[300px] w-full select-none">
          <div className="text-[10px] font-mono text-[#4B5563] uppercase tracking-[0.2em] mb-4 flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] animate-ping" />
            <span>LIVE TASK ROUTING PIPELINE</span>
          </div>

          <div className="w-full bg-[#12161F]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-5 shadow-2xl flex flex-col items-center">
            
            {/* SVG LIGHT BEAMS CANVAS */}
            <div className="relative w-full flex items-center justify-between my-2">
              
              {/* NODE 1: USER */}
              <div className="flex flex-col items-center z-10">
                <div className="w-12 h-12 rounded-2xl neumorphic-node border border-white/[0.08] flex items-center justify-center text-[#22D3EE] shadow-md">
                  <UserIcon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono text-[#6B7280] font-medium mt-2">USER</span>
              </div>

              {/* BEAM 1: USER TO ROUTER */}
              <svg className="absolute left-10 w-24 h-6 pointer-events-none z-0 overflow-visible">
                <line
                  x1="0"
                  y1="12"
                  x2="80"
                  y2="12"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="2"
                />
                <line
                  x1="0"
                  y1="12"
                  x2="80"
                  y2="12"
                  stroke="#22D3EE"
                  strokeWidth="2.5"
                  className="beam-animated"
                />
              </svg>

              {/* NODE 2: TASK ROUTER */}
              <div className="flex flex-col items-center z-10">
                <div className="w-14 h-14 rounded-2xl neumorphic-node border border-[#A855F7]/40 flex items-center justify-center text-[#A855F7] shadow-[0_0_15px_rgba(168,85,247,0.3)] relative">
                  <Cpu className="w-6 h-6 animate-pulse" />
                </div>
                <span className="text-[10px] font-mono text-[#A855F7] font-semibold mt-2">ROUTER</span>
              </div>

              {/* BEAM 2: ROUTER TO MODELS */}
              <svg className="absolute right-10 w-24 h-6 pointer-events-none z-0 overflow-visible">
                <line
                  x1="0"
                  y1="12"
                  x2="80"
                  y2="12"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="2"
                />
                <line
                  x1="0"
                  y1="12"
                  x2="80"
                  y2="12"
                  stroke={activeModel.color}
                  strokeWidth="2.5"
                  className="beam-animated"
                />
              </svg>

              {/* NODE 3: 4 MODEL CLUSTER */}
              <div className="flex flex-col items-center z-10">
                <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[#0A0E14] border border-white/[0.08]">
                  {modelNodes.map((mNode, idx) => {
                    const isActive = idx === activeModelIndex;
                    const IconComp = mNode.icon;

                    return (
                      <div
                        key={mNode.id}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 ${
                          isActive
                            ? `${mNode.border} ${mNode.glow} bg-white/10 text-white scale-110`
                            : "border border-transparent text-[#4B5563] opacity-40"
                        }`}
                        title={mNode.name}
                      >
                        <IconComp className="w-3.5 h-3.5" style={{ color: isActive ? mNode.color : undefined }} />
                      </div>
                    );
                  })}
                </div>
                <span className="text-[10px] font-mono text-[#6B7280] font-medium mt-2">MODELS</span>
              </div>

            </div>

            {/* LIVE INTENT ROUTING BADGE */}
            <div className="mt-4 pt-3 border-t border-white/[0.06] w-full text-center">
              <div className="text-[10px] font-mono text-[#6B7280] uppercase tracking-wider mb-1">
                ACTIVE TASK INTENT
              </div>
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold transition-all duration-300"
                style={{
                  color: activeModel.color,
                  backgroundColor: `${activeModel.color}15`,
                  border: `1px solid ${activeModel.color}40`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: activeModel.color }} />
                <span>{activeModel.label}: {activeModel.name}</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
