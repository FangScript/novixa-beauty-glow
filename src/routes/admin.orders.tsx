import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  AdminDialog,
  AdminField,
  AdminShell,
  AdminStatus,
  AdminTable,
  TableCell,
  TableHeader,
} from "@/components/admin";
import { listAdminOrders, updateAdminOrderStatus } from "@/lib/admin-service";
export const Route = createFileRoute("/admin/orders")({ component: AdminOrders });
type Order = {
  id: string;
  customer: string;
  email: string;
  date: string;
  total: string;
  status: "Pending" | "Processing" | "Shipped" | "Delivered";
  payment: "Paid" | "Requires action";
  items: string[];
};
const initialOrders: Order[] = [
  {
    id: "NV-1048",
    customer: "Ayesha Khan",
    email: "ayesha@example.com",
    date: "Today, 10:42",
    total: "Rs. 7,999",
    status: "Processing",
    payment: "Paid",
    items: ["Complete Glam Bundle"],
  },
  {
    id: "NV-1047",
    customer: "Mira Shah",
    email: "mira@example.com",
    date: "Yesterday",
    total: "Rs. 4,999",
    status: "Shipped",
    payment: "Paid",
    items: ["Velvet Rose Eau de Parfum"],
  },
  {
    id: "NV-1046",
    customer: "Arjun Mehta",
    email: "arjun@example.com",
    date: "20 Sep 2026",
    total: "Rs. 3,299",
    status: "Pending",
    payment: "Requires action",
    items: ["Gentleman Grooming Kit"],
  },
  {
    id: "NV-1045",
    customer: "Zara Ali",
    email: "zara@example.com",
    date: "19 Sep 2026",
    total: "Rs. 12,498",
    status: "Delivered",
    payment: "Paid",
    items: ["Noir Élan Eau de Parfum", "Atlas Daily Grooming Kit"],
  },
];
const statuses: Order["status"][] = ["Pending", "Processing", "Shipped", "Delivered"];
function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState<Order | null>(null);
  const list = useServerFn(listAdminOrders);
  const update = useServerFn(updateAdminOrderStatus);
  useEffect(() => {
    list().then(setOrders);
  }, [list]);
  const filtered = useMemo(
    () =>
      orders.filter(
        (order) =>
          `${order.id} ${order.customer} ${order.email}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (status === "All" || order.status === status),
      ),
    [orders, query, status],
  );
  const updateStatus = async (next: Order["status"]) => {
    if (!selected) return;
    const result = await update({
      data: {
        id: selected.id,
        status: next.toUpperCase() as "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED",
      },
    });
    setOrders((current) =>
      current.map((order) => (order.id === selected.id ? { ...order, status: next } : order)),
    );
    setSelected({ ...selected, status: next });
  };
  return (
    <AdminShell
      title="Orders"
      description="Review fulfilment, payment status, customer details, and order history."
    >
      <div className="flex flex-col gap-3 border-y border-[#d9cec5] py-4 md:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search order number, customer, or email"
          className="h-10 flex-1 border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 border border-[#d9cec5] bg-white/60 px-3 text-xs"
        >
          <option>All</option>
          {statuses.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      <div className="mt-4 flex justify-between text-xs text-[#776a61]">
        <span>{filtered.length} orders</span>
        <span>Connected to PostgreSQL order service.</span>
      </div>
      <div className="mt-4">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Order status</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3" />
          </TableHeader>
          {filtered.map((order) => (
            <tr key={order.id} className="border-b border-[#e7ddd5] last:border-0">
              <TableCell className="font-medium text-[#8f5d48]">{order.id}</TableCell>
              <TableCell>
                <p>{order.customer}</p>
                <p className="mt-1 text-[10px] text-[#8f8279]">{order.email}</p>
              </TableCell>
              <TableCell className="text-[#776a61]">{order.date}</TableCell>
              <TableCell>{order.total}</TableCell>
              <TableCell>
                <AdminStatus
                  tone={
                    order.status === "Delivered"
                      ? "positive"
                      : order.status === "Pending"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {order.status}
                </AdminStatus>
              </TableCell>
              <TableCell>
                <AdminStatus tone={order.payment === "Paid" ? "positive" : "danger"}>
                  {order.payment}
                </AdminStatus>
              </TableCell>
              <TableCell className="text-right">
                <button onClick={() => setSelected(order)} className="text-[#8f5d48] underline">
                  Open
                </button>
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>
      {selected && (
        <AdminDialog
          title={`Order ${selected.id}`}
          description={`${selected.customer} · ${selected.email}`}
          onClose={() => setSelected(null)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Order status">
              <select
                value={selected.status}
                onChange={(e) => updateStatus(e.target.value as Order["status"])}
                className="h-10 w-full border border-[#d9cec5] bg-white/60 px-3 text-sm"
              >
                <option>Pending</option>
                <option>Processing</option>
                <option>Shipped</option>
                <option>Delivered</option>
              </select>
            </AdminField>
            <AdminField label="Payment status">
              <div className="h-10 flex items-center">
                <AdminStatus tone={selected.payment === "Paid" ? "positive" : "danger"}>
                  {selected.payment}
                </AdminStatus>
              </div>
            </AdminField>
          </div>
          <div className="mt-6 border-y border-[#d9cec5] py-5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#776a61]">Items</p>
            {selected.items.map((item) => (
              <div key={item} className="mt-3 flex justify-between text-sm">
                <span>{item}</span>
                <span>1 ×</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Button
              onClick={() => setSelected(null)}
              className="rounded-none text-[10px] uppercase"
            >
              Close
            </Button>
          </div>
        </AdminDialog>
      )}
    </AdminShell>
  );
}
