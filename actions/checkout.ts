"use server";

import { getProduct } from "@/lib/products/catalogue";

type CheckoutItem = { productId: string; quantity: number };

export async function processCheckoutAction(items: CheckoutItem[], customerEmail: string) {
  if (!items || items.length === 0) {
    return { success: false, error: "Cannot checkout with an empty bag." };
  }

  let subtotal = 0;
  for (const item of items) {
    const product = getProduct(item.productId);
    if (!product) {
      return { success: false, error: `Invalid product in cart: ${item.productId}` };
    }
    if (item.quantity > product.stock) {
      return {
        success: false,
        error: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
      };
    }
    const unitPrice = product.salePrice ?? product.price;
    subtotal += unitPrice * item.quantity;
  }

  const shipping = subtotal >= 70 ? 0 : 4.95;
  const total = Math.round((subtotal + shipping) * 100) / 100;
  const orderNumber = `NVX-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    success: true,
    data: {
      orderNumber,
      customerEmail,
      subtotal,
      shipping,
      total,
      createdAt: new Date().toISOString(),
    },
  };
}
