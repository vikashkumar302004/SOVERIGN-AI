"use client";

import { Bot, Braces, Database, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

export default function AuthShell({ children, eyebrow, title, description }: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  const features = [
    [LockKeyhole, "Private by design", "Everything stays on this machine"],
    [Database, "Document aware", "Ask questions across your own files"],
    [Braces, "Built for real work", "Chat, code and workflows in one place"],
  ] as const;

  return (
    <div className="auth-screen min-h-[100dvh] overflow-hidden bg-[#080b10] text-[#f5f7fb]">
      <div className="auth-mesh" aria-hidden="true" />
      <div className="auth-glow auth-glow-a" aria-hidden="true" />
      <div className="auth-glow auth-glow-b" aria-hidden="true" />

      <header className="auth-nav">
        <div className="flex items-center gap-3">
          <img src="/sovereign_logo.png" alt="Sovereign AI" className="auth-logo-float h-11 w-11 rounded-2xl border border-white/10 object-cover" />
          <div>
            <div className="text-[17px] font-semibold tracking-[-.02em]">Sovereign AI</div>
            <div className="mt-0.5 text-[13px] text-[#8792a3]">Private AI workspace</div>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[.06] px-4 py-2 text-[14px] text-[#a8b3c3] sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.65)]" />
          Local system ready
        </div>
      </header>

      <main className="auth-main relative z-10 mx-auto grid min-h-[calc(100dvh-92px)] w-full max-w-[1360px] items-center gap-12 px-6 py-10 lg:grid-cols-[1fr_520px] lg:px-12">
        <section className="hidden max-w-[650px] lg:block">
          <div className="rise inline-flex items-center gap-2 rounded-full border border-[#7ea7ff]/20 bg-[#7ea7ff]/[.07] px-4 py-2 text-[14px] font-medium text-[#afc6f7]">
            <Sparkles className="h-4 w-4" /> Your intelligence, under your control
          </div>
          <h1 className="rise mt-7 text-[clamp(3.1rem,4vw,4.6rem)] font-semibold leading-[1.02] tracking-[-.055em]" style={{ "--i": 1 } as React.CSSProperties}>
            One private workspace.<br /><span className="text-[#8394b2]">Every serious task.</span>
          </h1>
          <p className="rise mt-6 max-w-[600px] text-[19px] leading-8 text-[#a6afbd]" style={{ "--i": 2 } as React.CSSProperties}>
            Talk naturally, understand documents, write code and move work through approvals—without sending your context outside.
          </p>
          <div className="rise mt-9 grid grid-cols-3 gap-3" style={{ "--i": 3 } as React.CSSProperties}>
            {features.map(([Icon, label, copy]) => (
              <div key={label} className="auth-feature-card rounded-2xl border border-white/[.075] bg-white/[.025] p-5">
                <Icon className="h-5 w-5 text-[#8fb1fb]" />
                <div className="mt-4 text-[15px] font-semibold">{label}</div>
                <div className="mt-2 text-[14px] leading-5 text-[#7f8a9a]">{copy}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="auth-panel-enter mx-auto w-full max-w-[520px]">
          <div className="auth-card-shine rounded-[26px] border border-white/[.1] bg-[#11161f]/90 p-7 shadow-[0_40px_120px_rgba(0,0,0,.45)] backdrop-blur-2xl sm:p-9">
            <div className="mb-7">
              <div className="flex items-center gap-2 text-[14px] font-semibold uppercase tracking-[.12em] text-[#83aaff]">
                <ShieldCheck className="h-4 w-4" /> {eyebrow}
              </div>
              <h2 className="mt-4 text-[38px] font-semibold leading-tight tracking-[-.045em]">{title}</h2>
              <p className="mt-3 text-[16px] leading-7 text-[#9ca7b7]">{description}</p>
            </div>
            {children}
          </div>
          <div className="mt-5 flex items-center justify-center gap-2 text-[14px] text-[#7f8a9a]">
            <Bot className="h-4 w-4 text-[#7398e8]" /> Encrypted local session
          </div>
        </section>
      </main>
    </div>
  );
}
