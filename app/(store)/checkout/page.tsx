"use client";

import { useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { cartProducts, formatPrice, useCommerce } from "@/lib/commerce/context";

export default function CheckoutPage() {
  const { cart, subtotal, clearCart } = useCommerce();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pinCode: "",
  });

  if (!cart.length && !submitted) {
    return (
      <PageShell title="Checkout">
        <div className="mt-8">
          <p className="text-sm text-muted-foreground">Your shopping bag is currently empty.</p>
          <Button asChild className="mt-6 rounded-none bg-ink text-white hover:bg-black">
            <Link href="/shop" className="text-xs uppercase tracking-wider">
              Return to shop
            </Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  if (submitted) {
    return (
      <PageShell eyebrow="Thank You" title="Order Confirmed">
        <div className="mt-8 max-w-xl border border-border bg-white/40 p-8">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your order has been recorded successfully. A confirmation summary has been logged for{" "}
            <strong className="text-foreground">{formData.email || "your account"}</strong>.
          </p>
          <div className="mt-6 flex gap-4">
            <Button asChild className="rounded-none bg-ink text-white hover:bg-black text-[10px] tracking-wider">
              <Link href="/account/orders">VIEW ORDERS</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-none text-[10px] tracking-wider">
              <Link href="/shop">CONTINUE SHOPPING</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearCart();
    setSubmitted(true);
  };

  return (
    <PageShell eyebrow="Almost Yours" title="Checkout">
      <form
        className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]"
        onSubmit={handleSubmit}
      >
        <div className="space-y-8">
          <section>
            <h2 className="font-display text-2xl">Customer Information</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                required
                type="text"
                placeholder="Full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-11 border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
              />
              <input
                required
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-11 border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
              />
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl">Shipping Address</h2>
            <div className="mt-4 grid gap-3">
              <input
                required
                placeholder="Street address / Apartment"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="h-11 border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  required
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="h-11 border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
                />
                <input
                  required
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="h-11 border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
                />
                <input
                  required
                  placeholder="PIN Code"
                  pattern="[0-9]{6}"
                  value={formData.pinCode}
                  onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                  className="h-11 border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl">Payment Method</h2>
            <div className="mt-4 border border-border bg-white/40 p-5 text-sm text-muted-foreground leading-relaxed">
              <p className="font-medium text-foreground">Development / Demo Checkout</p>
              <p className="mt-1">
                Real gateway charges (Stripe / Razorpay) will activate once keys are enabled. No actual payment will be deducted during testing.
              </p>
            </div>
          </section>
        </div>

        <aside className="h-fit border border-border bg-white/40 p-6 backdrop-blur-xs">
          <h2 className="font-display text-2xl">Order Summary</h2>
          <div className="mt-5 space-y-3 text-sm">
            {cartProducts(cart).map(({ item, product }) => (
              <div key={product.id} className="flex justify-between gap-3 text-xs">
                <span className="text-muted-foreground">
                  {product.name} × {item.quantity}
                </span>
                <span className="font-medium text-foreground">
                  {formatPrice((product.salePrice ?? product.price) * item.quantity)}
                </span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-4 font-semibold text-base text-foreground">
              <span>Total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
          </div>
          <Button
            type="submit"
            className="mt-8 w-full rounded-none bg-ink text-white hover:bg-black py-6 text-[10px] font-semibold tracking-[0.14em]"
          >
            CONFIRM & PLACE ORDER
          </Button>
        </aside>
      </form>
    </PageShell>
  );
}
