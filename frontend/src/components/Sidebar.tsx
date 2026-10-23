"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  FileText,
  Database,
  Terminal,
  ShieldCheck,
  Cpu,
  WifiOff,
  ClipboardList,
  FileOutput,
  Users,
  X,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role || "EMPLOYEE";

  const sections = [
    {
      label: "WORKSPACE",
      items: [
        { name: "Chat", path: "/chat", icon: MessageSquare, roles: ["EMPLOYEE", "ANALYST", "MANAGER", "ADMIN"] },
        { name: "Documents", path: "/documents", icon: FileText, roles: ["EMPLOYEE", "ANALYST", "MANAGER", "ADMIN"] },
        { name: "Search", path: "/knowledge", icon: Database, roles: ["EMPLOYEE", "ANALYST", "MANAGER", "ADMIN"] },
      ],
    },
    {
      label: "TOOLS",
      items: [
        { name: "Code workspace", path: "/sandbox", icon: Terminal, roles: ["EMPLOYEE", "ANALYST", "MANAGER", "ADMIN"] },
        { name: "Inspections", path: "/inspection", icon: ShieldCheck, roles: ["EMPLOYEE", "ANALYST", "MANAGER", "ADMIN"] },
        { name: "Create report", path: "/generate", icon: FileOutput, roles: ["EMPLOYEE", "ANALYST", "MANAGER", "ADMIN"] },
      ],
    },
    {
      label: "ADMIN",
      items: [
        { name: "Approvals", path: "/reviews", icon: ShieldCheck, roles: ["MANAGER", "ADMIN"] },
        { name: "System status", path: "/sovereignty", icon: WifiOff, roles: ["MANAGER", "ADMIN"] },
        { name: "Activity log", path: "/audit", icon: ClipboardList, roles: ["MANAGER", "ADMIN"] },
        { name: "Users", path: "/admin", icon: Users, roles: ["ADMIN"] },
      ],
    },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-[320px] border-r border-white/[0.07] flex flex-col justify-between h-[100dvh] shrink-0 select-none transition-transform duration-300 lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      style={{ background: "linear-gradient(180deg, #0b0e13 0%, #080a0e 100%)" }}
    >
      <div>
        {/* Brand Header */}
        <div className="h-[76px] px-5 border-b border-white/[0.06] flex items-center gap-3">
          <img
            src="/sovereign_logo.png"
            alt="Sovereign AI Logo"
            className="w-9 h-9 rounded-[11px] border border-white/[0.1] object-cover shadow-[0_10px_30px_rgba(0,0,0,.35)] shrink-0"
          />
          <div>
            <h1 className="font-semibold font-heading text-[#f5f7fb] text-[13px] tracking-[-0.02em]">
              Sovereign AI
            </h1>
            <p className="text-[9px] text-[#657085] tracking-[0.14em] uppercase font-mono mt-0.5">
              Private Intelligence
            </p>
          </div>
          <button onClick={onClose} aria-label="Close navigation" className="ml-auto p-2 text-[#697383] hover:text-white lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Grouped Section Navigation */}
        <nav className="px-3 py-5 space-y-7 overflow-y-auto max-h-[calc(100dvh-10rem)]">
          {sections.map((sec) => {
            const visibleItems = sec.items.filter((item) => item.roles.includes(role));
            if (visibleItems.length === 0) return null;

            return (
              <div key={sec.label} className="space-y-[2px]">
                <div className="px-3 text-[9px] font-medium text-[#50596a] uppercase tracking-[0.18em] mb-2 font-mono">
                  {sec.label}
                </div>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.path ||
                    (pathname === "/" && item.path === "/chat");

                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`relative flex items-center space-x-3 px-3.5 py-3 rounded-[11px] text-[15px] font-medium transition-all duration-150 ease-out active:scale-[0.98] group ${
                        isActive
                          ? "bg-[#78A7FF]/10 text-[#a9c5ff] font-semibold border border-[#78A7FF]/16 sidebar-active-glow"
                          : "text-[#7b8493] border border-transparent hover:text-[#e7ebf2] hover:bg-white/[0.035]"
                      }`}
                    >
                      {/* Left-edge active indicator line with animated scale-y */}
                      <span
                        className={`absolute -left-[1px] top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r bg-[#78A7FF] transition-transform duration-200 origin-center ${
                          isActive ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"
                        }`}
                      />

                      <Icon className={`w-4 h-4 shrink-0 transition-opacity duration-150 ${isActive ? "text-[#8eb2ff] opacity-100" : "text-[#596273] opacity-80 group-hover:text-[#b9c1ce]"}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>

      {/* System Footer Info */}
      <div className="p-3.5 m-3 rounded-xl bg-white/[0.025] border border-white/[0.07] space-y-2.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-[#687282]">
          <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-[#78A7FF]" /> LOCAL CORE</span>
          <span className="text-[#8fa9dc]">v5.0</span>
        </div>
        <div className="flex items-center justify-between text-[9px] text-[#697383] font-mono uppercase tracking-wider">
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#51d6a5]"></span>Air-gapped</span>
          <span>{role}</span>
        </div>
      </div>
    </aside>
  );
}
