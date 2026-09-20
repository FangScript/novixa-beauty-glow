import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { loginAdmin } from "@/lib/auth";

export const Route = createFileRoute("/admin/login")({ component: AdminLogin });

function AdminLogin() {
  const navigate = useNavigate();
  const login = useServerFn(loginAdmin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await login({ data: { email, password } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await navigate({ to: "/admin" });
    } catch {
      setError("Unable to reach the authentication service. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#211b18] px-5 py-12 text-[#f8f2ec]">
      <section className="w-full max-w-md border border-white/15 bg-[#2d231f] p-7 md:p-10">
        <p className="font-display text-4xl">NOVIXA</p>
        <p className="mt-1 text-[9px] uppercase tracking-[0.25em] text-[#c9a982]">
          Commerce console
        </p>
        <div className="mt-12">
          <p className="text-[9px] uppercase tracking-[0.22em] text-[#c9a982]">Secure access</p>
          <h1 className="mt-2 font-display text-4xl">Admin sign in</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Sign in with an administrator account to manage the NOVIXA store.
          </p>
        </div>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-xs text-white/70">
            Administrator email
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
            className="h-11 w-full rounded-none bg-[#c9a982] text-[10px] uppercase tracking-[0.16em] text-[#211b18] hover:bg-[#e0c39d]"
          >
            {busy ? "Signing in…" : "Sign in securely"}
          </Button>
        </form>
        <p className="mt-8 border-t border-white/10 pt-5 text-[10px] leading-5 text-white/45">
          Sessions expire after 8 hours. Admin actions are recorded with the authenticated
          administrator identity.
        </p>
      </section>
    </main>
  );
}
