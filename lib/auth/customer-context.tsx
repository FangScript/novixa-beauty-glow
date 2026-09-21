"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type Customer = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type CustomerAuthContextType = {
  user: Customer | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthContextType | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    fetch("/api/auth/customer/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/customer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.ok && data.user) {
      setUser(data.user);
      // Persist email for guest order lookup upgrade
      if (typeof window !== "undefined") {
        localStorage.setItem("novixa_customer_email", data.user.email);
      }
      return { ok: true };
    }
    return { ok: false, error: data.error || "Login failed." };
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch("/api/auth/customer/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (data.ok && data.user) {
      setUser(data.user);
      if (typeof window !== "undefined") {
        localStorage.setItem("novixa_customer_email", data.user.email);
      }
      return { ok: true };
    }
    return { ok: false, error: data.error || "Registration failed." };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/customer/logout", { method: "POST" });
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("novixa_customer_email");
    }
  }, []);

  return (
    <CustomerAuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used inside <CustomerAuthProvider>");
  return ctx;
}
