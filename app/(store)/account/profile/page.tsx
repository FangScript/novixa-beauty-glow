"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";

export default function AccountProfilePage() {
  const [saved, setSaved] = useState(false);

  return (
    <PageShell eyebrow="Account" title="Personal Profile">
      <form
        className="mt-8 max-w-xl space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
        }}
      >
        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
          Full Name
          <input
            required
            defaultValue="Valued Customer"
            className="mt-2 h-11 w-full border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
          Email Address
          <input
            required
            type="email"
            defaultValue="hello@novixa.co"
            className="mt-2 h-11 w-full border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
          Contact Phone
          <input
            type="tel"
            defaultValue="+91 98765 43210"
            className="mt-2 h-11 w-full border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
          />
        </label>
        <div className="pt-2">
          <Button type="submit" className="rounded-none bg-ink text-white hover:bg-black px-7 text-[10px] tracking-[0.14em]">
            SAVE CHANGES
          </Button>
        </div>
        {saved && (
          <p className="text-xs text-rosewood font-medium">Profile changes saved successfully.</p>
        )}
      </form>
      <div className="mt-10">
        <Button asChild variant="ghost" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <Link href="/account" className="inline-flex items-center gap-2">
            <ArrowLeft size={14} /> Back to account
          </Link>
        </Button>
      </div>
    </PageShell>
  );
}
