"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { X, ShoppingBag, Trash2, Plus, Minus, Check, Sparkles } from "lucide-react";
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

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { cart, updateQuantity, removeFromCart, addToCart, subtotal, cartCount, isCartLoading } =
    useCommerce();
  const items = cartProducts(cart);
  const drawerRef = useRef<HTMLDivElement>(null);

  const [shippingMethods, setShippingMethods] = useState<ShippingOption[]>(DEFAULT_SHIPPING_OPTIONS);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("normal");
  const [addingId, setAddingId] = useState<string | null>(null);

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

  const shippingCharge = items.length > 0 ? selectedShipping.price : 0;

  const handleSelectShipping = (method: ShippingOption) => {
    setSelectedMethodId(method.id);
    try {
      localStorage.setItem("novixa_shipping_method_id", method.id);
      localStorage.setItem("novixa_shipping_method_name", method.name);
    } catch {}
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
                    <span className="text-[9px] font-medium tracking-wide bg-rosewood/10 text-rosewood px-2 py-0.5 rounded-none">
                      Recommended
                    </span>
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
          <div className="border-t border-border px-5 py-4 space-y-4 bg-background">
            {/* Delivery Method Options */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Delivery Method
                </span>
                <span className="text-[10px] text-muted-foreground">Select courier speed</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {shippingMethods.map((method) => {
                  const isSelected = method.id === selectedShipping.id;
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
                          {formatPrice(method.price)}
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
                <span>Subtotal</span>
                <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery ({selectedShipping.name})</span>
                <span className="font-medium text-foreground">
                  {formatPrice(shippingCharge)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold text-base text-foreground">
                <span>Total</span>
                <span>{formatPrice(subtotal + shippingCharge)}</span>
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
