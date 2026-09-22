import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell, AdminTable, MetricCard, TableCell, TableHeader } from "@/components/admin";
import { listAdminCustomers } from "@/lib/admin-service";
export const Route = createFileRoute("/admin/customers")({ component: AdminCustomers });
type Customer = {
  id: string;
  name: string;
  email: string;
  orders: number;
  joined: string;
  status: "Active";
};
function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const load = async () => {
    try {
      setCustomers(await listAdminCustomers());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const filtered = useMemo(
    () =>
      customers.filter((customer) =>
        `${customer.name} ${customer.email}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [customers, query],
  );
  return (
    <AdminShell
      title="Customers"
      description="Review registered customers, account activity, and order relationships from PostgreSQL."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Total customers"
          value={String(customers.length)}
          detail="Database records"
        />
        <MetricCard
          label="With orders"
          value={String(customers.filter((customer) => customer.orders > 0).length)}
          detail="Repeat-ready accounts"
        />
        <MetricCard
          label="Newest account"
          value={
            customers[0]?.joined ? new Date(customers[0].joined).toLocaleDateString("en-GB") : "—"
          }
          detail="Most recent signup"
        />
      </div>
      <div className="mt-8">
        <div className="border-y border-[#d9cec5] py-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email"
            className="h-10 w-full max-w-md border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none"
          />
        </div>
        <div className="mt-6">
          <AdminTable>
            <TableHeader>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
            </TableHeader>
            {loading ? (
              <tr>
                <TableCell>Loading customers…</TableCell>
              </tr>
            ) : (
              filtered.map((customer) => (
                <tr key={customer.id} className="border-b border-[#e7ddd5] last:border-0">
                  <TableCell>
                    <p className="font-medium">{customer.name}</p>
                    <p className="mt-1 text-[10px] text-[#8f8279]">{customer.email}</p>
                  </TableCell>
                  <TableCell>{customer.orders}</TableCell>
                  <TableCell>{new Date(customer.joined).toLocaleDateString("en-GB")}</TableCell>
                  <TableCell>{customer.status}</TableCell>
                </tr>
              ))
            )}
          </AdminTable>
        </div>
      </div>
    </AdminShell>
  );
}
