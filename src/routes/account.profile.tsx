import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/storefront";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/account/profile")({ component: Profile });
function Profile() {
  const [saved, setSaved] = useState(false);
  return (
    <PageShell eyebrow="Account" title="Profile">
      <form
        className="mt-10 max-w-xl space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
        }}
      >
        <label className="block text-xs uppercase tracking-[0.12em]">
          Full name
          <input
            required
            className="mt-2 h-11 w-full border border-border bg-transparent px-3 text-sm"
            defaultValue=""
          />
        </label>
        <label className="block text-xs uppercase tracking-[0.12em]">
          Email
          <input
            required
            type="email"
            className="mt-2 h-11 w-full border border-border bg-transparent px-3 text-sm"
          />
        </label>
        <label className="block text-xs uppercase tracking-[0.12em]">
          Phone
          <input
            type="tel"
            className="mt-2 h-11 w-full border border-border bg-transparent px-3 text-sm"
          />
        </label>
        <Button className="rounded-none text-[10px] tracking-[0.14em]">SAVE CHANGES</Button>
        {saved && (
          <p className="text-xs text-rosewood">Profile changes saved locally for this session.</p>
        )}
      </form>
    </PageShell>
  );
}
