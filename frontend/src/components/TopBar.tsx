"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronDown, LogOut, Sun, Moon, Menu, Command } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

interface HealthData {
  status: string;
  ollama_reachable: boolean;
  database_connected: boolean;
  available_models: string[];
  missing_models: string[];
  details?: string | null;
}

interface NetworkData {
  total_outbound_attempts: number;
  current_status: string;
}

export default function TopBar({ onOpenNavigation }: { onOpenNavigation?: () => void }) {
  const { user, logout, authFetch } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [network, setNetwork] = useState<NetworkData | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const fetchHealthAndNetwork = async () => {
    try {
      const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "ADMIN";
      const requests: Promise<any>[] = [
        fetch("/health").catch(() => null),
      ];

      if (isManagerOrAdmin) {
        requests.push(authFetch("/api/v1/system/network-log").catch(() => null));
      }

      const results = await Promise.all(requests);
      const hRes = results[0];
      const nRes = isManagerOrAdmin ? results[1] : null;

      if (hRes && hRes.ok) {
        const data = await hRes.json();
        setHealth(data);
      } else {
        setHealth({
          status: "offline",
          ollama_reachable: false,
          database_connected: false,
          available_models: [],
          missing_models: [],
          details: "Connection refused",
        });
      }

      if (nRes && nRes.ok) {
        const nData = await nRes.json();
        setNetwork(nData);
      }
    } catch (err: any) {
      console.error("TopBar poll error", err);
    }
  };

  useEffect(() => {
    fetchHealthAndNetwork();
    const interval = setInterval(fetchHealthAndNetwork, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isFullyOnline = health?.ollama_reachable && health?.database_connected && !health?.missing_models?.length;
  const isNetworkClean = network ? network.total_outbound_attempts === 0 : true;

  const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : "U";
  const pageNames: Record<string, string> = {
    "/chat": "Intelligence",
    "/documents": "Documents",
    "/knowledge": "Knowledge",
    "/automations": "Automations",
    "/sandbox": "Sandbox",
    "/inspection": "Inspections",
    "/generate": "Deliverables",
    "/reviews": "Approvals",
    "/sovereignty": "Sovereignty",
    "/audit": "Audit trail",
    "/admin": "Administration",
  };

  return (
    <header className="h-[60px] bg-[#090c11]/82 backdrop-blur-xl border-b border-white/[0.065] px-3 sm:px-5 flex items-center justify-between sticky top-0 z-30 shrink-0 select-none">
      {/* Title & Status */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button onClick={onOpenNavigation} aria-label="Open navigation" className="p-2 -ml-1 rounded-lg text-[#7f8999] hover:text-white hover:bg-white/[0.05] lg:hidden">
          <Menu className="h-4 w-4" />
        </button>
        <Command className="hidden sm:block h-3.5 w-3.5 text-[#667187]" />
        <span className="text-[12px] font-medium text-[#c7cdd7] truncate">{pageNames[pathname] || "Workspace"}</span>
        <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full border border-white/[0.07] bg-white/[0.025] text-[9px] font-mono uppercase tracking-wider text-[#677284]">Local</span>
      </div>

      {/* Compact Combined Status Cluster, Theme Switcher & Profile Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Near-invisible status dots */}
        <Link
          href="/sovereignty"
          className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.025] text-[9px] font-mono uppercase tracking-wide text-[#747e8f] hover:text-[#aab2bf] transition-colors"
          title="Live Air-Gap Sovereignty Status"
        >
          <div className="flex items-center space-x-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isNetworkClean ? "bg-[#10B981]" : "bg-[#EF4444]"}`} />
            <span>{network ? `${network.total_outbound_attempts} Outbound` : "0 Outbound"}</span>
          </div>
          <span className="w-px h-3 bg-white/[0.08]" />
          <div className="flex items-center space-x-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isFullyOnline ? "bg-[#10B981]" : "bg-[#F59E0B]"}`} />
            <span title={health?.details || undefined}>
              {isFullyOnline
                ? "SECURE"
                : health?.missing_models?.length
                  ? `${health.missing_models.length} MODEL MISSING`
                  : "DEGRADED"}
            </span>
          </div>
        </Link>

        {/* Theme Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          type="button"
          className="p-2 rounded-lg hover:bg-white/[0.05] text-[#737d8d] hover:text-white transition-colors flex items-center justify-center cursor-pointer active:scale-95"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? (
            <Sun className="w-3.5 h-3.5 text-[#6B7280] hover:text-[#FBBF24] transition-colors" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-[#6B7280] hover:text-[#0EA5E9] transition-colors" />
          )}
        </button>

        {/* User Profile Dropdown */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/[0.045] transition-all border border-transparent hover:border-white/[0.06]"
            >
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#9bbaff] to-[#5278cf] border border-white/10 text-[#07101f] font-bold text-xs flex items-center justify-center shadow-sm">
                {userInitial}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-primary leading-none">
                  {user.username}
                </span>
                <span className="text-[9px] text-[#7185ae] font-mono leading-tight mt-0.5">
                  {user.role}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-[#10141b] border border-white/[0.09] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,.55)] p-2 z-50 animate-fadeIn">
                <div className="p-2.5 border-b border-token">
                  <div className="text-xs font-semibold text-primary truncate">{user.username}</div>
                  <div className="text-[11px] text-muted truncate font-mono">{user.email}</div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded bg-accent/10 border border-accent/30 text-accent font-mono text-[10px] font-semibold">
                    ROLE: {user.role}
                  </span>
                </div>

                <div className="p-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

