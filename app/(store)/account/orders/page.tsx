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
  const { user, isLoading: authLoading } = useCustomerAuth();
  const [result, setResult] = useState<{ userId: string; orders: any[]; error?: string }>();
  const [revision, setRevision] = useState(0);
  const userId = user?.id;
  const email = user?.email || "";
  const orders = result?.userId === user?.id ? result?.orders || [] : [];
  const error = result?.userId === user?.id ? result?.error : undefined;
  const isLoading = authLoading || Boolean(user && result?.userId !== user.id);
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    setResult(undefined);
    fetch("/api/orders", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.orders))
          throw new Error(data.error || "Unable to load your orders.");
        if (!controller.signal.aborted) setResult({ userId, orders: data.orders });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ userId, orders: [], error: error.message });
      });
    return () => controller.abort();
  }, [userId, revision]);

  return (
    <PageShell eyebrow="Your Account" title="Order History">
      {user && email && (
        <p className="mt-8 text-xs text-muted-foreground">
          Showing orders for <span className="font-medium text-foreground">{email}</span>
        </p>
      )}

      {error ? (
        <div role="alert">
          {error} <button onClick={() => setRevision((n) => n + 1)}>Retry</button>
        </div>
      ) : !authLoading && !user ? (
        <Link href="/login?next=/account/orders">Sign in to view your orders</Link>
      ) : isLoading ? (
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
                ? `No orders found associated with ${email}. Explore the collection to place your first order.`
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
