"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell, AdminTable, MetricCard, TableCell, TableHeader } from "@/components/admin";
import { Loader2 } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  orders: number;
  joined: string;
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((res) => res.json())
      .then((data) => {
        if (data.customers) setCustomers(data.customers);
      })
      .catch((err) => console.warn("Failed to load customers:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      customers.filter((c) =>
        `${c.name} ${c.email} ${c.phone ?? ""}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [customers, query],
  );

  const totalOrders = customers.reduce((sum, c) => sum + c.orders, 0);
  const repeatCustomers = customers.filter((c) => c.orders > 1).length;

  return (
    <AdminShell
      title="Customers"
      description="All registered customer accounts and their order activity."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Total Customers"
          value={String(customers.length)}
          detail="Registered accounts"
          tone="dark"
        />
        <MetricCard
          label="Total Orders"
          value={String(totalOrders)}
          detail="Across all customers"
        />
        <MetricCard
          label="Repeat Customers"
          value={String(repeatCustomers)}
          detail="Placed 2+ orders"
        />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by name, email or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 w-full max-w-xs border border-[#d9cec5] bg-white/60 px-3 text-xs outline-none focus:border-[#c9a982]"
        />
        {isLoading && <Loader2 size={15} className="animate-spin text-[#c9a982]" />}
      </div>

      <div className="mt-4">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">Orders</th>
            <th className="px-4 py-3">Joined</th>
          </TableHeader>
          {filtered.length === 0 && !isLoading ? (
            <tr>
              <TableCell colSpan={5}>
                <span className="text-muted-foreground">
                  {customers.length === 0
                    ? "No customers have registered yet."
                    : "No customers match your search."}
                </span>
              </TableCell>
            </tr>
          ) : (
            filtered.map((c) => (
              <tr
                key={c.id}
                className="border-b border-[#e8e0d8] hover:bg-white/60 transition-colors"
              >
                <TableCell>
                  <span className="font-medium text-foreground">{c.name}</span>
                </TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.phone || "—"}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold ${
                      c.orders > 1 ? "bg-[#f4ede6] text-[#8f5d48]" : "bg-[#f5f5f5] text-[#999]"
                    }`}
                  >
                    {c.orders} order{c.orders !== 1 ? "s" : ""}
                  </span>
                </TableCell>
                <TableCell>{c.joined}</TableCell>
              </tr>
            ))
          )}
        </AdminTable>
      </div>
    </AdminShell>
  );
}
