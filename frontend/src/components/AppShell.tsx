"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, token } = useAuth();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isChatPage = pathname === "/chat" || pathname === "/";

  useEffect(() => setNavigationOpen(false), [pathname]);

  if (isAuthPage) {
    return <main className="auth-main flex-1 w-full min-h-screen bg-base">{children}</main>;
  }

  if (loading) {
    return (
      <div className="flex-1 min-h-screen w-full bg-base flex items-center justify-center transition-colors duration-300">
        <div className="flex flex-col items-center space-y-3 font-mono text-xs text-muted">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
          <span>Authenticating Session...</span>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex-1 min-h-screen w-full bg-base flex items-center justify-center transition-colors duration-300">
        <div className="flex flex-col items-center space-y-3 font-mono text-xs text-muted">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
          <span>Redirecting to Login...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-base">
      {navigationOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setNavigationOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}
      <Sidebar open={navigationOpen} onClose={() => setNavigationOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar onOpenNavigation={() => setNavigationOpen(true)} />
        <main className={`flex-1 h-full min-h-0 overflow-hidden bg-base ${isChatPage ? "" : "px-4 py-5 sm:px-6 sm:py-7 xl:px-10 xl:py-9 overflow-y-auto"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
