"use client";

import { useEffect, useState, useRef } from "react";
import { ShieldCheck, WifiOff, ChevronDown, LogOut, User as UserIcon, Settings, ShieldAlert, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

interface HealthData {
  status: string;
  ollama_reachable: boolean;
  database_connected: boolean;
  details?: string | null;
}

interface NetworkData {
  total_outbound_attempts: number;
  current_status: string;
}

export default function TopBar() {
  const { user, logout, authFetch } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [network, setNetwork] = useState<NetworkData | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchHealthAndNetwork = async () => {
    try {
      const isManagerOrAdmin = user?.role === "MANAGER" || user?.role === "ADMIN";
      const requests: Promise<any>[] = [
        fetch("http://localhost:8000/health").catch(() => null),
      ];

      if (isManagerOrAdmin) {
        requests.push(authFetch("http://localhost:8000/api/v1/system/network-log").catch(() => null));
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

  const isFullyOnline = health?.ollama_reachable && health?.database_connected;
  const isNetworkClean = network ? network.total_outbound_attempts === 0 : true;

  const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : "U";

  return (
    <header className="h-16 bg-surface/90 backdrop-blur-md border-b border-token px-6 flex items-center justify-between sticky top-0 z-30 shrink-0 select-none transition-colors duration-300">
      {/* Title & Status */}
      <div className="flex items-center space-x-4">
        <h2 className="text-xs font-semibold text-primary tracking-wide uppercase font-sans">
          Sovereign AI Engine
        </h2>
        <span className="text-muted opacity-40">|</span>
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-muted">AIR-GAPPED PORT:</span>
          <span className="text-accent font-medium">8000</span>
        </div>
      </div>

      {/* Compact Combined Status Cluster, Theme Switcher & Profile Menu */}
      <div className="flex items-center space-x-3">
        {/* Compact Combined Status Cluster */}
        <Link
          href="/sovereignty"
          className="flex items-center space-x-3 px-3 py-1.5 rounded-full bg-surface border border-token hover:border-accent/40 transition-all text-xs font-mono shadow-sm"
          title="Live Air-Gap Sovereignty Status"
        >
          <div className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${isNetworkClean ? "bg-[#10B981] animate-pulse" : "bg-[#EF4444]"}`} />
            <span className="text-primary font-medium">
              {network ? `${network.total_outbound_attempts} Outbound` : "0 Outbound"}
            </span>
          </div>
          <span className="text-muted opacity-40">|</span>
          <div className="flex items-center space-x-1.5 text-accent font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isFullyOnline ? "SECURE" : "DEGRADED"}</span>
          </div>
        </Link>

        {/* Theme Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          type="button"
          className="p-2 rounded-xl bg-surface border border-token hover:bg-surface-hover hover:border-accent/40 text-primary transition-all shadow-sm flex items-center justify-center cursor-pointer active:scale-95"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-[#FBBF24] hover:rotate-45 transition-transform" />
          ) : (
            <Moon className="w-4 h-4 text-[#0EA5E9] hover:-rotate-12 transition-transform" />
          )}
        </button>

        {/* User Profile Dropdown */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-surface-hover transition-all border border-transparent hover:border-token"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#22D3EE] to-[#0EA5E9] border border-accent/40 text-[#0A0E14] font-bold text-xs flex items-center justify-center shadow-sm">
                {userInitial}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-primary leading-none">
                  {user.username}
                </span>
                <span className="text-[10px] text-accent font-mono leading-tight">
                  {user.role}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface border border-token rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn">
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

