import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getProduct, products, type Product } from "@/lib/commerce/catalogue";
export { formatPrice, getProduct, products, searchProducts } from "@/lib/commerce/catalogue";
export type { Gender, ProductCategory, Product } from "@/lib/commerce/catalogue";

type CartItem = { productId: string; quantity: number };
type CommerceContext = {
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
};
const CommerceContext = createContext<CommerceContext | null>(null);

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function CommerceProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  useEffect(() => {
    setCart(readStored<CartItem[]>("novixa-cart", []));
    setWishlist(readStored<string[]>("novixa-wishlist", []));
  }, []);
  useEffect(() => {
    localStorage.setItem("novixa-cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    localStorage.setItem("novixa-wishlist", JSON.stringify(wishlist));
  }, [wishlist]);
  const addToCart = (id: string, quantity = 1) => {
    const stock = getProduct(id)?.stock ?? 0;
    if (!stock || quantity <= 0) return;
    setCart((items) => {
      const existing = items.find((item) => item.productId === id);
      return existing
        ? items.map((item) =>
            item.productId === id
              ? { ...item, quantity: Math.min(item.quantity + quantity, stock) }
              : item,
          )
        : [...items, { productId: id, quantity: Math.min(quantity, stock) }];
    });
  };
  const updateQuantity = (id: string, quantity: number) =>
    setCart((items) =>
      quantity <= 0
        ? items.filter((item) => item.productId !== id)
        : items.map((item) =>
            item.productId === id
              ? { ...item, quantity: Math.min(quantity, getProduct(id)?.stock ?? 0) }
              : item,
          ),
    );
  const value = useMemo(
    () => ({
      cart,
      wishlist,
      addToCart,
      updateQuantity,
      removeFromCart: (id: string) => updateQuantity(id, 0),
      toggleWishlist: (id: string) =>
        setWishlist((items) =>
          items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
        ),
      isWishlisted: (id: string) => wishlist.includes(id),
      cartCount: cart.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: cart.reduce((sum, item) => {
        const product = getProduct(item.productId);
        return sum + (product?.salePrice ?? product?.price ?? 0) * item.quantity;
      }, 0),
      clearCart: () => setCart([]),
    }),
    [cart, wishlist],
  );
  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>;
}
export const useCommerce = () => {
  const context = useContext(CommerceContext);
  if (!context) throw new Error("useCommerce must be used within CommerceProvider");
  return context;
};
export const cartProducts = (cart: CartItem[]) =>
  cart
    .map((item) => ({ item, product: getProduct(item.productId) }))
    .filter((entry): entry is { item: CartItem; product: Product } => Boolean(entry.product));
export type { CartItem };
