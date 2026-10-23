"use client";

import {
  createContext,
  useContext,
  useEffect,
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
  addToCart: (id: string, quantity?: number) => Promise<void>;
  addBundle: (id: string) => Promise<void>;
  cartError: string | null;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  toggleWishlist: (id: string) => void;
  isWishlisted: (id: string) => boolean;
  cartCount: number;
  subtotal: number;
  clearCart: () => Promise<void>;
  isCartLoading: boolean;
};

const CommerceContext = createContext<CommerceContextType | null>(null);

const isBundle = (item: CartItem) => item.productId.startsWith("bundle:");
function readLS<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable */
  }
}
async function cartRequest(path: string, method = "GET", body?: unknown) {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok || data.source === "error" || data.source === "no-db")
    throw new Error(data.error || "Shopping bag is unavailable. Please try again.");
  return data;
}

export function CommerceProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId?: string | null;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [cartError, setCartError] = useState<string | null>(null);
  const cartRef = useRef<CartItem[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const commit = useCallback((items: CartItem[]) => {
    cartRef.current = items;
    setCart(items);
    writeLS("novixa-cart", items);
  }, []);
  const verify = useCallback(
    async (items: CartItem[]) => {
      if (!items.length) {
        commit([]);
        return;
      }
      const data = await cartRequest("/api/cart/quote", "POST", { items });
      commit(
        data.items.map((item: CartItem) => ({
          ...item,
          id: items.find((i) => i.productId === item.productId)?.id,
        })),
      );
    },
    [commit],
  );
  const enqueue = useCallback((operation: () => Promise<void>) => {
    pending.current++;
    setIsCartLoading(true);
    const task = queue.current.then(async () => {
      try {
        await operation();
        setCartError(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update shopping bag.";
        setCartError(message);
        toast.error(message);
      } finally {
        pending.current--;
        setIsCartLoading(pending.current > 0);
      }
    });
    queue.current = task;
    return task;
  }, []);

  useEffect(() => {
    void enqueue(async () => {
      const local = readLS<CartItem[]>("novixa-cart", []);
      const data = await cartRequest("/api/cart");
      let server: CartItem[] = data.items;
      // Import legacy guest items once, then use server quantities as authoritative.
      if (!server.length) {
        for (const item of local.filter((i) => !isBundle(i))) {
          const synced = await cartRequest("/api/cart", "POST", {
            productId: item.productId,
            quantity: item.quantity,
          });
          server = synced.items;
        }
      }
      commit([...server, ...local.filter(isBundle)]);
      await verify([...server, ...local.filter(isBundle)]);
    });
    setWishlist(readLS<string[]>("novixa-wishlist", []));
    if (userId)
      void cartRequest("/api/wishlist")
        .then(async (data) => {
          if (!Array.isArray(data.items)) return;
          let serverIds: string[] = data.items.map((i: { productId: string }) => i.productId);
          const localIds = readLS<string[]>("novixa-wishlist", []);
          const missing = localIds.filter((id) => !serverIds.includes(id));
          if (missing.length) {
            const synced = await cartRequest("/api/wishlist", "POST", { productIds: missing });
            if (Array.isArray(synced.items))
              serverIds = synced.items.map((i: { productId: string }) => i.productId);
          }
          const ids = [...new Set([...localIds, ...serverIds])];
          setWishlist(ids);
          writeLS("novixa-wishlist", ids);
        })
        .catch(() => {});
    const refresh = () => {
      void enqueue(async () => {
        const data = await cartRequest("/api/cart");
        await verify([...data.items, ...cartRef.current.filter(isBundle)]);
      });
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [userId, enqueue, verify, commit]);

  const addToCart = useCallback(
    (productId: string, quantity = 1) =>
      enqueue(async () => {
        const data = await cartRequest("/api/cart", "POST", { productId, quantity });
        await verify([...data.items, ...cartRef.current.filter(isBundle)]);
        toast.success("Added to shopping bag");
      }),
    [enqueue, verify],
  );
  const addBundle = useCallback(
    (id: string) =>
      enqueue(async () => {
        const productId = "bundle:" + id;
        const current = cartRef.current;
        const existing = current.find((i) => i.productId === productId);
        await verify(
          existing
            ? current.map((i) =>
                i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i,
              )
            : [...current, { productId, quantity: 1 }],
        );
        toast.success("Bundle added to shopping bag");
      }),
    [enqueue, verify],
  );
  const updateQuantity = useCallback(
    (productId: string, quantity: number) =>
      enqueue(async () => {
        const current = cartRef.current;
        const item = current.find((i) => i.productId === productId);
        if (!item) return;
        if (isBundle(item)) {
          await verify(
            quantity <= 0
              ? current.filter((i) => i.productId !== productId)
              : current.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
          );
        } else {
          await cartRequest("/api/cart", "PUT", { productId, quantity });
          const data = await cartRequest("/api/cart");
          await verify([...data.items, ...current.filter(isBundle)]);
        }
      }),
    [enqueue, verify],
  );
  const removeFromCart = useCallback(
    (id: string) => {
      void updateQuantity(id, 0);
    },
    [updateQuantity],
  );
  const clearCart = useCallback(
    () =>
      enqueue(async () => {
        await cartRequest("/api/cart?clear=true", "DELETE");
        commit([]);
      }),
    [enqueue, commit],
  );
  const toggleWishlist = useCallback(
    (productId: string) => {
      const exists = wishlist.includes(productId);
      const next = exists ? wishlist.filter((id) => id !== productId) : [...wishlist, productId];
      setWishlist(next);
      writeLS("novixa-wishlist", next);
      if (userId)
        void cartRequest(
          exists ? `/api/wishlist?productId=${encodeURIComponent(productId)}` : "/api/wishlist",
          exists ? "DELETE" : "POST",
          exists ? undefined : { productId },
        ).catch(() => {
          setWishlist(wishlist);
          writeLS("novixa-wishlist", wishlist);
          toast.error("Unable to update wishlist.");
        });
    },
    [userId, wishlist],
  );
  const subtotal =
    Math.round(
      cart.reduce(
        (sum, item) =>
          sum +
          Math.round((item.product?.salePrice ?? item.product?.price ?? 0) * 100 * item.quantity),
        0,
      ),
    ) / 100;
  const cartCount = Math.round(cart.reduce((sum, item) => sum + item.quantity, 0) * 100) / 100;
  return (
    <CommerceContext.Provider
      value={{
        cart,
        wishlist,
        addToCart,
        addBundle,
        updateQuantity,
        removeFromCart,
        toggleWishlist,
        isWishlisted: (id) => wishlist.includes(id),
        cartCount,
        subtotal,
        clearCart,
        isCartLoading,
        cartError,
      }}
    >
      {children}
    </CommerceContext.Provider>
  );
}

export const useCommerce = () => {
  const ctx = useContext(CommerceContext);
  if (!ctx) throw new Error("useCommerce must be used within CommerceProvider");
  return ctx;
};

/** Only render server-verified product snapshots. */
export const cartProducts = (cart: CartItem[]) =>
  cart
    .filter((item) => item.product)
    .map((item) => ({
      item,
      product: {
        ...item.product!,
        salePrice: item.product!.salePrice ?? undefined,
        images: [item.product!.image],
      } as unknown as Product,
    }));
