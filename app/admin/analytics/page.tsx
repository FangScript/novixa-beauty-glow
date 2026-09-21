"use client";

import { useEffect, useState } from "react";
import { AdminShell, MetricCard } from "@/components/admin";
import { Loader2, RefreshCw } from "lucide-react";

type Analytics = {
  revenue: number;
  orders: number;
  customers: number;
  lowStock: number;
  products: number;
  pendingOrders: number;
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = () => {
    setIsLoading(true);
    fetch("/api/admin/analytics")
      .then((res) => res.json())
      .then((d: Analytics) => setData(d))
      .catch((err) => console.warn("Failed to load analytics:", err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fmt = (n: number) => `Rs. ${n.toLocaleString("en-IN")}`;

  return (
    <AdminShell
      title="Analytics"
      description="Live operational aggregates from products, customers, orders, and inventory."
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-[#8f8279]">Live data from the store database</p>
        <button
          onClick={fetchAnalytics}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#8f5d48] hover:text-[#211b18] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {isLoading && !data ? (
        <div className="flex items-center gap-2 py-12 text-xs text-[#8f8279]">
          <Loader2 size={15} className="animate-spin text-[#c9a982]" />
          Loading live metrics…
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Gross Revenue"
              value={fmt(data.revenue)}
              detail="From paid orders"
              tone="dark"
            />
            <MetricCard
              label="Total Orders"
              value={String(data.orders)}
              detail={`${data.pendingOrders} pending fulfilment`}
            />
            <MetricCard
              label="Registered Customers"
              value={String(data.customers)}
              detail="Active store profiles"
            />
            <MetricCard
              label="Active Products"
              value={String(data.products)}
              detail="Listed in catalogue"
            />
            <MetricCard
              label="Low Stock Alerts"
              value={String(data.lowStock)}
              detail="Products with ≤8 units"
            />
            <MetricCard
              label="Pending Orders"
              value={String(data.pendingOrders)}
              detail="Awaiting confirmation"
            />
          </div>

          {data.revenue === 0 && data.orders === 0 && (
            <div className="mt-8 border border-[#d9cec5] bg-white/40 px-6 py-8 text-center">
              <p className="font-display text-2xl text-foreground">Store Metrics Ready</p>
              <p className="mt-2 text-xs text-[#776a61] max-w-sm mx-auto">
                Analytics will populate as customers place orders. Revenue reflects only paid/authorised transactions.
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-[#8f8279]">Could not load analytics data.</p>
      )}
    </AdminShell>
  );
}
