import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, MetricCard } from "@/components/admin";
export const Route = createFileRoute("/admin/analytics")({ component: AdminAnalytics });
function AdminAnalytics() {
  return (
    <AdminShell
      title="Analytics"
      description="Track the signals that will later be backed by event and order data."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Revenue" value="Rs. 2.84L" detail="Last 30 days" tone="dark" />
        <MetricCard label="Conversion" value="3.8%" detail="+0.6% month over month" />
        <MetricCard label="AOV" value="Rs. 3,842" detail="Average order value" />
        <MetricCard label="Top category" value="Perfume" detail="48% of sales" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="border border-[#d9cec5] bg-white/60 p-6">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f5d48]">Revenue mix</p>
          <h2 className="mt-2 font-display text-3xl">By category</h2>
          <div className="mt-8 space-y-5">
            {[
              ["Perfumes", 48],
              ["Makeup", 24],
              ["Bundles", 18],
              ["Grooming", 10],
            ].map(([label, percent]) => (
              <div key={label}>
                <div className="flex justify-between text-xs">
                  <span>{label}</span>
                  <span>{percent}%</span>
                </div>
                <div className="mt-2 h-2 bg-[#e5ddd5]">
                  <div className="h-2 bg-[#8f5d48]" style={{ width: `${percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="border border-[#d9cec5] bg-white/60 p-6">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f5d48]">Event readiness</p>
          <h2 className="mt-2 font-display text-3xl">Tracking plan</h2>
          <div className="mt-6 space-y-3 text-sm text-[#776a61]">
            {[
              "Product views",
              "Searches",
              "Add to cart",
              "Checkout starts",
              "Coupon attempts",
              "Payment outcomes",
            ].map((event) => (
              <div
                key={event}
                className="flex items-center justify-between border-b border-[#e7ddd5] pb-3"
              >
                <span>{event}</span>
                <span className="text-[9px] uppercase text-[#a0783d]">Ready for API</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
