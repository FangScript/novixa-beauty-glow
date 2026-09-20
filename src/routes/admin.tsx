import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { ArrowRight, TrendingUp } from "lucide-react";
import {
  AdminShell,
  MetricCard,
  TableCell,
  TableHeader,
  AdminTable,
  adminProducts,
} from "@/components/admin";
import { getCurrentAdmin } from "@/lib/auth";
export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/admin/login" || location.pathname === "/admin/unauthorized") return;
    const admin = await getCurrentAdmin();
    if (!admin) throw redirect({ to: "/admin/login" });
    return { admin };
  },
  component: AdminOverview,
});
function AdminOverview() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname !== "/admin" && pathname !== "/admin/") return <Outlet />;
  return (
    <AdminShell
      title="Overview"
      description="A clear view of your store health, customer activity, and operational priorities."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Gross sales"
          value="Rs. 2.84L"
          detail="+18.4% from last month"
          tone="dark"
        />
        <MetricCard label="Orders" value="184" detail="12 awaiting fulfilment" />
        <MetricCard label="Customers" value="1,248" detail="86 new this month" />
        <MetricCard label="Low stock" value="7" detail="Needs attention today" />
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="border border-[#d9cec5] bg-white/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f5d48]">Performance</p>
              <h2 className="mt-2 font-display text-3xl">Sales overview</h2>
            </div>
            <TrendingUp className="text-[#8f5d48]" />
          </div>
          <div className="mt-8 flex h-48 items-end gap-2 border-b border-l border-[#d9cec5] px-3 pb-0 pt-5">
            {[35, 48, 42, 64, 56, 76, 68, 88, 72, 96, 82, 100].map((height, index) => (
              <div
                key={index}
                className="group relative flex-1 bg-[#c9a982] transition-colors hover:bg-[#8f5d48]"
                style={{ height: `${height}%` }}
              >
                <span className="absolute -top-5 left-1/2 hidden -translate-x-1/2 text-[9px] text-[#776a61] group-hover:block">
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[9px] uppercase tracking-[0.12em] text-[#8f8279]">
            <span>Jan</span>
            <span>Dec</span>
          </div>
        </section>
        <section className="border border-[#d9cec5] bg-white/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f5d48]">Attention</p>
              <h2 className="mt-2 font-display text-3xl">Quick actions</h2>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <Link
              to="/admin/inventory"
              className="flex items-center justify-between border border-[#d9cec5] p-4 text-sm hover:border-[#8f5d48]"
            >
              <span>Review low stock</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              to="/admin/orders"
              className="flex items-center justify-between border border-[#d9cec5] p-4 text-sm hover:border-[#8f5d48]"
            >
              <span>Process open orders</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              to="/admin/products"
              className="flex items-center justify-between border border-[#d9cec5] p-4 text-sm hover:border-[#8f5d48]"
            >
              <span>Update catalogue</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </div>
      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f5d48]">Catalogue</p>
            <h2 className="mt-2 font-display text-3xl">Recent products</h2>
          </div>
          <Link to="/admin/products" className="text-xs text-[#8f5d48] underline">
            View all
          </Link>
        </div>
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Gender</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </TableHeader>
          {adminProducts.slice(0, 5).map((product) => (
            <tr key={product.id} className="border-b border-[#e7ddd5] last:border-0">
              <TableCell>{product.name}</TableCell>
              <TableCell>{product.category}</TableCell>
              <TableCell>{product.gender}</TableCell>
              <TableCell>Rs. {product.price.toLocaleString("en-IN")}</TableCell>
              <TableCell>Active</TableCell>
              <TableCell className="text-right">{product.stock}</TableCell>
            </tr>
          ))}
        </AdminTable>
      </section>
    </AdminShell>
  );
}
