import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell, AdminStatus } from "@/components/admin";
import { getAdminSettings } from "@/lib/admin-service";
export const Route = createFileRoute("/admin/settings")({ component: AdminSettings });
type Settings = {
  admin: { name: string; email: string };
  database: boolean;
  payments: boolean;
  email: boolean;
  media: boolean;
};
function AdminSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    getAdminSettings().then(setSettings);
  }, []);
  const items = [
    { label: "PostgreSQL database", value: settings?.database },
    { label: "Payment provider", value: settings?.payments },
    { label: "Email delivery", value: settings?.email },
    { label: "Media storage", value: settings?.media },
  ];
  return (
    <AdminShell
      title="Settings"
      description="Review the authenticated administrator and configured service integrations."
    >
      <section className="border border-[#d9cec5] bg-white/60 p-6">
        <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f5d48]">
          Administrator identity
        </p>
        <h2 className="mt-2 font-display text-3xl">{settings?.admin.name ?? "Loading…"}</h2>
        <p className="mt-2 text-sm text-[#776a61]">{settings?.admin.email ?? ""}</p>
      </section>
      <section className="mt-6 border border-[#d9cec5] bg-white/60 p-6">
        <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f5d48]">Integrations</p>
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between border-b border-[#e7ddd5] pb-3 text-sm"
            >
              <span>{item.label}</span>
              <AdminStatus tone={item.value ? "positive" : "warning"}>
                {item.value ? "Connected" : "Not configured"}
              </AdminStatus>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
