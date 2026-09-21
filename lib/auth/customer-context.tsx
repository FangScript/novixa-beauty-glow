"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
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
  const supabase = createClient();

  const syncPrismaUser = useCallback(async (supabaseUser: { id: string; email?: string; user_metadata?: Record<string, any> }) => {
    if (!supabaseUser.email) return;
    try {
      await fetch("/api/auth/customer/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || supabaseUser.email.split("@")[0],
        }),
      });
    } catch {
      // Background sync error non-fatal
    }
  }, []);

  // Initialize session and listen for auth state changes
  useEffect(() => {
    let mounted = true;

    async function getInitialUser() {
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
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Failed to load Supabase auth session:", err);
      } finally {
        if (mounted) setIsLoading(false);
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
        setUser(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("novixa_customer_email");
        }
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
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          return { ok: false, error: error.message };
        }

        if (data.user?.email) {
          const formatted: Customer = {
            id: data.user.id,
            name:
              data.user.user_metadata?.full_name ||
              data.user.user_metadata?.name ||
              data.user.email.split("@")[0] ||
              "Member",
            email: data.user.email,
            role: (data.user.user_metadata?.role as string) || "CUSTOMER",
          };
          setUser(formatted);
          if (typeof window !== "undefined") {
            localStorage.setItem("novixa_customer_email", data.user.email);
          }
          syncPrismaUser(data.user);
          return { ok: true };
        }
        return { ok: false, error: "Sign in failed. Please check credentials." };
      } catch (err: any) {
        return { ok: false, error: err.message || "An unexpected error occurred." };
      }
    },
    [supabase, syncPrismaUser]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              role: "CUSTOMER",
            },
          },
        });

        if (error) {
          return { ok: false, error: error.message };
        }

        if (data.user?.email) {
          const formatted: Customer = {
            id: data.user.id,
            name: name.trim(),
            email: data.user.email,
            role: "CUSTOMER",
          };
          setUser(formatted);
          if (typeof window !== "undefined") {
            localStorage.setItem("novixa_customer_email", data.user.email);
          }
          syncPrismaUser({ ...data.user, user_metadata: { full_name: name } });
          return { ok: true };
        }

        return {
          ok: true,
          error: "Account created! Please check your email to confirm your account.",
        };
      } catch (err: any) {
        return { ok: false, error: err.message || "An unexpected error occurred." };
      }
    },
    [supabase, syncPrismaUser]
  );

  const signInWithGoogle = useCallback(
    async (next = "/account") => {
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
            queryParams: {
              access_type: "offline",
              prompt: "consent",
            },
          },
        });

        if (error) {
          return { ok: false, error: error.message };
        }

        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err.message || "Google sign-in failed." };
      }
    },
    [supabase]
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
    [supabase]
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
