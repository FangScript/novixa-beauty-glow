"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.error || "Invalid administrator email or password.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Unable to reach the authentication service. Please check database connectivity.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#211b18] px-5 py-12 text-[#f8f2ec]">
      <section className="w-full max-w-md border border-white/15 bg-[#2d231f] p-7 md:p-10 shadow-2xl">
        <p className="font-display text-4xl tracking-wide">NOVIXA</p>
        <p className="mt-1 text-[9px] uppercase tracking-[0.25em] text-[#c9a982]">
          Commerce Console
        </p>

        <div className="mt-10">
          <p className="text-[9px] uppercase tracking-[0.22em] text-[#c9a982]">Secure Access</p>
          <h1 className="mt-2 font-display text-4xl">Admin Sign In</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Sign in with your verified administrator credentials to access store operations.
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-xs text-white/70">
            Administrator Email
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-11 w-full border border-white/20 bg-white/5 px-3 text-sm text-white outline-none focus:border-[#c9a982]"
              placeholder="admin@example.com"
            />
          </label>

          <label className="block text-xs text-white/70">
            Password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-11 w-full border border-white/20 bg-white/5 px-3 text-sm text-white outline-none focus:border-[#c9a982]"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="border border-[#b86d5a] bg-[#5a3028] p-3 text-xs text-[#ffe1d7]"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={busy}
            className="h-11 w-full rounded-none bg-[#c9a982] text-[10px] uppercase tracking-[0.16em] text-[#211b18] hover:bg-[#e0c39d] font-semibold"
          >
            {busy ? "Signing in…" : "Sign In Securely"}
          </Button>
        </form>

        <p className="mt-8 border-t border-white/10 pt-5 text-[10px] leading-5 text-white/45">
          Sessions expire after 8 hours. Admin mutations are attributed to the authenticated
          identity.
        </p>
      </section>
    </main>
  );
}
