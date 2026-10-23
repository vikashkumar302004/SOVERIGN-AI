"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface User {
  id: number;
  username: string;
  email: string;
  role: "EMPLOYEE" | "ANALYST" | "MANAGER" | "ADMIN" | string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    fetch("/api/v1/auth/me", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) return;
        const authenticatedUser = (await response.json()) as User;
        if (active) {
          setUser(authenticatedUser);
          setToken("http-only-cookie");
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Protect routes when not logged in, and redirect logged-in users away from auth pages
  useEffect(() => {
    if (loading) return;

    const publicRoutes = ["/login", "/register"];
    const isPublic = publicRoutes.includes(pathname);

    if (!token && !isPublic) {
      router.replace("/login");
    } else if (token && isPublic) {
      router.replace("/chat");
    }
  }, [token, loading, pathname, router]);

  const login = (_newToken: string, newUser: User) => {
    setToken("http-only-cookie");
    setUser(newUser);
  };

  const logout = () => {
    void fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    try {
      const res = await fetch(url, {
        ...options,
        headers,
        // Required for trusted localhost API calls that use a different port.
        // The backend still enforces the configured CORS allow-list.
        credentials: "include",
      });

      if (res.status === 401) {
        logout();
      }

      return res;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      console.warn("authFetch network error:", url, err);
      return new Response(
        JSON.stringify({ detail: "Backend service unavailable or network error." }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
