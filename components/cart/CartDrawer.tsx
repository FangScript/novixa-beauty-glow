"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { X, ShoppingBag, Trash2, Plus, Minus, Sparkles, Truck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cartProducts, formatPrice, useCommerce } from "@/lib/commerce/context";
import { QuantityControl } from "@/components/cart/QuantityControl";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface AddOnProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  slug: string;
  image: string;
  category: string;
}

const CURATED_ADDONS: AddOnProduct[] = [
  {
    id: "p29",
    name: "Atelier Travel Refill Atomizer",
    description: "5ml luxury pocket fine-mist atomizer",
    price: 22,
    slug: "atelier-travel-refill-atomizer",
    image: "/images/category-accessories.jpg",
    category: "Accessories",
  },
  {
    id: "p21",
    name: "Lustre Lip Oil (Bare Rose)",
    description: "Cushiony conditioning rose lip glaze",
    price: 22,
    slug: "lustre-lip-oil",
    image: "/images/category-makeup.jpg",
    category: "Makeup",
  },
  {
    id: "p7",
    name: "Blending Sponges (Set of 3)",
    description: "Latex-free velvety airbrush sponges",
    price: 18,
    slug: "blending-sponges-set",
    image: "/images/product-sponges.jpg",
    category: "Tools",
  },
];

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { cart, updateQuantity, removeFromCart, addToCart, subtotal, cartCount, isCartLoading } =
    useCommerce();
  const items = cartProducts(cart);
  const FREE_SHIPPING_THRESHOLD = 70;
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const amountNeeded = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const shipping = isFreeShipping || subtotal === 0 ? 0 : 4.95;
  const drawerRef = useRef<HTMLDivElement>(null);

  const [addingId, setAddingId] = useState<string | null>(null);

  // Find the first curated add-on that is not already in the customer's cart
  const activeAddOn = CURATED_ADDONS.find(
    (addon) => !cart.some((item) => item.productId === addon.id),
  );

  const handleAddAddon = async (addon: AddOnProduct) => {
    try {
      setAddingId(addon.id);
      await addToCart(addon.id, 1);
    } finally {
      setTimeout(() => {
        setAddingId(null);
      }, 1000);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-background shadow-2xl"
        style={{ animation: "slideInRight 0.25s ease-out" }}
      >
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

        {/* Visual Free Shipping Progress Meter */}
        <div className="border-b border-border/80 bg-sand/30 dark:bg-card/80 px-5 py-3.5 transition-colors">
          {subtotal === 0 ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Truck size={14} className="text-rosewood shrink-0" />
              <span>
                Complimentary Royal Mail delivery on orders over{" "}
                <strong className="text-foreground">{formatPrice(FREE_SHIPPING_THRESHOLD)}</strong>
              </span>
            </div>
          ) : isFreeShipping ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-rosewood dark:text-amber-400">
                  <Sparkles size={14} className="text-amber-500 animate-pulse shrink-0" />
                  <span className="font-semibold">✨ Complimentary UK Delivery Unlocked!</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-rosewood dark:text-amber-400">
                  100%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rosewood via-amber-400 to-[#c9a982] transition-all duration-700 ease-out shadow-sm"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground/90 font-medium flex items-center gap-1.5 leading-tight">
                  <Truck size={13} className="text-rosewood shrink-0" />
                  <span>
                    Add{" "}
                    <strong className="font-semibold text-rosewood">
                      {formatPrice(amountNeeded)}
                    </strong>{" "}
                    more for complimentary UK delivery
                  </span>
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground ml-2 shrink-0">
                  {progressPercent}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rosewood via-[#c9a982] to-[#b3895b] transition-all duration-700 ease-out"
                  style={{ width: `${Math.max(6, progressPercent)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
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
                    <Link href={`/products/${product.slug}`} onClick={onClose} className="shrink-0">
                      <img
                        src={item.product?.image ?? product.images[0]}
                        alt={product.name}
                        className="h-20 w-20 object-cover bg-blush/20 border border-border/30"
                      />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <Link
                          href={`/products/${product.slug}`}
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
                          max={product.stock}
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

              {/* 1-Click Curated Add-on */}
              {activeAddOn && (
                <div className="mt-5 rounded-none border border-border/80 bg-sand/30 dark:bg-card/70 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-1.5">
                      <Sparkles size={11} className="text-rosewood" />
                      Curated Pairing
                    </span>
                    {!isFreeShipping && (
                      <span className="text-[9px] font-medium tracking-wide bg-rosewood/10 text-rosewood px-2 py-0.5 rounded-none">
                        Reaches Free Shipping
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/products/${activeAddOn.slug}`}
                      onClick={onClose}
                      className="shrink-0"
                    >
                      <img
                        src={activeAddOn.image}
                        alt={activeAddOn.name}
                        className="h-14 w-14 object-cover border border-border/40 bg-white"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${activeAddOn.slug}`}
                        onClick={onClose}
                        className="block font-display text-xs font-medium hover:text-rosewood transition-colors truncate"
                      >
                        {activeAddOn.name}
                      </Link>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {activeAddOn.description}
                      </p>
                      <p className="text-xs font-semibold text-foreground mt-0.5">
                        {formatPrice(activeAddOn.price)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddAddon(activeAddOn)}
                      disabled={addingId === activeAddOn.id}
                      aria-label={`Add ${activeAddOn.name} to bag`}
                      className="shrink-0 flex items-center gap-1 px-3 py-2 bg-ink text-white hover:bg-black transition-all text-[10px] font-semibold tracking-wider uppercase disabled:opacity-50"
                    >
                      {addingId === activeAddOn.id ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus size={12} />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border px-5 py-5 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span className="font-medium text-foreground">
                  {shipping === 0 ? "Complimentary" : formatPrice(shipping)}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Add {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} more for free delivery.
                </p>
              )}
              <div className="flex justify-between border-t border-border pt-2 font-semibold text-base text-foreground">
                <span>Total</span>
                <span>{formatPrice(subtotal + shipping)}</span>
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
      </div>

      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
