"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  getProduct,
  products,
  formatPrice,
  searchProducts,
  type Product,
  type Gender,
  type ProductCategory,
} from "@/lib/products/catalogue";

export { formatPrice, getProduct, products, searchProducts };
export type { Gender, ProductCategory, Product };

export type CartItem = {
  id?: string; // DB row ID (present when server-backed)
  productId: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    slug: string;
    price: number;
    salePrice: number | null;
    stock: number;
    sku: string;
    image: string;
  };
};

type CommerceContextType = {
  cart: CartItem[];
  wishlist: string[];
  addToCart: (id: string, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  toggleWishlist: (id: string) => void;
  isWishlisted: (id: string) => boolean;
  cartCount: number;
  subtotal: number;
  clearCart: () => void;
  isCartLoading: boolean;
};

const CommerceContext = createContext<CommerceContextType | null>(null);

// ── helpers ─────────────────────────────────────────────────────────────────

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/** Resolve a CartItem's price from the live product catalogue or DB snapshot. */
function itemPrice(item: CartItem): number {
  if (item.product) return item.product.salePrice ?? item.product.price;
  const p = getProduct(item.productId);
  return p?.salePrice ?? p?.price ?? 0;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function CommerceProvider({
  children,
  userId,
}: {
  children: ReactNode;
  /** The current Supabase user ID — passed down from a server component or auth context. */
  userId?: string | null;
}) {
  const [mounted, setMounted] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const hasHydratedRef = useRef(false);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // ── Initial hydration ──────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);

    async function hydrate() {
      setIsCartLoading(true);

      // 1. Try server-backed cart first
      try {
        const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
        const res = await fetch(`/api/cart${qs}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items) && data.items.length > 0) {
            const sanitizedItems: CartItem[] = data.items.map((i: CartItem) => {
              const rawQty = Number(i.quantity);
              return {
                ...i,
                quantity: isNaN(rawQty) || rawQty <= 0 ? 1 : Math.round(rawQty * 100) / 100,
              };
            });
            if (data.source === "db") {
              setCart(sanitizedItems);
              writeLS("novixa-cart", sanitizedItems);
              hasHydratedRef.current = true;
              setIsCartLoading(false);
              return;
            }
          }
        }
      } catch {
        // fall through to localStorage
      }

      // 2. Fallback: localStorage with live DB product price refresh
      const localCart = readLS<CartItem[]>("novixa-cart", []);
      if (localCart.length > 0) {
        const pIds = localCart.map((i) => i.productId).filter(Boolean);
        if (pIds.length > 0) {
          try {
            const pRes = await fetch(`/api/products?ids=${encodeURIComponent(pIds.join(","))}`);
            if (pRes.ok) {
              const pData = await pRes.json();
              if (Array.isArray(pData.products) && pData.products.length > 0) {
                const pMap = new Map(pData.products.map((p: any) => [p.id, p]));
                localCart.forEach((item) => {
                  const dbP: any = pMap.get(item.productId);
                  if (dbP) {
                    item.product = {
                      id: dbP.id,
                      name: dbP.name,
                      slug: dbP.slug,
                      price: Number(dbP.price),
                      salePrice: dbP.salePrice !== undefined && dbP.salePrice !== null ? Number(dbP.salePrice) : null,
                      stock: Number(dbP.stock),
                      sku: dbP.sku,
                      image: dbP.images?.[0] ?? "/images/product-perfume.jpg",
                    };
                  }
                });
              }
            }
          } catch {
            // Keep existing product snapshots
          }
        }
        const sanitized = localCart.map((i) => {
          const rawQty = Number(i.quantity);
          return {
            ...i,
            quantity: isNaN(rawQty) || rawQty <= 0 ? 1 : Math.round(rawQty * 100) / 100,
          };
        });
        setCart(sanitized);
        writeLS("novixa-cart", sanitized);
      } else {
        setCart([]);
      }

      hasHydratedRef.current = true;
      setIsCartLoading(false);
    }

    async function hydrateWishlist() {
      const localWishlist = readLS<string[]>("novixa-wishlist", []);
      if (!userId) {
        setWishlist(localWishlist);
        return;
      }

      try {
        const res = await fetch(`/api/wishlist?userId=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          let serverIds: string[] = [];
          if (data.source === "db" && Array.isArray(data.items)) {
            serverIds = data.items.map((i: { productId: string }) => i.productId);
          }

          // Guest to customer wishlist merge
          const missingOnServer = localWishlist.filter((id) => !serverIds.includes(id));
          if (missingOnServer.length > 0) {
            try {
              const syncRes = await fetch("/api/wishlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productIds: missingOnServer }),
              });
              if (syncRes.ok) {
                const syncData = await syncRes.json();
                if (Array.isArray(syncData.items)) {
                  serverIds = syncData.items.map((i: { productId: string }) => i.productId);
                }
              }
            } catch {}
          }

          const combined = Array.from(new Set([...serverIds, ...localWishlist]));
          setWishlist(combined);
          writeLS("novixa-wishlist", combined);
          return;
        }
      } catch {}

      setWishlist(localWishlist);
    }

    hydrate();
    hydrateWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Persist cart to localStorage as a write-through ───────────────────────
  useEffect(() => {
    if (!mounted || !hasHydratedRef.current) return;
    writeLS("novixa-cart", cart);
  }, [cart, mounted]);

  useEffect(() => {
    if (!mounted) return;
    writeLS("novixa-wishlist", wishlist);
  }, [wishlist, mounted]);

  // ── Cart mutations ─────────────────────────────────────────────────────────

  const addToCart = useCallback(async (productId: string, quantity = 1) => {
    const localProduct = getProduct(productId);
    const rawQty = Number(quantity);
    const cleanQty = isNaN(rawQty) || rawQty <= 0 ? 1 : Math.round(rawQty * 100) / 100;
    const stock = localProduct?.stock ?? Infinity;
    if (cleanQty <= 0) return;

    const pName = localProduct?.name || "Product";
    const unitLabel = cleanQty === 1 ? "unit" : "units";

    // Optimistic update
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId
            ? { ...i, quantity: Math.min(Math.round((i.quantity + cleanQty) * 100) / 100, stock) }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId,
          quantity: Math.min(cleanQty, stock),
          product: localProduct
            ? {
                id: localProduct.id,
                name: localProduct.name,
                slug: localProduct.slug,
                price: localProduct.price,
                salePrice: localProduct.salePrice ?? null,
                stock: localProduct.stock,
                sku: localProduct.sku,
                image: localProduct.images[0] || "/images/product-perfume.jpg",
              }
            : undefined,
        },
      ];
    });

    toast.success("Added to shopping bag", {
      description: `${pName} (${cleanQty} ${unitLabel})`,
    });

    // Server sync
    if (userIdRef.current !== undefined) {
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, quantity: cleanQty, userId: userIdRef.current }),
        });
        const data = await res.json();
        if (res.ok && data.ok && Array.isArray(data.items)) {
          setCart(data.items);
        } else if (!res.ok) {
          // Rollback on server error
          setCart((prev) => {
            const existing = prev.find((i) => i.productId === productId);
            if (!existing) return prev.filter((i) => i.productId !== productId);
            const rolledBackQty = Math.round((existing.quantity - cleanQty) * 100) / 100;
            if (rolledBackQty <= 0) return prev.filter((i) => i.productId !== productId);
            return prev.map((i) =>
              i.productId === productId ? { ...i, quantity: rolledBackQty } : i,
            );
          });
          toast.error(data.error || "Failed to update bag on server");
        }
      } catch {
        // Keep optimistic state on network error
      }
    }
  }, []);

  const updateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      const prev = [...cart];
      const rawQty = Number(quantity);
      const cleanQty = Math.round(rawQty * 100) / 100;

      if (cleanQty <= 0) {
        setCart((c) => c.filter((i) => i.productId !== productId));
        const item = prev.find((i) => i.productId === productId);
        toast.info("Item removed from bag");
        if (item?.id) {
          fetch(`/api/cart?itemId=${item.id}`, { method: "DELETE" }).catch(() => {});
        }
        return;
      }

      setCart((c) => c.map((i) => (i.productId === productId ? { ...i, quantity: cleanQty } : i)));
      toast.info("Shopping bag updated", {
        description: `Quantity updated to ${cleanQty}`,
      });

      const item = prev.find((i) => i.productId === productId);
      if (item?.id) {
        try {
          await fetch("/api/cart", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId: item.id, quantity: cleanQty }),
          });
        } catch {}
      }
    },
    [cart],
  );

  const removeFromCart = useCallback(
    async (productId: string) => {
      const item = cart.find((i) => i.productId === productId);
      const localProduct = getProduct(productId);
      setCart((c) => c.filter((i) => i.productId !== productId));
      toast.info("Item removed from bag", {
        description: localProduct?.name,
      });
      if (item?.id) {
        fetch(`/api/cart?itemId=${item.id}`, { method: "DELETE" }).catch(() => {});
      }
    },
    [cart],
  );

  const clearCart = useCallback(async () => {
    setCart([]);
    if (userIdRef.current !== undefined) {
      const qs = userId ? `?userId=${encodeURIComponent(userId)}&clear=true` : "?clear=true";
      fetch(`/api/cart${qs}`, { method: "DELETE" }).catch(() => {});
    }
  }, [userId]);

  // ── Wishlist mutations ─────────────────────────────────────────────────────

  const toggleWishlist = useCallback(
    async (productId: string) => {
      const isIn = wishlist.includes(productId);
      const localProduct = getProduct(productId);
      const pName = localProduct?.name || "Product";

      // Optimistic
      setWishlist((w) => (isIn ? w.filter((id) => id !== productId) : [...w, productId]));

      if (isIn) {
        toast.info("Removed from your wishlist", { description: pName });
      } else {
        toast.success("Saved to your wishlist", { description: pName });
      }

      if (!userIdRef.current) return; // guest — localStorage only

      try {
        if (isIn) {
          await fetch(
            `/api/wishlist?productId=${encodeURIComponent(productId)}&userId=${encodeURIComponent(userIdRef.current)}`,
            { method: "DELETE" },
          );
        } else {
          await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId, userId: userIdRef.current }),
          });
        }
      } catch {
        // rollback
        setWishlist((w) => (isIn ? [...w, productId] : w.filter((id) => id !== productId)));
      }
    },
    [wishlist],
  );

  const isWishlisted = useCallback((productId: string) => wishlist.includes(productId), [wishlist]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const cartCount = useMemo(
    () => Math.round(cart.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0) * 100) / 100,
    [cart],
  );

  const subtotal = useMemo(
    () => Math.round(cart.reduce((sum, i) => sum + itemPrice(i) * i.quantity, 0) * 100) / 100,
    [cart],
  );

  const value = useMemo(
    () => ({
      cart,
      wishlist,
      addToCart,
      updateQuantity,
      removeFromCart,
      toggleWishlist,
      isWishlisted,
      cartCount,
      subtotal,
      clearCart,
      isCartLoading,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, wishlist, cartCount, subtotal, isCartLoading],
  );

  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>;
}

export const useCommerce = () => {
  const ctx = useContext(CommerceContext);
  if (!ctx) throw new Error("useCommerce must be used within CommerceProvider");
  return ctx;
};

/** Helper: resolve full product objects for cart items (uses DB snapshot when available). */
export const cartProducts = (cart: CartItem[]) =>
  cart
    .map((item) => {
      // If server gave us a product snapshot, use it
      if (item.product) {
        return {
          item,
          product: {
            id: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            price: item.product.price,
            salePrice: item.product.salePrice ?? undefined,
            stock: item.product.stock,
            sku: item.product.sku,
            images: [item.product.image],
            // minimal shape to avoid import chasing
          } as unknown as Product,
        };
      }
      // Fallback to in-memory catalogue
      const product = getProduct(item.productId);
      return product ? { item, product } : null;
    })
    .filter((entry): entry is { item: CartItem; product: Product } => entry !== null);
