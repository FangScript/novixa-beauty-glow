"use client";
import * as Dialog from "@radix-ui/react-dialog";

import { useShipping } from "@/lib/commerce/use-shipping";
import { effectiveShippingPrice } from "@/lib/commerce/shipping";
import { useCheckoutQuote } from "@/lib/commerce/use-checkout-quote";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { X, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cartProducts, formatPrice, useCommerce } from "@/lib/commerce/context";
import { QuantityControl } from "@/components/cart/QuantityControl";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const {
    cart,
    updateQuantity,
    removeFromCart,
    subtotal: cartSubtotal,
    cartCount,
    isCartLoading,
    cartError,
    retryCart,
  } = useCommerce();

  const drawerRef = useRef<HTMLDivElement>(null);

  const {
    shippingMethods,
    selectedShippingMethod: selectedShipping,
    setSelectedShippingMethod: handleSelectShipping,
    isLoadingShipping,
    shippingError,
    retryShipping,
  } = useShipping();
  const { quote, quoteError, quoteReady } = useCheckoutQuote(
    cart,
    selectedShipping?.id,
    undefined,
    isLoadingShipping || Boolean(shippingError),
  );
  const items = cartProducts(quote?.items ?? cart);
  const subtotal = quote?.subtotal ?? cartSubtotal;
  const shippingCharge = quote?.shipping ?? 0;

  const opener = useRef<HTMLElement | null>(null);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          onOpenAutoFocus={() => {
            opener.current = document.activeElement as HTMLElement;
          }}
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
          className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-sm flex-col overflow-y-auto bg-background shadow-2xl pb-[env(safe-area-inset-bottom)]"
        >
          <Dialog.Title className="sr-only">Shopping bag</Dialog.Title>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-rosewood" />
              <span className="font-display text-xl">
                Shopping Bag
                {cartCount > 0 && (
                  <span className="ml-2 text-sm font-sans font-normal text-muted-foreground">
                    ({cartCount} {cartCount === 1 ? "item" : "items"})
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close cart"
              className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 px-5 py-4">
            {cartError && (
              <p role="alert">
                {cartError} <button onClick={retryCart}>Retry</button>
              </p>
            )}
            {isCartLoading ? (
              <div className="flex flex-col gap-4 pt-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-20 w-20 shrink-0 rounded-none bg-border/50" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 w-3/4 rounded bg-border/50" />
                      <div className="h-3 w-1/2 rounded bg-border/50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                <ShoppingBag size={40} className="text-border" />
                <p className="font-display text-xl text-foreground">Your bag is empty</p>
                <p className="text-sm text-muted-foreground">
                  Add a signature scent or beauty essential to begin.
                </p>
                <Button
                  onClick={onClose}
                  asChild
                  className="mt-2 rounded-none bg-ink text-white hover:bg-black text-[10px] tracking-widest py-5 px-8"
                >
                  <Link href="/shop">EXPLORE COLLECTION</Link>
                </Button>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {items.map(({ item, product }) => (
                    <li key={product.id} className="flex gap-4 py-4">
                      <Link
                        href={
                          item.productId.startsWith("bundle:")
                            ? "/bundles"
                            : `/products/${product.slug}`
                        }
                        onClick={onClose}
                        className="shrink-0"
                      >
                        <img
                          src={item.product?.image ?? product.images[0]}
                          alt={product.name}
                          className="h-20 w-20 object-cover bg-blush/20 border border-border/30"
                        />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <Link
                            href={
                              item.productId.startsWith("bundle:")
                                ? "/bundles"
                                : `/products/${product.slug}`
                            }
                            onClick={onClose}
                            className="block font-display text-sm leading-snug hover:text-rosewood transition-colors"
                          >
                            {product.name}
                          </Link>
                          <p className="mt-1 text-xs font-semibold text-foreground">
                            {formatPrice((product.salePrice ?? product.price) * item.quantity)}
                          </p>
                          {product.salePrice && (
                            <del className="text-[10px] text-muted-foreground">
                              {formatPrice(product.price * item.quantity)}
                            </del>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <QuantityControl
                            quantity={item.quantity}
                            max={Math.min(product.stock, 99)}
                            min={product.isMeasured ? 0.01 : 1}
                            step={product.isMeasured ? 0.01 : 1}
                            onChange={(n) => updateQuantity(product.id, n)}
                          />
                          <button
                            aria-label="Remove item"
                            onClick={() => removeFromCart(product.id)}
                            className="text-muted-foreground hover:text-rosewood transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="shrink-0 border-t border-border px-5 py-4 space-y-4 bg-background">
              {/* Delivery Method Options */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                    Delivery Method
                  </span>
                  <span className="text-[10px] text-muted-foreground">Select courier speed</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {shippingError && (
                    <p role="alert">
                      {shippingError}{" "}
                      <button type="button" onClick={retryShipping}>
                        Retry
                      </button>
                    </p>
                  )}
                  {shippingMethods.map((method) => {
                    const isSelected = method.id === selectedShipping?.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => handleSelectShipping(method)}
                        className={`relative flex flex-col justify-between p-2.5 text-left border transition-all text-xs cursor-pointer ${
                          isSelected
                            ? "border-rosewood bg-rosewood/5 text-foreground ring-1 ring-rosewood"
                            : "border-border/70 hover:border-border text-muted-foreground hover:text-foreground bg-sand/20"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-semibold text-[11px] text-foreground leading-tight">
                            {method.name}
                          </span>
                          <span className="font-bold text-rosewood text-xs">
                            {effectiveShippingPrice(method, subtotal) === 0
                              ? "Free"
                              : formatPrice(effectiveShippingPrice(method, subtotal))}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1">
                          {method.timeframe}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 text-sm pt-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal {quoteError && <span role="alert">� {quoteError}</span>}</span>
                  <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery ({selectedShipping?.name || "Delivery"})</span>
                  <span className="font-medium text-foreground">
                    {quoteReady ? formatPrice(shippingCharge) : "Calculating..."}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold text-base text-foreground">
                  <span>Total</span>
                  <span>
                    {quoteReady ? formatPrice(subtotal + shippingCharge) : "Calculating..."}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  asChild
                  onClick={onClose}
                  className="w-full rounded-none bg-ink text-white hover:bg-black py-6 text-[10px] font-semibold tracking-[0.14em]"
                >
                  <Link href="/checkout">PROCEED TO CHECKOUT</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  onClick={onClose}
                  className="w-full rounded-none text-[10px] font-semibold tracking-[0.12em]"
                >
                  <Link href="/cart">VIEW FULL BAG</Link>
                </Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
