"use client";

import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { QuantityControl, RemoveButton } from "@/components/cart/QuantityControl";
import { EmptyState } from "@/components/shared/EmptyState";
import { cartProducts, formatPrice, useCommerce } from "@/lib/commerce/context";
import { Button } from "@/components/ui/button";

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, subtotal } = useCommerce();
  const items = cartProducts(cart);
  const shipping = subtotal >= 70 || subtotal === 0 ? 0 : 4.95;

  return (
    <PageShell eyebrow="Your Edit" title="Shopping Bag">
      {!items.length ? (
        <div className="mt-8">
          <EmptyState
            title="Your bag is waiting"
            copy="Add a signature scent or a luxury beauty essential to begin your ritual."
            action="/shop"
            actionLabel="EXPLORE THE COLLECTION"
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="divide-y divide-border border-y border-border">
            {items.map(({ item, product }) => (
              <div key={product.id} className="flex gap-5 py-6">
                <Link href={`/products/${product.slug}`} className="shrink-0">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-28 w-28 object-cover bg-blush/20 border border-border/40"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div className="flex justify-between gap-3">
                    <div>
                      <Link
                        href={`/products/${product.slug}`}
                        className="font-display text-lg tracking-tight hover:text-rosewood transition-colors"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {formatPrice(product.salePrice ?? product.price)}
                      </p>
                    </div>
                    <RemoveButton onClick={() => removeFromCart(product.id)} />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <QuantityControl
                      quantity={item.quantity}
                      onChange={(n) => updateQuantity(product.id, n)}
                    />
                    <span className="text-sm font-semibold">
                      {formatPrice((product.salePrice ?? product.price) * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="h-fit border border-border bg-white/40 p-6 backdrop-blur-xs">
            <h2 className="font-display text-2xl">Order Summary</h2>
            <div className="mt-6 space-y-3.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="text-foreground font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span className="text-foreground font-medium">
                  {shipping ? formatPrice(shipping) : "Complimentary"}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-4 font-semibold text-base text-foreground">
                <span>Estimated Total</span>
                <span>{formatPrice(subtotal + shipping)}</span>
              </div>
            </div>
            <Button
              asChild
              className="mt-8 w-full rounded-none bg-ink text-white hover:bg-black py-6 text-[10px] font-semibold tracking-[0.14em]"
            >
              <Link href="/checkout">PROCEED TO CHECKOUT</Link>
            </Button>
            <p className="mt-3.5 text-center text-[10px] text-muted-foreground">
              Complimentary UK delivery on orders above £70.
            </p>
          </aside>
        </div>
      )}
    </PageShell>
  );
}
