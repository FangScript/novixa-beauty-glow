import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { AdminShell, MetricCard, TableCell, TableHeader, AdminTable } from "@/components/admin";
import { products as seedProducts } from "@/lib/products/catalogue";
import { prisma } from "@/lib/db/client";

export const metadata = {
  title: "Admin Overview",
};

export default async function AdminOverviewPage() {
  let grossSales = 18450;
  let ordersCount = 184;
  let pendingOrdersCount = 12;
  let customersCount = 1248;
  let lowStockCount = 7;
  let recentProducts: Array<{
    id: string;
    name: string;
    category: string;
    gender: string;
    price: number;
    stock: number;
  }> = seedProducts.slice(0, 5);

  if (process.env.DATABASE_URL) {
    try {
      const [revAgg, oCount, pendingCount, uCount, lsCount, dbProducts] = await Promise.all([
        prisma.order.aggregate({
          _sum: { total: true },
          where: { paymentStatus: { in: ["PAID", "AUTHORIZED"] } },
        }),
        prisma.order.count(),
        prisma.order.count({ where: { status: "PENDING" } }),
        prisma.user.count({ where: { role: "CUSTOMER" } }),
        prisma.product.count({ where: { status: "ACTIVE", stock: { lte: 8 } } }),
        prisma.product.findMany({
          where: { status: { not: "ARCHIVED" } },
          orderBy: { updatedAt: "desc" },
          take: 5,
        }),
      ]);

      if (oCount > 0 || uCount > 0 || dbProducts.length > 0) {
        grossSales = revAgg._sum.total ?? 0;
        ordersCount = oCount;
        pendingOrdersCount = pendingCount;
        customersCount = uCount;
        lowStockCount = lsCount;

        if (dbProducts.length > 0) {
          recentProducts = dbProducts.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category.toLowerCase(),
            gender: p.gender.toLowerCase(),
            price: p.price,
            stock: p.stock,
          }));
        }
      }
    } catch (err) {
      console.warn("Could not load real-time admin metrics from DB:", err);
    }
  }

  const formatSales = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AdminShell
      title="Overview"
      description="A clear view of your store health, customer activity, and operational priorities."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Gross sales"
          value={formatSales(grossSales)}
          detail="Storewide recorded revenue"
          tone="dark"
        />
        <MetricCard
          label="Orders"
          value={ordersCount.toLocaleString("en-GB")}
          detail={`${pendingOrdersCount} awaiting fulfilment`}
        />
        <MetricCard
          label="Customers"
          value={customersCount.toLocaleString("en-GB")}
          detail="Active registered accounts"
        />
        <MetricCard
          label="Low stock"
          value={String(lowStockCount)}
          detail="Items requiring replenishment"
        />
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
          <Link
            href="/admin/products"
            className="text-xs text-[#8f5d48] underline hover:text-black"
          >
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
          {recentProducts.map((product) => (
            <tr
              key={product.id}
              className="border-b border-[#e7ddd5] last:border-0 hover:bg-black/[0.02]"
            >
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="capitalize">{product.category}</TableCell>
              <TableCell className="capitalize">{product.gender}</TableCell>
              <TableCell>£{product.price}</TableCell>
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
