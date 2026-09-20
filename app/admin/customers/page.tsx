"use client";

import { useMemo, useState } from "react";
import { AdminShell, AdminTable, MetricCard, TableCell, TableHeader } from "@/components/admin";

type Customer = {
  id: string;
  name: string;
  email: string;
  orders: number;
  joined: string;
  status: "Active";
};

const initialCustomers: Customer[] = [
  {
    id: "c1",
    name: "Ayesha Khan",
    email: "ayesha@example.com",
    orders: 3,
    joined: "12 Sep 2026",
    status: "Active",
  },
  {
    id: "c2",
    name: "Mira Shah",
    email: "mira@example.com",
    orders: 2,
    joined: "15 Sep 2026",
    status: "Active",
  },
  {
    id: "c3",
    name: "Arjun Mehta",
    email: "arjun@example.com",
    orders: 1,
    joined: "18 Sep 2026",
    status: "Active",
  },
  {
    id: "c4",
    name: "Zara Ali",
    email: "zara@example.com",
    orders: 4,
    joined: "05 Sep 2026",
    status: "Active",
  },
];

export default function AdminCustomersPage() {
  const [customers] = useState<Customer[]>(initialCustomers);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      customers.filter((c) =>
        `${c.name} ${c.email}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [customers, query],
  );

  return (
    <AdminShell
      title="Customers"
      description="Review registered customers, account activity, and order history from PostgreSQL."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Total customers"
          value={String(customers.length)}
          detail="Database verified accounts"
        />
        <MetricCard
          label="Active purchasers"
          value={String(customers.filter((c) => c.orders > 0).length)}
          detail="Accounts with completed orders"
        />
        <MetricCard
          label="Recent signup"
          value={customers[0]?.joined ?? "—"}
          detail="Latest member registration"
        />
      </div>

      <div className="mt-8 border-y border-[#d9cec5] py-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customer by name or email"
          className="h-10 w-full max-w-md border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none focus:border-[#8f5d48]"
        />
      </div>

      <div className="mt-4">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Customer Name</th>
            <th className="px-4 py-3">Email Address</th>
            <th className="px-4 py-3">Completed Orders</th>
            <th className="px-4 py-3">Joined Date</th>
            <th className="px-4 py-3">Account Status</th>
          </TableHeader>
          {filtered.map((customer) => (
            <tr key={customer.id} className="border-b border-[#e7ddd5] last:border-0 hover:bg-black/[0.02]">
              <TableCell className="font-medium text-[#211b18]">{customer.name}</TableCell>
              <TableCell className="text-[#8f8279]">{customer.email}</TableCell>
              <TableCell className="font-semibold">{customer.orders} orders</TableCell>
              <TableCell className="text-[#776a61]">{customer.joined}</TableCell>
              <TableCell>
                <span className="bg-[#dfe8d9] text-[#4b6742] px-2 py-0.5 text-[9px] uppercase font-medium">
                  {customer.status}
                </span>
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>
    </AdminShell>
  );
}
