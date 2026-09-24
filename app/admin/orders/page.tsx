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
import { Loader2, RefreshCw, Copy, Check, ShieldCheck, CreditCard } from "lucide-react";

type OrderItem = {
  name: string;
  sku: string;
  price: number;
  quantity: number;
  image?: string;
};

type PaymentRecord = {
  id?: string;
  provider: string; // e.g. "PAYPAL", "LOCAL_GATEWAY", "BANK_TRANSFER", "COD"
  method: string;
  providerPaymentId?: string | null;
  amount: number;
  currency: string;
  status: string;
  rawStatus?: string | null;
  parsedMetadata?: {
    paypalOrderId?: string;
    captureId?: string | null;
    payerId?: string | null;
    payerEmail?: string | null;
    mode?: string;
    authorizedAt?: string;
    brand?: string;
    last4?: string;
    cardholder?: string;
  } | null;
  createdAt?: string;
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
  paymentRecord?: PaymentRecord | null;
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
  const [gatewayFilter, setGatewayFilter] = useState("All");
  const [selected, setSelected] = useState<Order | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedTxId, setCopiedTxId] = useState(false);

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

          let parsedMeta = null;
          if (o.payment?.rawStatus) {
            try {
              parsedMeta = JSON.parse(o.payment.rawStatus);
            } catch {}
          }

          const paymentRecord: PaymentRecord | null = o.payment
            ? {
                ...o.payment,
                parsedMetadata: parsedMeta,
              }
            : null;

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
            payment: o.paymentStatus === "PAID" ? "Paid" : "Pending Payment",
            paymentRecord,
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
      orders.filter((order) => {
        const matchesQuery = `${order.orderNumber} ${order.customer} ${order.email} ${order.paymentRecord?.providerPaymentId || ""}`
          .toLowerCase()
          .includes(query.toLowerCase());

        const matchesStatus = statusFilter === "All" || order.status === statusFilter;

        const provider = order.paymentRecord?.provider || "";
        const matchesGateway =
          gatewayFilter === "All" ||
          (gatewayFilter === "PAYPAL" && provider === "PAYPAL") ||
          (gatewayFilter === "CARD" && provider === "LOCAL_GATEWAY") ||
          (gatewayFilter === "COD" && provider === "COD") ||
          (gatewayFilter === "BANK_TRANSFER" && provider === "BANK_TRANSFER");

        return matchesQuery && matchesStatus && matchesGateway;
      }),
    [orders, query, statusFilter, gatewayFilter],
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
    setTrackingInput(order.trackingNumber);
    setCopiedTxId(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTxId(true);
    toast.success("Transaction ID copied to clipboard");
    setTimeout(() => setCopiedTxId(false), 2000);
  };

  return (
    <AdminShell
      title="Orders & Transactions"
      description="Monitor customer orders, review real-time gateway payments, and manage order fulfilment."
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search by order #, customer, or transaction ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-72 border border-[#d9cec5] bg-white px-3 text-xs outline-none focus:border-[#8f5d48]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 border border-[#d9cec5] bg-white px-3 text-xs outline-none focus:border-[#8f5d48]"
          >
            <option value="All">All Fulfilment Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={gatewayFilter}
            onChange={(e) => setGatewayFilter(e.target.value)}
            className="h-9 border border-[#d9cec5] bg-white px-3 text-xs outline-none focus:border-[#8f5d48]"
          >
            <option value="All">All Payment Gateways</option>
            <option value="PAYPAL">PayPal Express</option>
            <option value="CARD">Credit / Debit Card</option>
            <option value="BANK_TRANSFER">Bank Transfer (BACS)</option>
            <option value="COD">Cash on Delivery</option>
          </select>
        </div>

        <button
          onClick={fetchOrders}
          disabled={isLoading}
          className="flex items-center gap-1.5 self-start text-[10px] uppercase tracking-wider text-[#8f5d48] hover:text-[#211b18] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
          Refresh Orders
        </button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#c9a982]" />
          </div>
        ) : (
          <AdminTable>
            <TableHeader>
              <th className="px-4 py-3">Order Number</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Fulfilment</th>
              <th className="px-4 py-3">Payment & Gateway</th>
              <th className="px-4 py-3 text-right">Action</th>
            </TableHeader>
            {filtered.map((order) => {
              const payment = order.paymentRecord;
              const isPayPal = payment?.provider === "PAYPAL";
              const isCard = payment?.provider === "LOCAL_GATEWAY";
              const isPaid = payment?.status === "PAID" || order.payment === "Paid";

              return (
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
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        {isPayPal && (
                          <span className="inline-flex items-center gap-1 rounded bg-[#0070ba]/10 text-[#0070ba] font-semibold text-[10px] px-1.5 py-0.5">
                            <span className="font-serif italic font-bold">P</span> PayPal
                          </span>
                        )}
                        {isCard && (
                          <span className="inline-flex items-center gap-1 rounded bg-stone-100 text-stone-700 font-semibold text-[10px] px-1.5 py-0.5">
                            <CreditCard size={10} /> Card
                          </span>
                        )}
                        {!isPayPal && !isCard && payment?.provider && (
                          <span className="inline-flex items-center rounded bg-stone-100 text-stone-700 text-[10px] px-1.5 py-0.5 font-medium">
                            {payment.provider}
                          </span>
                        )}
                        <AdminStatus tone={isPaid ? "positive" : "warning"}>
                          {isPaid ? "PAID" : "UNPAID"}
                        </AdminStatus>
                      </div>
                      {payment?.providerPaymentId && (
                        <p className="font-mono text-[9px] text-[#8f8279] truncate max-w-[140px]" title={payment.providerPaymentId}>
                          Tx: {payment.providerPaymentId}
                        </p>
                      )}
                    </div>
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
              );
            })}
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
            {/* Header Metrics */}
            <div className="grid gap-3 sm:grid-cols-2 text-xs border-b border-[#d9cec5] pb-3">
              <div>
                <p className="text-muted-foreground">Order Date</p>
                <p className="font-medium mt-0.5">{selected.date}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Authoritative Order Total</p>
                <p className="font-medium mt-0.5 text-[#8f5d48] text-sm">{selected.total}</p>
              </div>
            </div>

            {/* Payment & Transaction Ledger Record */}
            <div className="rounded border border-[#d9cec5] bg-[#faf8f5] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-700" />
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Transaction Record
                  </p>
                </div>
                <AdminStatus tone={selected.paymentRecord?.status === "PAID" || selected.payment === "Paid" ? "positive" : "warning"}>
                  {selected.paymentRecord?.status || selected.payment}
                </AdminStatus>
              </div>

              {selected.paymentRecord ? (
                <div className="grid gap-2 sm:grid-cols-2 text-xs pt-1 border-t border-[#e7ddd5]">
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Payment Gateway:</span>
                    <span className="font-medium text-foreground">
                      {selected.paymentRecord.provider === "PAYPAL"
                        ? "PayPal Express"
                        : selected.paymentRecord.provider === "LOCAL_GATEWAY"
                          ? "Direct Credit / Debit Card"
                          : selected.paymentRecord.provider}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground text-[11px] block">Settlement Amount:</span>
                    <span className="font-medium text-foreground">
                      £{selected.paymentRecord.amount.toLocaleString("en-GB")} {selected.paymentRecord.currency}
                    </span>
                  </div>

                  {selected.paymentRecord.providerPaymentId && (
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground text-[11px] block">
                        Transaction / Capture Reference ID:
                      </span>
                      <div className="mt-0.5 flex items-center gap-2">
                        <code className="rounded bg-white px-2 py-1 font-mono text-[11px] text-[#8f5d48] border border-[#d9cec5]">
                          {selected.paymentRecord.providerPaymentId}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selected.paymentRecord?.providerPaymentId || "")}
                          className="text-[#8f5d48] hover:text-black transition-colors"
                          title="Copy Transaction ID"
                        >
                          {copiedTxId ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {selected.paymentRecord.parsedMetadata?.payerEmail && (
                    <div>
                      <span className="text-muted-foreground text-[11px] block">Payer Account:</span>
                      <span className="font-mono text-foreground text-[11px]">
                        {selected.paymentRecord.parsedMetadata.payerEmail}
                      </span>
                    </div>
                  )}

                  {selected.paymentRecord.parsedMetadata?.mode && (
                    <div>
                      <span className="text-muted-foreground text-[11px] block">Gateway Environment:</span>
                      <span className="uppercase text-[10px] font-semibold text-stone-700 bg-stone-200/80 px-1.5 py-0.5 rounded">
                        {selected.paymentRecord.parsedMetadata.mode}
                      </span>
                    </div>
                  )}

                  {selected.paymentRecord.parsedMetadata?.authorizedAt && (
                    <div className="sm:col-span-2 text-[10px] text-muted-foreground pt-1">
                      Authorized timestamp:{" "}
                      <span className="font-mono">
                        {new Date(selected.paymentRecord.parsedMetadata.authorizedAt).toLocaleString("en-GB")}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground pt-1">
                  Standard checkout order record. Payment verified on order submission.
                </p>
              )}
            </div>

            {/* Delivery Destination */}
            <div className="text-xs border-b border-[#d9cec5] pb-3 space-y-1">
              <p className="text-muted-foreground">Delivery Destination & Contact</p>
              <p className="font-medium text-foreground">
                {selected.customer} {selected.phone && `· ${selected.phone}`}
              </p>
              <p className="text-muted-foreground">
                {selected.address || "No delivery address supplied"}
              </p>
            </div>

            {/* Order Items */}
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

            {/* Fulfilment Status Controls */}
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

            {/* Logistics Tracking */}
            <AdminField label="Tracking Number / Logistics Reference">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. GB2910395819YQ"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  className="h-9 flex-1 border border-[#d9cec5] bg-white px-3 font-mono text-xs outline-none focus:border-[#8f5d48]"
                />
                <Button
                  disabled={isUpdating || trackingInput === selected.trackingNumber}
                  onClick={saveTracking}
                  className="rounded-none bg-[#211b18] text-white text-[10px] uppercase tracking-wider"
                >
                  Save
                </Button>
              </div>
            </AdminField>
          </div>
        </AdminDialog>
      )}
    </AdminShell>
  );
}
