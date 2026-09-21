"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Truck, Search, Loader2 } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/products/catalogue";
import { useCustomerAuth } from "@/lib/auth/customer-context";

export default function AccountOrdersPage() {
  const { user } = useCustomerAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async (targetEmail: string, targetUserId?: string) => {
    setIsLoading(true);
    try {
      // Prefer userId lookup (more reliable) then fall back to email
      const param = targetUserId
        ? `userId=${encodeURIComponent(targetUserId)}`
        : targetEmail
          ? `email=${encodeURIComponent(targetEmail)}`
          : null;

      if (param) {
        const res = await fetch(`/api/orders?${param}`);
        const data = await res.json();
        if (data.orders && Array.isArray(data.orders) && data.orders.length > 0) {
          setOrders(data.orders);
          setIsLoading(false);
          return;
        }
      }

      // Fallback to local session orders if API returns empty
      if (typeof window !== "undefined") {
        const local = JSON.parse(localStorage.getItem("novixa_recent_orders") || "[]");
        setOrders(local);
      }
    } catch (err) {
      console.warn("Failed to fetch customer orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Prefer the authenticated customer email, fall back to localStorage
    const resolvedEmail =
      user?.email ||
      (typeof window !== "undefined"
        ? localStorage.getItem("novixa_customer_email") || ""
        : "");
    setEmail(resolvedEmail);
    setSearchEmail(resolvedEmail);
    fetchOrders(resolvedEmail, user?.id);
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchEmail.trim()) {
      if (typeof window !== "undefined") {
        localStorage.setItem("novixa_customer_email", searchEmail.trim());
      }
      setEmail(searchEmail.trim());
      fetchOrders(searchEmail.trim());
    }
  };

  return (
    <PageShell eyebrow="Your Account" title="Order History">
      {/* Email lookup — hidden when logged in since email is auto-resolved */}
      {!user && (
        <form onSubmit={handleSearch} className="mt-8 flex max-w-md gap-2">
          <input
            type="email"
            placeholder="Lookup orders by your email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="h-10 flex-1 border border-border bg-white/50 px-3 text-xs outline-none focus:border-rosewood"
          />
          <Button
            type="submit"
            className="h-10 rounded-none bg-ink text-white hover:bg-black text-[10px] uppercase tracking-wider"
          >
            <Search size={13} className="mr-1.5" /> Find
          </Button>
        </form>
      )}
      {user && email && (
        <p className="mt-8 text-xs text-muted-foreground">
          Showing orders for <span className="font-medium text-foreground">{email}</span>
        </p>
      )}

      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-rosewood" /> Retrieving your orders...
        </div>
      ) : orders.length > 0 ? (
        <div className="mt-8 space-y-6">
          {orders.map((order) => {
            const addr = order.shippingAddressSnapshot || {};
            const items = order.items || [];
            const isDelivered = order.status === "DELIVERED";
            const isShipped = order.status === "SHIPPED";

            return (
              <div
                key={order.id}
                className="border border-border bg-white/50 p-6 transition-colors hover:bg-white/70 shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {order.orderNumber}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Placed on{" "}
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                        isDelivered
                          ? "bg-emerald-100 text-emerald-800"
                          : isShipped
                            ? "bg-sky-100 text-sky-800"
                            : "bg-[#f4ede6] text-[#8f5d48]"
                      }`}
                    >
                      {order.status}
                    </span>
                    <span className="font-semibold text-sm text-foreground">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="py-4 space-y-3">
                  {items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="h-12 w-12 object-cover border border-border bg-blush/20"
                          />
                        )}
                        <div>
                          <p className="font-medium text-foreground">{item.productName}</p>
                          <p className="text-[10px] text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <span className="font-medium text-foreground">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Tracking & Destination footer */}
                <div className="border-t border-border pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div>
                    {order.trackingNumber ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#8f5d48]">
                        <Truck size={14} /> Tracking: {order.trackingNumber}
                      </span>
                    ) : (
                      <span>Awaiting dispatch & logistics scan</span>
                    )}
                  </div>
                  <div className="text-[11px] text-right">
                    Shipped to: <strong className="text-foreground">{addr.fullName || "Customer"}</strong>,{" "}
                    {addr.city}, {addr.state}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No orders yet"
            copy={
              email
                ? `No orders found associated with ${email}. Try another email or explore the collection.`
                : "Your completed NOVIXA orders will appear here along with live tracking and receipts."
            }
            action="/shop"
            actionLabel="EXPLORE FRAGRANCES"
          />
        </div>
      )}

      <div className="mt-8">
        <Button
          asChild
          variant="ghost"
          className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <Link href="/account" className="inline-flex items-center gap-2">
            <ArrowLeft size={14} /> Back to account
          </Link>
        </Button>
      </div>
    </PageShell>
  );
}
