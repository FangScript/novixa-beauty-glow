import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/admin/settings")({ component: AdminSettings });
function AdminSettings() {
  return (
    <AdminShell
      title="Settings"
      description="Prepare store policies, operational integrations, and administrator preferences."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-[#d9cec5] bg-white/60 p-6">
          <h2 className="font-display text-3xl">Store profile</h2>
          <div className="mt-5 space-y-4">
            <label className="block text-xs uppercase tracking-[0.12em]">
              Store name
              <input
                defaultValue="NOVIXA"
                className="mt-2 h-10 w-full border border-[#d9cec5] bg-transparent px-3 text-sm"
              />
            </label>
            <label className="block text-xs uppercase tracking-[0.12em]">
              Support email
              <input
                defaultValue="hello@novixa.co"
                className="mt-2 h-10 w-full border border-[#d9cec5] bg-transparent px-3 text-sm"
              />
            </label>
            <Button className="rounded-none text-[10px] uppercase tracking-[0.12em]">
              Save changes
            </Button>
          </div>
        </section>
        <section className="border border-[#d9cec5] bg-white/60 p-6">
          <h2 className="font-display text-3xl">Integrations</h2>
          <div className="mt-5 space-y-3">
            {[
              ["PostgreSQL", "Schema ready · connection pending"],
              ["Authentication", "Provider not configured"],
              ["Payments", "Provider not configured"],
              ["Email", "Provider not configured"],
            ].map(([name, status]) => (
              <div
                key={name}
                className="flex items-center justify-between border-b border-[#e7ddd5] pb-3 text-sm"
              >
                <span>{name}</span>
                <span className="text-xs text-[#a35742]">{status}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-[#776a61]">
            Integrations are intentionally displayed as unconfigured until credentials and webhook
            settings are supplied.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
