import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import {
  AdminShell,
  MetricCard,
  TableCell,
  TableHeader,
  AdminTable,
} from "@/components/admin";
import { products } from "@/lib/products/catalogue";

export const metadata = {
  title: "Admin Overview",
};

export default function AdminOverviewPage() {
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
        <section className="border border-[#d9cec5] bg-white/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f5d48]">Performance</p>
              <h2 className="mt-2 font-display text-3xl">Sales Overview</h2>
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

        <section className="border border-[#d9cec5] bg-white/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f5d48]">Attention</p>
              <h2 className="mt-2 font-display text-3xl">Quick Actions</h2>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <Link
              href="/admin/inventory"
              className="flex items-center justify-between border border-[#d9cec5] p-4 text-sm hover:border-[#8f5d48] transition-colors"
            >
              <span>Review low stock items</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/admin/orders"
              className="flex items-center justify-between border border-[#d9cec5] p-4 text-sm hover:border-[#8f5d48] transition-colors"
            >
              <span>Process open orders</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/admin/products"
              className="flex items-center justify-between border border-[#d9cec5] p-4 text-sm hover:border-[#8f5d48] transition-colors"
            >
              <span>Update catalogue & SKUs</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#8f5d48]">Catalogue</p>
            <h2 className="mt-2 font-display text-3xl">Recent Products</h2>
          </div>
          <Link href="/admin/products" className="text-xs text-[#8f5d48] underline hover:text-black">
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
            <th className="px-4 py-3 text-right">Stock</th>
          </TableHeader>
          {products.slice(0, 5).map((product) => (
            <tr key={product.id} className="border-b border-[#e7ddd5] last:border-0 hover:bg-black/[0.02]">
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{product.category}</TableCell>
              <TableCell>{product.gender}</TableCell>
              <TableCell>Rs. {product.price.toLocaleString("en-IN")}</TableCell>
              <TableCell>
                <span className="bg-[#dfe8d9] text-[#4b6742] px-2 py-0.5 text-[9px] uppercase">
                  Active
                </span>
              </TableCell>
              <TableCell className="text-right font-medium">{product.stock}</TableCell>
            </tr>
          ))}
        </AdminTable>
      </section>
    </AdminShell>
  );
}
