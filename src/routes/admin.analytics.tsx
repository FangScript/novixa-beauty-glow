import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell, MetricCard } from "@/components/admin";
import { getAdminAnalytics } from "@/lib/admin-service";
export const Route = createFileRoute("/admin/analytics")({ component: AdminAnalytics });
type Analytics = {
  orders: number;
  products: number;
  customers: number;
  lowStock: number;
  revenue: number;
};
function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  useEffect(() => {
    getAdminAnalytics().then(setData);
  }, []);
  return (
    <AdminShell
      title="Analytics"
      description="Live operational aggregates from products, customers, orders, and inventory."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue"
          value={data ? `Rs. ${data.revenue.toLocaleString("en-IN")}` : "—"}
          detail="Paid orders"
          tone="dark"
        />
        <MetricCard
          label="Orders"
          value={data ? String(data.orders) : "—"}
          detail="All database orders"
        />
        <MetricCard
          label="Customers"
          value={data ? String(data.customers) : "—"}
          detail="Registered accounts"
        />
        <MetricCard
          label="Low stock"
          value={data ? String(data.lowStock) : "—"}
          detail={`${data?.products ?? "—"} active SKUs`}
        />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="border border-[#d9cec5] bg-white/60 p-6">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f5d48]">Database health</p>
          <h2 className="mt-2 font-display text-3xl">Commerce records</h2>
          <div className="mt-6 space-y-3 text-sm text-[#776a61]">
            <div className="flex justify-between border-b border-[#e7ddd5] pb-3">
              <span>Products</span>
              <span>{data?.products ?? "Loading…"}</span>
            </div>
            <div className="flex justify-between border-b border-[#e7ddd5] pb-3">
              <span>Customers</span>
              <span>{data?.customers ?? "Loading…"}</span>
            </div>
            <div className="flex justify-between border-b border-[#e7ddd5] pb-3">
              <span>Orders</span>
              <span>{data?.orders ?? "Loading…"}</span>
            </div>
          </div>
        </section>
        <section className="border border-[#d9cec5] bg-white/60 p-6">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f5d48]">
            Next instrumentation
          </p>
          <h2 className="mt-2 font-display text-3xl">Event readiness</h2>
          <p className="mt-6 text-sm leading-6 text-[#776a61]">
            Revenue and operational metrics are database-backed. Product views, searches,
            add-to-cart, checkout, and payment events can be added once the event stream is
            connected.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
