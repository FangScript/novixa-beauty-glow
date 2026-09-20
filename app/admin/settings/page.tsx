"use client";

import { useEffect, useState } from "react";
import { AdminShell, AdminStatus } from "@/components/admin";

export default function AdminSettingsPage() {
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.admin) setAdmin(data.admin);
      })
      .catch(() => undefined);
  }, []);

  const items = [
    { label: "PostgreSQL database (Supabase)", connected: true },
    { label: "Payment provider (Stripe/Card)", connected: false },
    { label: "Transactional email (Resend/SMTP)", connected: false },
    { label: "Cloud media storage (S3/R2)", connected: false },
  ];

  return (
    <AdminShell
      title="Settings"
      description="Review administrator profile, database health, and external service integrations."
    >
      <section className="border border-[#d9cec5] bg-white/60 p-6">
        <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f5d48]">
          Administrator Identity
        </p>
        <h2 className="mt-2 font-display text-3xl">
          {admin?.name ?? "NOVIXA Administrator"}
        </h2>
        <p className="mt-1 text-sm text-[#776a61]">
          {admin?.email ?? "novixaretail@gmail.com"} · Role: <strong className="text-foreground">ADMIN</strong>
        </p>
      </section>

      <section className="mt-6 border border-[#d9cec5] bg-white/60 p-6">
        <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f5d48]">Service Integrations</p>
        <div className="mt-5 space-y-3.5">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between border-b border-[#e7ddd5] pb-3.5 text-sm"
            >
              <span className="font-medium text-[#211b18]">{item.label}</span>
              <AdminStatus tone={item.connected ? "positive" : "warning"}>
                {item.connected ? "Connected" : "Not configured"}
              </AdminStatus>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
