"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type Customer = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type CustomerAuthContextType = {
  user: Customer | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  signInWithGoogle: (next?: string) => Promise<{ ok: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthContextType | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Database sessions are the single authority; external provider metadata never authorizes APIs.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/customer/me", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!controller.signal.aborted) setUser(data.ok ? data.user : null);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);
  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok)
        return { ok: false, error: data.error || "Invalid email or password." };
      setUser(data.user);
      return { ok: true };
    } catch {
      return { ok: false, error: "Sign in is temporarily unavailable." };
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    try {
      // Direct database registration (creates user, session cookie, and logs in immediately without confirmation email)
      const res = await fetch("/api/auth/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, email: cleanEmail, password }),
      });

      const data = await res.json().catch(() => ({ ok: false }));

      if (res.ok && data.ok && data.user) {
        const formatted: Customer = {
          id: data.user.id,
          name: data.user.name || cleanName,
          email: data.user.email,
          role: "CUSTOMER",
        };
        setUser(formatted);
        if (typeof window !== "undefined") {
          localStorage.setItem("novixa_customer_email", data.user.email);
        }
        return { ok: true };
      }

      if (data.error) {
        return { ok: false, error: data.error };
      }

      return { ok: false, error: "Registration failed. Please try again." };
    } catch (err: any) {
      return { ok: false, error: err.message || "Registration failed." };
    }
  }, []);

  const signInWithGoogle = useCallback(async (next = "/account") => {
    try {
      if (typeof window !== "undefined") {
        window.location.href = `/api/auth/customer/google?next=${encodeURIComponent(next)}`;
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || "Google sign-in failed." };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const response = await fetch("/api/auth/customer/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok)
        return { ok: false, error: result.error || "Unable to request a reset." };

      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || "Password reset request failed." };
    }
  }, []);

  const logout = useCallback(async () => {
    const response = await fetch("/api/auth/customer/logout", { method: "POST" });
    if (!response.ok) throw new Error("Unable to sign out. Please try again.");
    setUser(null);
    localStorage.removeItem("novixa_customer_email");
  }, []);

  return (
    <CustomerAuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        signInWithGoogle,
        resetPassword,
        logout,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used inside <CustomerAuthProvider>");
  return ctx;
}
