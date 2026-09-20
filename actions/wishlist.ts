"use server";

import { getProduct } from "@/lib/products/catalogue";

export async function toggleWishlistAction(productId: string) {
  const product = getProduct(productId);
  if (!product) {
    return { success: false, error: "Product not found." };
  }

  return { success: true, productId: product.id };
}
