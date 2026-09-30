"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";

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
  const supabase = useMemo(() => createClient(), []);

  const syncPrismaUser = useCallback(
    async (supabaseUser: { id: string; email?: string; user_metadata?: Record<string, any> }) => {
      if (!supabaseUser.email) return;
      try {
        await fetch("/api/auth/customer/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: supabaseUser.id,
            email: supabaseUser.email,
            name:
              supabaseUser.user_metadata?.full_name ||
              supabaseUser.user_metadata?.name ||
              supabaseUser.email.split("@")[0],
          }),
        });
      } catch {
        // Background sync error non-fatal
      }
    },
    [],
  );

  // Initialize session and listen for auth state changes
  useEffect(() => {
    let mounted = true;

    async function getInitialUser() {
      // 1. Check local session cookie first (/api/auth/customer/me)
      try {
        const res = await fetch("/api/auth/customer/me");
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.user && mounted) {
            setUser({
              id: data.user.id,
              name: data.user.name || data.user.email?.split("@")[0] || "Member",
              email: data.user.email,
              role: data.user.role || "CUSTOMER",
            });
            setIsLoading(false);
            return;
          }
        }
      } catch {}

      // 2. Check Supabase session
      try {
        const {
          data: { user: sbUser },
        } = await supabase.auth.getUser();

        if (mounted) {
          if (sbUser && sbUser.email) {
            const formatted: Customer = {
              id: sbUser.id,
              name:
                sbUser.user_metadata?.full_name ||
                sbUser.user_metadata?.name ||
                sbUser.email.split("@")[0] ||
                "Member",
              email: sbUser.email,
              role: (sbUser.user_metadata?.role as string) || "CUSTOMER",
            };
            setUser(formatted);
            syncPrismaUser(sbUser);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load Supabase auth session:", err);
      }

      if (mounted) {
        setUser(null);
        setIsLoading(false);
      }
    }

    getInitialUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email) {
        const formatted: Customer = {
          id: session.user.id,
          name:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email.split("@")[0] ||
            "Member",
          email: session.user.email,
          role: (session.user.user_metadata?.role as string) || "CUSTOMER",
        };
        setUser(formatted);
        if (typeof window !== "undefined") {
          localStorage.setItem("novixa_customer_email", session.user.email);
        }
        if (event === "SIGNED_IN") {
          syncPrismaUser(session.user);
        }
      } else {
        // If Supabase signed out, verify if local session still exists before setting null
        fetch("/api/auth/customer/me")
          .then((r) => r.json())
          .then((data) => {
            if (data?.ok && data?.user && mounted) {
              setUser({
                id: data.user.id,
                name: data.user.name || data.user.email?.split("@")[0] || "Member",
                email: data.user.email,
                role: data.user.role || "CUSTOMER",
              });
            } else if (mounted) {
              setUser(null);
              if (typeof window !== "undefined") {
                localStorage.removeItem("novixa_customer_email");
              }
            }
          })
          .catch(() => {
            if (mounted) setUser(null);
          });
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, syncPrismaUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const cleanEmail = email.trim().toLowerCase();
      try {
        // 1. Direct database session (fast & sets session cookie)
        const res = await fetch("/api/auth/customer/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        const data = await res.json().catch(() => ({ ok: false }));

        if (res.ok && data.ok && data.user) {
          const formatted: Customer = {
            id: data.user.id,
            name: data.user.name || cleanEmail.split("@")[0] || "Member",
            email: data.user.email,
            role: data.user.role || "CUSTOMER",
          };
          setUser(formatted);
          if (typeof window !== "undefined") {
            localStorage.setItem("novixa_customer_email", data.user.email);
          }
          // Non-blocking sync with Supabase Auth session in background
          supabase.auth.signInWithPassword({ email: cleanEmail, password }).catch(() => {});
          return { ok: true };
        }

        // 2. Fallback to Supabase Auth if database user didn't match (e.g. Google OAuth or Supabase created)
        const { data: sbData, error: sbError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!sbError && sbData?.user?.email) {
          const formatted: Customer = {
            id: sbData.user.id,
            name:
              sbData.user.user_metadata?.full_name ||
              sbData.user.user_metadata?.name ||
              sbData.user.email.split("@")[0] ||
              "Member",
            email: sbData.user.email,
            role: (sbData.user.user_metadata?.role as string) || "CUSTOMER",
          };
          setUser(formatted);
          if (typeof window !== "undefined") {
            localStorage.setItem("novixa_customer_email", sbData.user.email);
          }
          syncPrismaUser(sbData.user);
          return { ok: true };
        }

        return {
          ok: false,
          error: data.error || sbError?.message || "Invalid email or password.",
        };
      } catch (err: any) {
        return { ok: false, error: err.message || "An unexpected error occurred." };
      }
    },
    [supabase, syncPrismaUser],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
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
    },
    [],
  );

  const signInWithGoogle = useCallback(
    async (next = "/account") => {
      try {
        if (typeof window !== "undefined") {
          window.location.href = `/api/auth/customer/google?next=${encodeURIComponent(next)}`;
        }
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err.message || "Google sign-in failed." };
      }
    },
    [],
  );

  const resetPassword = useCallback(
    async (email: string) => {
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const redirectTo = `${origin}/account/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo,
        });

        if (error) {
          return { ok: false, error: error.message };
        }

        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err.message || "Password reset request failed." };
      }
    },
    [supabase],
  );

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    // Also clear any legacy cookies
    await fetch("/api/auth/customer/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("novixa_customer_email");
    }
  }, [supabase]);

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
