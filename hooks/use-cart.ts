"use client";

import { useCommerce } from "@/lib/commerce/context";

export function useCart() {
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, cartCount, subtotal } =
    useCommerce();

  return {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartCount,
    subtotal,
  };
}
