"use client";

import { Bot, Braces, Database, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

export default function AuthShell({
  children,
  eyebrow,
  title,
  description,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-[100dvh] w-full bg-[#07090d] text-[#f4f6fa] overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(900px 600px at 12% 20%, rgba(82,119,190,.18), transparent 66%), radial-gradient(700px 500px at 100% 100%, rgba(106,83,160,.09), transparent 70%)" }}
      />
      <div className="absolute inset-0 opacity-[0.16] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "linear-gradient(to right, black, transparent 72%)" }}
      />

      <div className="relative min-h-[100dvh] mx-auto grid w-full max-w-[1720px] lg:grid-cols-[minmax(0,1fr)_minmax(520px,600px)] lg:gap-16 xl:gap-24 px-5 sm:px-8 lg:px-12 xl:px-16">
        <section className="hidden lg:flex flex-col justify-between py-10 xl:py-12">
          <div className="flex items-center gap-3">
            <img src="/sovereign_logo.png" alt="" className="w-10 h-10 rounded-xl border border-white/[0.09] object-cover" />
            <div>
              <div className="text-base font-semibold tracking-[-.02em]">Sovereign AI</div>
              <div className="text-[11px] font-mono tracking-[.15em] uppercase text-[#69758a] mt-1">Private intelligence system</div>
            </div>
          </div>

          <div className="max-w-[720px] py-10">
            <div className="rise inline-flex items-center gap-2 rounded-full border border-[#78a7ff]/20 bg-[#78a7ff]/[0.07] px-4 py-2 text-xs font-mono tracking-[.12em] uppercase text-[#9bbaff]">
              <Sparkles className="h-3 w-3" /> Intelligence stays yours
            </div>
            <h1 className="rise mt-8 max-w-[700px] text-[clamp(3.6rem,4.6vw,5.7rem)] leading-[.95] font-semibold tracking-[-.065em]" style={{ "--i": 1 } as React.CSSProperties}>
              Your data.<br/><span className="text-[#8393ad]">Your models.</span><br/>Your command.
            </h1>
            <p className="rise mt-8 max-w-[640px] text-[17px] leading-8 text-[#919baa]" style={{ "--i": 2 } as React.CSSProperties}>
              A private AI workspace for evidence-backed answers, operational workflows, and accountable decisions—without sending sensitive context outside your environment.
            </p>
            <div className="rise mt-10 grid grid-cols-3 gap-4 max-w-[680px]" style={{ "--i": 3 } as React.CSSProperties}>
              {[
                [LockKeyhole, "Air-gapped", "Zero cloud dependency"],
                [Database, "Grounded", "Source-aware answers"],
                [Braces, "Specialized", "Task-routed models"],
              ].map(([Icon, label, copy]) => {
                const FeatureIcon = Icon as typeof Bot;
                return (
                  <div key={label as string} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                    <FeatureIcon className="h-5 w-5 text-[#87aafb]" />
                    <div className="mt-5 text-sm font-medium">{label as string}</div>
                    <div className="mt-1.5 text-xs leading-5 text-[#707a89]">{copy as string}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[.11em] text-[#5f6978]">
            <span>Local-first architecture</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#51d6a5]" /> System isolated</span>
          </div>
        </section>

        <section className="flex min-h-[100dvh] items-center justify-center py-8">
          <div className="w-full max-w-[540px]">
            <div className="lg:hidden mb-10 flex items-center gap-3">
              <img src="/sovereign_logo.png" alt="" className="w-10 h-10 rounded-xl border border-white/[0.09] object-cover" />
              <div className="text-sm font-semibold">Sovereign AI</div>
            </div>
            <div className="mb-9">
              <div className="workspace-eyebrow !text-xs">{eyebrow}</div>
              <h2 className="mt-4 text-[2.45rem] font-semibold tracking-[-.045em]">{title}</h2>
              <p className="mt-3 text-base leading-7 text-[#8993a2]">{description}</p>
            </div>
            <div className="rounded-[24px] border border-white/[0.09] bg-[#10141b]/92 p-6 sm:p-9 shadow-[0_30px_100px_rgba(0,0,0,.38)] backdrop-blur-xl">
              {children}
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#626d7d] font-mono uppercase tracking-[.1em]">
              <ShieldCheck className="h-3 w-3 text-[#6380b8]" /> Encrypted local session
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
