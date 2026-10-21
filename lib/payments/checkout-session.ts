import { cookies } from "next/headers";
import { CHECKOUT_COOKIE, verifyCheckoutIntent } from "./checkout-intent";

export async function requireCheckoutIntent(orderId: unknown) {
  if (typeof orderId !== "string" || !/^[A-Z0-9]{10,32}$/.test(orderId))
    throw new Error("Invalid PayPal order ID.");
  const store = await cookies();
  return verifyCheckoutIntent(store.get(CHECKOUT_COOKIE)?.value, orderId);
}
