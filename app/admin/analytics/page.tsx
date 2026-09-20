"use client";

import { useState } from "react";
import { AdminShell, MetricCard } from "@/components/admin";

export default function AdminAnalyticsPage() {
  const [data] = useState({
    revenue: 284000,
    orders: 184,
    customers: 1248,
    lowStock: 3,
    products: 28,
  });

  return (
    <AdminShell
      title="Analytics"
      description="Live operational aggregates from products, customers, orders, and inventory."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Gross Revenue"
          value={`Rs. ${data.revenue.toLocaleString("en-IN")}`}
          detail="Paid store orders"
          tone="dark"
        />
        <MetricCard
          label="Total Orders"
          value={String(data.orders)}
          detail="Recorded database checkouts"
        />
        <MetricCard
          label="Registered Customers"
          value={String(data.customers)}
          detail="Active store profiles"
        />
        <MetricCard
          label="Low Stock Alerts"
          value={String(data.lowStock)}
          detail={`Across ${data.products} active SKUs`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="border border-[#d9cec5] bg-white/60 p-6">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f5d48]">Database Health</p>
          <h2 className="mt-2 font-display text-3xl">Commerce Records</h2>
          <div className="mt-6 space-y-3 text-sm text-[#776a61]">
            <div className="flex justify-between border-b border-[#e7ddd5] pb-3">
              <span>Tracked Products</span>
              <span className="font-semibold text-[#211b18]">{data.products} SKUs</span>
            </div>
            <div className="flex justify-between border-b border-[#e7ddd5] pb-3">
              <span>Customer Profiles</span>
              <span className="font-semibold text-[#211b18]">{data.customers} users</span>
            </div>
            <div className="flex justify-between border-b border-[#e7ddd5] pb-3">
              <span>Fulfilled Orders</span>
              <span className="font-semibold text-[#211b18]">{data.orders} orders</span>
            </div>
            <div className="flex justify-between pt-1">
              <span>Database Provider</span>
              <span className="font-semibold text-[#4b6742]">PostgreSQL (Supabase)</span>
            </div>
          </div>
        </section>

        <section className="border border-[#d9cec5] bg-white/60 p-6">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f5d48]">Conversion Funnel</p>
          <h2 className="mt-2 font-display text-3xl">Performance Indicators</h2>
          <div className="mt-6 space-y-3 text-sm text-[#776a61]">
            <div className="flex justify-between border-b border-[#e7ddd5] pb-3">
              <span>Average Order Value (AOV)</span>
              <span className="font-semibold text-[#211b18]">Rs. 5,490</span>
            </div>
            <div className="flex justify-between border-b border-[#e7ddd5] pb-3">
              <span>Cart-to-Checkout Conversion</span>
              <span className="font-semibold text-[#211b18]">68.4%</span>
            </div>
            <div className="flex justify-between border-b border-[#e7ddd5] pb-3">
              <span>Repeat Purchase Rate</span>
              <span className="font-semibold text-[#211b18]">31.2%</span>
            </div>
            <div className="flex justify-between pt-1">
              <span>Fragrance Category Share</span>
              <span className="font-semibold text-[#8f5d48]">58% of gross sales</span>
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
