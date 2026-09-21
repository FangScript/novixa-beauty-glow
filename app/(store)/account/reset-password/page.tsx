"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Lock, Eye, EyeOff } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase sends the token via URL hash — calling getSession() picks it up automatically
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        setStatus({
          type: "error",
          message: "This reset link has expired or is invalid. Please request a new one.",
        });
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (password.length < 8) {
      setStatus({ type: "error", message: "Password must be at least 8 characters." });
      return;
    }
    if (password !== confirm) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setStatus({ type: "error", message: error.message });
      } else {
        setStatus({
          type: "success",
          message: "Password updated successfully! Redirecting to sign in…",
        });
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch {
      setStatus({ type: "error", message: "An unexpected error occurred. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageShell eyebrow="Account Security" title="Set New Password">
      <div className="mt-8 max-w-md">
        {status && (
          <div
            className={`mb-5 flex items-start gap-2 border px-4 py-3 text-xs ${
              status.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-[#c9765d] bg-[#fbf0ec] text-[#8f2d18]"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
            )}
            {status.message}
          </div>
        )}

        {sessionReady && status?.type !== "success" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                required
                type={showPassword ? "text" : "password"}
                placeholder="New password (min. 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full border border-border bg-white/50 pl-9 pr-10 text-sm outline-none focus:border-rosewood transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="relative">
              <Lock
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                required
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-11 w-full border border-border bg-white/50 pl-9 pr-10 text-sm outline-none focus:border-rosewood transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Toggle confirm visibility"
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <Button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-none bg-ink py-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-black"
            >
              {isSaving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin" /> Updating…
                </span>
              ) : (
                "SET NEW PASSWORD"
              )}
            </Button>
          </form>
        ) : !sessionReady && !status ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={14} className="animate-spin text-rosewood" />
            Verifying reset link…
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 size={24} className="animate-spin text-rosewood" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
