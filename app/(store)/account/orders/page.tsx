"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { useCustomerAuth } from "@/lib/auth/customer-context";
import { OrderTracker } from "@/components/account/OrderTracker";

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
          {orders.map((order) => (
            <OrderTracker key={order.id} order={order} />
          ))}
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
