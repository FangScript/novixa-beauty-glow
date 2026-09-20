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

  const shipping = subtotal >= 5000 ? 0 : 250;
  const total = subtotal + shipping;
  const orderNumber = `NV-${Math.floor(1000 + Math.random() * 9000)}`;

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
