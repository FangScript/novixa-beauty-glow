"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, PackageCheck, Tag, X } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { cartProducts, formatPrice, useCommerce } from "@/lib/commerce/context";
import { useCustomerAuth } from "@/lib/auth/customer-context";

type AppliedCoupon = {
  id?: string;
  code: string;
  discount: number;
  message: string;
};

export default function CheckoutPage() {
  const { cart, subtotal, clearCart } = useCommerce();
  const { user } = useCustomerAuth();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pinCode: "",
  });

  // Pre-fill from authenticated user
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          subtotal,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.error || "Invalid coupon code.");
      }

      setAppliedCoupon({
        id: data.coupon?.id,
        code: data.coupon.code,
        discount: data.discount,
        message: data.message,
      });
      setCouponCode("");
    } catch (err: any) {
      setCouponError(err.message || "Failed to apply coupon.");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const discount = appliedCoupon?.discount ?? 0;
  const shippingEstimate = subtotal >= 70 ? 0 : 4.95;
  const orderTotal = Math.max(0, subtotal - discount) + shippingEstimate;

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

  if (submitted && confirmedOrder) {
    const orderDiscount = confirmedOrder.discount ?? discount;
    const shipping = confirmedOrder.shipping ?? (subtotal >= 70 ? 0 : 4.95);
    const total = confirmedOrder.total ?? Math.max(0, subtotal - orderDiscount) + shipping;

    return (
      <PageShell eyebrow="Thank You" title="Order Confirmed">
        <div className="mt-8 max-w-2xl border border-border bg-white/60 p-8 sm:p-10 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-800">
            <CheckCircle2 size={28} className="text-emerald-700" />
            <div>
              <p className="font-display text-2xl text-foreground">Order Successfully Recorded</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Order ID: <strong className="text-foreground">{confirmedOrder.orderNumber}</strong>
              </p>
            </div>
          </div>

          <div className="mt-8 border-y border-border py-6 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Fulfillment Status</span>
              <span className="font-semibold text-rosewood uppercase tracking-wider">
                {confirmedOrder.status || "Pending"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="text-foreground">Cash on Delivery (Pay upon Receipt)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Delivery Recipient</span>
              <span className="text-foreground font-medium">{formData.name} ({formData.email})</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Shipping Destination</span>
              <span className="text-foreground text-right">
                {formData.address}, {formData.city}, {formData.state} - {formData.pinCode}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(confirmedOrder.subtotal ?? subtotal)}</span>
            </div>
            {orderDiscount > 0 && (
              <div className="flex justify-between text-xs text-[#4b6742] font-medium">
                <span>Promotional Discount</span>
                <span>-{formatPrice(orderDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Shipping Delivery</span>
              <span>{shipping === 0 ? "Complimentary" : formatPrice(shipping)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border font-display text-lg text-foreground">
              <span>Total Payable</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-4 pt-4 border-t border-border">
            <Button asChild className="rounded-none bg-ink text-white hover:bg-black text-[10px] tracking-wider py-5 px-6">
              <Link href="/account/orders">
                <PackageCheck size={14} className="mr-2" />
                VIEW IN MY ORDERS
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-none text-[10px] tracking-wider py-5 px-6">
              <Link href="/shop">
                CONTINUE SHOPPING
              </Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
          userId: user?.id ?? null,
          couponCode: appliedCoupon?.code ?? null,
          customer: {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
          },
          address: {
            line1: formData.address.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            postalCode: formData.pinCode.trim(),
            country: "GB",
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to place order. Please try again.");
      }

      // Save customer email and placed order for local history sync
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("novixa_customer_email", formData.email.trim());
          const existing = JSON.parse(localStorage.getItem("novixa_recent_orders") || "[]");
          localStorage.setItem(
            "novixa_recent_orders",
            JSON.stringify([data.order, ...existing].slice(0, 20)),
          );
        } catch {}
      }

      setConfirmedOrder(data.order);
      clearCart();
      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to place order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell eyebrow="Almost Yours" title="Checkout">
      <form
        className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]"
        onSubmit={handleSubmit}
      >
        <div className="space-y-8">
          {errorMessage && (
            <div className="border border-[#b86d5a] bg-[#fbf2ef] p-4 text-xs text-[#8f2d18]">
              {errorMessage}
            </div>
          )}

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
            <div className="mt-3">
              <input
                type="tel"
                placeholder="Phone number (for delivery SMS)"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-11 w-full border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
              />
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl">Shipping Address</h2>
            <div className="mt-4 grid gap-3">
              <input
                required
                placeholder="Street address / Apartment / Suite"
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
                  placeholder="County (e.g. Greater London)"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="h-11 border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
                />
                <input
                  required
                  placeholder="Postcode (e.g. W1K 7AA)"
                  value={formData.pinCode}
                  onChange={(e) => setFormData({ ...formData, pinCode: e.target.value.toUpperCase() })}
                  className="h-11 border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl">Payment Selection</h2>
            <div className="mt-4 border border-border bg-white/50 p-5 text-sm">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="cod"
                  name="payment"
                  checked
                  readOnly
                  className="h-4 w-4 text-rosewood"
                />
                <label htmlFor="cod" className="font-medium text-foreground cursor-pointer">
                  Cash on Delivery (Pay on Arrival)
                </label>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed pl-7">
                Pay securely upon order delivery at your doorstep. Electronic online payments (Credit Card, UPI & Net Banking) will become selectable once gateway credentials are activated.
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

            {/* Subtotal */}
            <div className="flex justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            {/* Promotional Code Input & Applied State */}
            <div className="border-t border-border pt-3">
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded bg-[#f4ede6] px-3 py-2 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-[#8f5d48]">
                    <Tag size={13} />
                    <span className="font-mono font-semibold">{appliedCoupon.code}</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="inline-flex items-center gap-1 text-[11px] text-[#a04040] hover:underline"
                  >
                    <X size={12} />
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo code (e.g. GLOW15)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="h-9 flex-1 border border-border bg-white px-2.5 text-xs font-mono uppercase outline-none focus:border-rosewood"
                    />
                    <Button
                      type="button"
                      onClick={applyCoupon}
                      disabled={isValidatingCoupon || !couponCode.trim()}
                      className="h-9 rounded-none bg-ink text-white hover:bg-black px-3 text-[10px] uppercase tracking-wider"
                    >
                      {isValidatingCoupon ? <Loader2 size={12} className="animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                  {couponError && (
                    <p className="text-[11px] text-[#8f2d18]">{couponError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Discount Display */}
            {discount > 0 && (
              <div className="flex justify-between text-xs text-[#4b6742] font-medium">
                <span>Discount ({appliedCoupon?.code})</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}

            {/* Shipping */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Shipping Delivery</span>
              <span>{shippingEstimate === 0 ? "Free" : formatPrice(shippingEstimate)}</span>
            </div>

            {/* Order Total */}
            <div className="flex justify-between border-t border-border pt-4 font-semibold text-base text-foreground">
              <span>Total</span>
              <span>{formatPrice(orderTotal)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground pt-1 text-right">
              Includes 20% UK VAT. Complimentary delivery over £70.
            </p>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-8 w-full rounded-none bg-ink text-white hover:bg-black py-6 text-[10px] font-semibold tracking-[0.14em]"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                PLACING ORDER IN DATABASE...
              </span>
            ) : (
              "CONFIRM & PLACE ORDER"
            )}
          </Button>
          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            Stock will be reserved and confirmed immediately in store inventory.
          </p>
        </aside>
      </form>
    </PageShell>
  );
}
