import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/storefront";
import { Button } from "@/components/ui/button";
import { cartProducts, formatPrice, useCommerce } from "@/lib/commerce";
export const Route = createFileRoute("/checkout")({ component: Checkout });
function Checkout() {
  const { cart, subtotal } = useCommerce();
  const [submitted, setSubmitted] = useState(false);
  if (!cart.length)
    return (
      <PageShell title="Checkout">
        <div className="mt-10">
          <p className="text-sm text-muted-foreground">Your bag is empty.</p>
          <Link to="/shop" className="mt-5 inline-block underline">
            Return to shop
          </Link>
        </div>
      </PageShell>
    );
  if (submitted)
    return (
      <PageShell eyebrow="Thank you" title="Order received">
        <div className="mt-8 max-w-xl border border-border p-8">
          <p className="text-sm leading-7 text-muted-foreground">
            Your order has been saved as a development checkout. Payment is not connected yet, so no
            charge was made.
          </p>
          <Button asChild className="mt-6 rounded-none text-[10px] tracking-[0.14em]">
            <Link to="/account/orders">VIEW ORDERS</Link>
          </Button>
        </div>
      </PageShell>
    );
  return (
    <PageShell eyebrow="Almost yours" title="Checkout">
      <form
        className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <div className="space-y-7">
          <section>
            <h2 className="text-2xl">Customer information</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                required
                type="text"
                placeholder="Full name"
                className="h-11 border border-border bg-transparent px-3 text-sm"
              />
              <input
                required
                type="email"
                placeholder="Email address"
                className="h-11 border border-border bg-transparent px-3 text-sm"
              />
            </div>
          </section>
          <section>
            <h2 className="text-2xl">Shipping address</h2>
            <div className="mt-4 grid gap-3">
              <input
                required
                placeholder="Address"
                className="h-11 border border-border bg-transparent px-3 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  required
                  placeholder="City"
                  className="h-11 border border-border bg-transparent px-3 text-sm"
                />
                <input
                  required
                  placeholder="State"
                  className="h-11 border border-border bg-transparent px-3 text-sm"
                />
                <input
                  required
                  placeholder="PIN code"
                  pattern="[0-9]{6}"
                  className="h-11 border border-border bg-transparent px-3 text-sm"
                />
              </div>
            </div>
          </section>
          <section>
            <h2 className="text-2xl">Payment method</h2>
            <p className="mt-3 border border-border p-4 text-sm text-muted-foreground">
              Secure online payments will be available when the payment provider is configured. This
              development checkout will not charge you.
            </p>
          </section>
        </div>
        <aside className="h-fit border border-border p-6">
          <h2 className="text-2xl">Order summary</h2>
          <div className="mt-5 space-y-3 text-sm">
            {cartProducts(cart).map(({ item, product }) => (
              <div key={product.id} className="flex justify-between gap-3">
                <span>
                  {product.name} × {item.quantity}
                </span>
                <span>{formatPrice((product.salePrice ?? product.price) * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-3 font-semibold">
              <span>Total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
          </div>
          <Button type="submit" className="mt-7 w-full rounded-none text-[10px] tracking-[0.14em]">
            PLACE ORDER
          </Button>
        </aside>
      </form>
    </PageShell>
  );
}
