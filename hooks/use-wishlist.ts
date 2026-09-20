"use client";

import { useCommerce } from "@/lib/commerce/context";

export function useWishlist() {
  const { wishlist, toggleWishlist, isWishlisted } = useCommerce();

  return {
    wishlist,
    toggleWishlist,
    isWishlisted,
  };
}
