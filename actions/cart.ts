"use server";

import { getProduct } from "@/lib/products/catalogue";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function validateCartItem(
  productId: string,
  quantity: number,
): Promise<ActionResponse> {
  if (typeof quantity !== "number" || isNaN(quantity) || quantity <= 0) {
    return { success: false, error: "Quantity must be greater than zero." };
  }
  const product = getProduct(productId);
  if (!product) {
    return { success: false, error: "Product not found" };
  }

  if (quantity > product.stock) {
    return {
      success: false,
      error: `Only ${product.stock} units available in stock.`,
    };
  }

  return { success: true, data: { product, quantity } };
}
