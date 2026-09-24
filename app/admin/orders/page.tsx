"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { Loader2, RefreshCw } from "lucide-react";

type OrderItem = {
  name: string;
  sku: string;
  price: number;
  quantity: number;
  image?: string;
};

type Order = {
  id: string;
  orderNumber: string;
  customer: string;
  email: string;
  phone?: string;
  address?: string;
  date: string;
  total: string;
  status: "Pending" | "Confirmed" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  payment: string;
  trackingNumber: string;
  items: OrderItem[];
};

const statuses: Order["status"][] = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState<Order | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();

      if (data.orders && Array.isArray(data.orders)) {
        const mapped: Order[] = data.orders.map((o: any) => {
          const addr = o.shippingAddressSnapshot || {};
          const statusFormatted = (o.status.charAt(0) +
            o.status.slice(1).toLowerCase()) as Order["status"];

          return {
            id: o.id,
            orderNumber: o.orderNumber || o.id,
            customer: addr.fullName || o.user?.name || "Guest Customer",
            email: addr.email || o.user?.email || "No email",
            phone: addr.phone || "",
            address: [addr.line1, addr.city, addr.state, addr.postalCode]
              .filter(Boolean)
              .join(", "),
            date: new Date(o.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            total: `£${o.total.toLocaleString("en-GB")}`,
            status: statusFormatted,
            payment: o.paymentStatus === "PAID" ? "Paid" : "Pay on Delivery (Unpaid)",
            trackingNumber: o.trackingNumber || "",
            items: (o.items || []).map((i: any) => ({
              name: i.productName,
              sku: i.sku,
              price: i.unitPrice,
              quantity: i.quantity,
              image: i.imageUrl,
            })),
          };
        });
        setOrders(mapped);
      }
    } catch (err) {
      console.warn("Failed to load orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filtered = useMemo(
    () =>
      orders.filter(
        (order) =>
          `${order.orderNumber} ${order.customer} ${order.email}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (statusFilter === "All" || order.status === statusFilter),
      ),
    [orders, query, statusFilter],
  );

  const updateStatus = async (nextStatus: Order["status"]) => {
    if (!selected) return;
    setIsUpdating(true);

    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          status: nextStatus.toUpperCase(),
        }),
      });

      if (res.ok) {
        setOrders((current) =>
          current.map((order) =>
            order.id === selected.id ? { ...order, status: nextStatus } : order,
          ),
        );
        setSelected({ ...selected, status: nextStatus });
        toast.success(`Order ${selected.orderNumber} status updated to "${nextStatus}".`);
      } else {
        toast.error(`Failed to update order status.`);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error("Failed to update order status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const saveTracking = async () => {
    if (!selected) return;
    setIsUpdating(true);

    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          trackingNumber: trackingInput.trim(),
        }),
      });

      if (res.ok) {
        setOrders((current) =>
          current.map((order) =>
            order.id === selected.id ? { ...order, trackingNumber: trackingInput.trim() } : order,
          ),
        );
        setSelected({ ...selected, trackingNumber: trackingInput.trim() });
        toast.success(`Tracking number saved for Order ${selected.orderNumber}.`);
      } else {
        toast.error("Failed to save tracking number.");
      }
    } catch (err) {
      console.error("Failed to save tracking:", err);
      toast.error("Failed to save tracking number.");
    } finally {
      setIsUpdating(false);
    }
  };

  const openOrder = (order: Order) => {
    setSelected(order);
    setTrackingInput(order.trackingNumber || "");
  };

  return (
    <AdminShell
      title="Orders"
      description="Review fulfilment, payment status, customer details, and order history."
    >
      <div className="flex flex-col gap-3 border-y border-[#d9cec5] py-4 md:flex-row md:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search order number, customer, or email"
          className="h-10 flex-1 border border-[#d9cec5] bg-white/60 px-3 text-sm outline-none focus:border-[#8f5d48]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 border border-[#d9cec5] bg-white/60 px-3 text-xs"
        >
          <option>All</option>
          {statuses.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <Button
          onClick={fetchOrders}
          variant="outline"
          disabled={isLoading}
          className="h-10 rounded-none text-xs gap-1.5"
        >
          <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      <div className="mt-4 flex justify-between text-xs text-[#776a61]">
        <span>{filtered.length} orders</span>
        <span>Connected to PostgreSQL order service</span>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-[#8f5d48]" /> Loading orders...
          </div>
        ) : (
          <AdminTable>
            <TableHeader>
              <th className="px-4 py-3">Order Number</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3 text-right">Action</th>
            </TableHeader>
            {filtered.map((order) => (
              <tr
                key={order.id}
                className="border-b border-[#e7ddd5] last:border-0 hover:bg-black/[0.02]"
              >
                <TableCell className="font-medium text-[#8f5d48] font-mono">
                  {order.orderNumber}
                </TableCell>
                <TableCell>
                  <p className="font-medium">{order.customer}</p>
                  <p className="mt-0.5 text-[10px] text-[#8f8279]">{order.email}</p>
                </TableCell>
                <TableCell className="text-[#776a61]">{order.date}</TableCell>
                <TableCell className="font-medium">{order.total}</TableCell>
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
                  <button
                    onClick={() => openOrder(order)}
                    className="text-xs text-[#8f5d48] underline hover:text-black font-medium"
                  >
                    Manage
                  </button>
                </TableCell>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                  No orders found. Storefront orders will appear here automatically upon checkout.
                </td>
              </tr>
            )}
          </AdminTable>
        )}
      </div>

      {selected && (
        <AdminDialog
          title={`Order ${selected.orderNumber}`}
          description={`${selected.customer} · ${selected.email}`}
          onClose={() => setSelected(null)}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="grid gap-3 sm:grid-cols-2 text-xs border-b border-[#d9cec5] pb-3">
              <div>
                <p className="text-muted-foreground">Order Date</p>
                <p className="font-medium mt-0.5">{selected.date}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Value</p>
                <p className="font-medium mt-0.5 text-[#8f5d48] text-sm">{selected.total}</p>
              </div>
            </div>

            <div className="text-xs border-b border-[#d9cec5] pb-3 space-y-1">
              <p className="text-muted-foreground">Delivery Destination & Contact</p>
              <p className="font-medium text-foreground">
                {selected.customer} {selected.phone && `· ${selected.phone}`}
              </p>
              <p className="text-muted-foreground">
                {selected.address || "No delivery address supplied"}
              </p>
            </div>

            <div className="border-b border-[#d9cec5] pb-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                Order Items ({selected.items.length})
              </p>
              <div className="space-y-2">
                {selected.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs border border-[#e7ddd5] bg-white/40 p-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      {item.image && (
                        <img
                          src={item.image}
                          alt=""
                          className="h-9 w-9 object-cover border border-[#e7ddd5] bg-blush/20"
                        />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-[10px] text-[#8f8279]">{item.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">£{item.price}</p>
                      <p className="text-[10px] text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <AdminField label="Fulfilment Status">
              <div className="flex flex-wrap gap-2 pt-1">
                {statuses.map((s) => (
                  <Button
                    key={s}
                    disabled={isUpdating}
                    variant={selected.status === s ? "default" : "outline"}
                    className={`rounded-none text-[10px] uppercase tracking-wider ${
                      selected.status === s ? "bg-[#211b18] text-white" : ""
                    }`}
                    onClick={() => updateStatus(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </AdminField>

            <AdminField label="Tracking Number / Logistics Reference">
              <div className="flex gap-2">
                <input
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="e.g. ROYALMAIL-GB123456789"
                  className="h-10 flex-1 border border-[#d9cec5] bg-white/60 px-3 text-xs outline-none focus:border-[#8f5d48]"
                />
                <Button
                  onClick={saveTracking}
                  disabled={isUpdating}
                  className="h-10 rounded-none bg-[#211b18] text-white hover:bg-black text-[10px] uppercase"
                >
                  Save Tracking
                </Button>
              </div>
            </AdminField>
          </div>
        </AdminDialog>
      )}
    </AdminShell>
  );
}
