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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role || "EMPLOYEE";

  const sections = [
    {
      label: "WORKSPACE",
      items: [
        { name: "Chat Router", path: "/chat", icon: MessageSquare, roles: ["EMPLOYEE", "ANALYST", "MANAGER", "ADMIN"] },
        { name: "Document Registry", path: "/documents", icon: FileText, roles: ["EMPLOYEE", "ANALYST", "MANAGER", "ADMIN"] },
        { name: "Knowledge Search", path: "/knowledge", icon: Database, roles: ["EMPLOYEE", "ANALYST", "MANAGER", "ADMIN"] },
      ],
    },
    {
      label: "TOOLS",
      items: [
        { name: "Subprocess Sandbox", path: "/sandbox", icon: Terminal, roles: ["EMPLOYEE", "ANALYST", "MANAGER", "ADMIN"] },
        { name: "Inspection Approval", path: "/inspection", icon: ShieldCheck, roles: ["EMPLOYEE", "ANALYST", "MANAGER", "ADMIN"] },
        { name: "Deliverable Generator", path: "/generate", icon: FileOutput, roles: ["EMPLOYEE", "ANALYST", "MANAGER", "ADMIN"] },
      ],
    },
    {
      label: "ADMIN",
      items: [
        { name: "Manager Approvals", path: "/reviews", icon: ShieldCheck, roles: ["MANAGER", "ADMIN"] },
        { name: "Air-Gap Monitor", path: "/sovereignty", icon: WifiOff, roles: ["MANAGER", "ADMIN"] },
        { name: "Audit Trail", path: "/audit", icon: ClipboardList, roles: ["MANAGER", "ADMIN"] },
        { name: "User Administration", path: "/admin", icon: Users, roles: ["ADMIN"] },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-base border-r border-token flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none transition-colors duration-300">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-token flex items-center space-x-3">
          <img
            src="/sovereign_logo.png"
            alt="Sovereign AI Logo"
            className="w-10 h-10 rounded-xl border border-accent/40 object-cover shadow-md shrink-0"
          />
          <div>
            <h1 className="font-bold text-primary text-sm tracking-wider uppercase font-sans">
              Sovereign AI
            </h1>
            <p className="text-[10px] text-accent tracking-widest uppercase font-mono font-semibold">
              Command Center
            </p>
          </div>
        </div>

        {/* Grouped Section Navigation */}
        <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-9rem)]">
          {sections.map((sec) => {
            const visibleItems = sec.items.filter((item) => item.roles.includes(role));
            if (visibleItems.length === 0) return null;

            return (
              <div key={sec.label} className="space-y-1">
                <div className="px-3 text-[10px] font-mono text-muted uppercase tracking-widest font-semibold mb-2">
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
                      className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-accent/10 text-accent font-semibold border border-accent/30 shadow-sm"
                          : "text-muted hover:text-primary hover:bg-surface"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-accent" : "text-muted"}`} />
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
      <div className="p-3.5 m-3 rounded-2xl bg-surface border border-token space-y-2 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-mono text-muted">
          <span>ROLE: <strong className="text-primary">{role}</strong></span>
          <span className="text-accent font-semibold">v5.0.0</span>
        </div>
        <div className="flex items-center space-x-2 text-[10px] text-muted font-mono">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
          <span>AIR-GAPPED SYSTEM</span>
        </div>
      </div>
    </aside>
  );
}
