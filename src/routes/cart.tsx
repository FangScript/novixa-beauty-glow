import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell, QuantityControl, EmptyState, RemoveButton } from "@/components/storefront";
import { cartProducts, formatPrice, useCommerce } from "@/lib/commerce";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/cart")({ component: Cart });
function Cart() {
  const { cart, updateQuantity, removeFromCart, subtotal } = useCommerce();
  const items = cartProducts(cart);
  const shipping = subtotal >= 5000 || subtotal === 0 ? 0 : 250;
  return (
    <PageShell eyebrow="Your edit" title="Shopping bag">
      {!items.length ? (
        <div className="mt-10">
          <EmptyState
            title="Your bag is waiting"
            copy="Add a signature scent or a beauty essential to get started."
          />
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="divide-y divide-border border-y border-border">
            {items.map(({ item, product }) => (
              <div key={product.id} className="flex gap-4 py-5">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-28 w-28 object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-3">
                    <div>
                      <Link
                        to="/products/$slug"
                        params={{ slug: product.slug }}
                        className="text-lg"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatPrice(product.salePrice ?? product.price)}
                      </p>
                    </div>
                    <RemoveButton onClick={() => removeFromCart(product.id)} />
                  </div>
                  <div className="mt-auto">
                    <QuantityControl
                      quantity={item.quantity}
                      onChange={(n) => updateQuantity(product.id, n)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <aside className="h-fit border border-border p-6">
            <h2 className="text-2xl">Order summary</h2>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{shipping ? formatPrice(shipping) : "Complimentary"}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-3 font-semibold">
                <span>Total</span>
                <span>{formatPrice(subtotal + shipping)}</span>
              </div>
            </div>
            <Button asChild className="mt-7 w-full rounded-none text-[10px] tracking-[0.14em]">
              <Link to="/checkout">CHECKOUT</Link>
            </Button>
            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              Taxes calculated at checkout.
            </p>
          </aside>
        </div>
      )}
    </PageShell>
  );
}
