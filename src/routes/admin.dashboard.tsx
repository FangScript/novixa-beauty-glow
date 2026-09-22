import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { AdminShell, MetricCard } from "@/components/admin";
export const Route = createFileRoute("/admin/dashboard")({ component: AdminDashboard });
function AdminDashboard() {
  return (
    <AdminShell
      title="Dashboard"
      description="Your operational dashboard is ready for live metrics once authentication and the database are connected."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Gross sales"
          value="£28,450"
          detail="Development preview"
          tone="dark"
        />
        <MetricCard label="Orders" value="184" detail="Development preview" />
        <MetricCard label="Customers" value="1,248" detail="Development preview" />
        <MetricCard label="Low stock" value="7" detail="Development preview" />
      </div>
      <div className="mt-8 border border-[#d9cec5] bg-white/60 p-6">
        <h2 className="font-display text-3xl">Connect your data layer</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#776a61]">
          This dashboard is intentionally built against the same product and commerce abstractions
          as the storefront. The next backend phase can replace the preview metrics with
          PostgreSQL-backed queries without changing the admin shell.
        </p>
        <Link
          to="/admin/settings"
          className="mt-6 inline-flex bg-[#211b18] px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-white"
        >
          Review integrations
        </Link>
      </div>
    </AdminShell>
  );
}
