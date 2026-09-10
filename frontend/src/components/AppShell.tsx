"use client";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, token } = useAuth();
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isChatPage = pathname === "/chat" || pathname === "/";

  if (isAuthPage) {
    return <main className="flex-1 w-full min-h-screen bg-base transition-colors duration-300">{children}</main>;
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
    <div className="flex h-screen w-full overflow-hidden bg-base transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar />
        <main className={`flex-1 h-full min-h-0 overflow-hidden bg-base transition-colors duration-300 ${isChatPage ? "" : "p-6 md:p-8 overflow-y-auto"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
