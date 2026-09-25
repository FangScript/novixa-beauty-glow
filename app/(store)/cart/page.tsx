"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { QuantityControl, RemoveButton } from "@/components/cart/QuantityControl";
import { EmptyState } from "@/components/shared/EmptyState";
import { cartProducts, formatPrice, useCommerce } from "@/lib/commerce/context";
import { Button } from "@/components/ui/button";

interface ShippingOption {
  id: string;
  name: string;
  price: number;
  timeframe: string;
  description?: string;
  isDefault?: boolean;
}

const DEFAULT_SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: "normal",
    name: "Normal Delivery",
    price: 0.20,
    timeframe: "3-5 days",
    description: "Standard tracked courier delivery within 3-5 business days.",
    isDefault: true,
  },
  {
    id: "express",
    name: "Express Delivery",
    price: 0.30,
    timeframe: "1-3 days",
    description: "Priority expedited courier dispatch with 1-3 business days delivery.",
    isDefault: false,
  },
];

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, subtotal } = useCommerce();
  const items = cartProducts(cart);

  const [shippingMethods, setShippingMethods] = useState<ShippingOption[]>(DEFAULT_SHIPPING_OPTIONS);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("normal");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("novixa_shipping_method_id") : null;
    fetch("/api/shipping-methods")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.methods) && data.methods.length > 0) {
          setShippingMethods(data.methods);
          if (saved && data.methods.some((m: any) => m.id === saved)) {
            setSelectedMethodId(saved);
          } else {
            const def = data.methods.find((m: any) => m.isDefault) || data.methods[0];
            setSelectedMethodId(def.id);
          }
        }
      })
      .catch((err) => console.warn("Failed to load shipping methods:", err));
  }, []);

  const selectedShipping =
    shippingMethods.find((m) => m.id === selectedMethodId) ||
    shippingMethods[0] ||
    DEFAULT_SHIPPING_OPTIONS[0];

  const shipping = items.length > 0 ? selectedShipping.price : 0;

  const handleSelectShipping = (method: ShippingOption) => {
    setSelectedMethodId(method.id);
    try {
      localStorage.setItem("novixa_shipping_method_id", method.id);
      localStorage.setItem("novixa_shipping_method_name", method.name);
    } catch {}
  };

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

          <aside className="h-fit border border-border bg-white/40 p-6 backdrop-blur-xs space-y-5">
            <h2 className="font-display text-2xl">Order Summary</h2>

            {/* Delivery Method Selection */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Select Delivery
                </span>
                <span className="text-[10px] text-muted-foreground">Tracked UK Courier</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {shippingMethods.map((method) => {
                  const isSelected = method.id === selectedShipping.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => handleSelectShipping(method)}
                      className={`relative flex items-center justify-between p-3 text-left border transition-all text-xs cursor-pointer ${
                        isSelected
                          ? "border-rosewood bg-rosewood/5 text-foreground ring-1 ring-rosewood"
                          : "border-border/70 hover:border-border text-muted-foreground hover:text-foreground bg-white/50"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-foreground">
                          {method.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {method.timeframe}
                        </span>
                      </div>
                      <span className="font-bold text-rosewood text-sm">
                        {formatPrice(method.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 text-sm border-t border-border/60 pt-4">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="text-foreground font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery ({selectedShipping.name})</span>
                <span className="text-foreground font-medium">
                  {formatPrice(shipping)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-4 font-semibold text-base text-foreground">
                <span>Estimated Total</span>
                <span>{formatPrice(subtotal + shipping)}</span>
              </div>
            </div>

            <Button
              asChild
              className="w-full rounded-none bg-ink text-white hover:bg-black py-6 text-[10px] font-semibold tracking-[0.14em]"
            >
              <Link href="/checkout">PROCEED TO CHECKOUT</Link>
            </Button>
          </aside>
        </div>
      )}
    </PageShell>
  );
}
