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
    try {
      const storedToken = localStorage.getItem("sovereign_token");
      const storedUser = localStorage.getItem("sovereign_user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      localStorage.removeItem("sovereign_token");
      localStorage.removeItem("sovereign_user");
    } finally {
      setLoading(false);
    }
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

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("sovereign_token", newToken);
    localStorage.setItem("sovereign_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("sovereign_token");
    localStorage.removeItem("sovereign_user");
    router.push("/login");
  };

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      if (res.status === 401) {
        logout();
      }

      return res;
    } catch (err) {
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
