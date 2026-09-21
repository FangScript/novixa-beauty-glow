"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { useCustomerAuth } from "@/lib/auth/customer-context";
import { createClient } from "@/utils/supabase/client";

export default function AccountProfilePage() {
  const { user, isLoading: authLoading } = useCustomerAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Pre-fill from auth context when user is available
  useEffect(() => {
    if (user) {
      setFullName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!fullName.trim()) {
      setStatus({ type: "error", message: "Full name cannot be empty." });
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });

      if (error) {
        setStatus({ type: "error", message: error.message });
      } else {
        setStatus({ type: "success", message: "Profile updated successfully." });
      }
    } catch {
      setStatus({ type: "error", message: "An unexpected error occurred. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <PageShell eyebrow="Account" title="Personal Profile">
        <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 size={15} className="animate-spin text-rosewood" />
          Loading profile…
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Account" title="Personal Profile">
      <form className="mt-8 max-w-xl space-y-5" onSubmit={handleSubmit}>
        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
          Full Name
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="mt-2 h-11 w-full border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood transition-colors"
          />
        </label>

        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
          Email Address
          <input
            type="email"
            value={email}
            disabled
            readOnly
            className="mt-2 h-11 w-full border border-border bg-white/20 px-3 text-sm text-muted-foreground cursor-not-allowed"
          />
          <span className="mt-1 text-[10px] text-muted-foreground font-normal normal-case tracking-normal">
            Email cannot be changed here. Contact support if needed.
          </span>
        </label>

        {status && (
          <div
            className={`flex items-start gap-2 border px-4 py-3 text-xs ${
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
            <span>{status.message}</span>
          </div>
        )}

        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSaving}
            className="rounded-none bg-ink text-white hover:bg-black px-7 text-[10px] tracking-[0.14em]"
          >
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" /> Saving…
              </span>
            ) : (
              "SAVE CHANGES"
            )}
          </Button>
        </div>
      </form>

      <div className="mt-10">
        <Button
          asChild
          variant="ghost"
          className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <Link href="/account" className="inline-flex items-center gap-2">
            <ArrowLeft size={14} /> Back to account
          </Link>
        </Button>
      </div>
    </PageShell>
  );
}
