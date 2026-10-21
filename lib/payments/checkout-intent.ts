import { createHash } from "node:crypto";
import { signValue, verifyValue } from "../security/signing";
import { normalizeCart, moneyInPence } from "../commerce/pricing";

export const CHECKOUT_COOKIE = "novixa_checkout_intent";
export const CHECKOUT_TTL = 60 * 60;
export interface CheckoutIntent {
  orderId: string;
  cartHash: string;
  totalPence: number;
  currency: "GBP";
  expiresAt: number;
}
export function cartHash(input: unknown) {
  const items = normalizeCart(input).sort((a, b) => a.productId.localeCompare(b.productId));
  return createHash("sha256").update(JSON.stringify(items)).digest("hex");
}
export function createCheckoutIntent(
  orderId: string,
  items: unknown,
  total: number,
  now = Date.now(),
) {
  const intent: CheckoutIntent = {
    orderId,
    cartHash: cartHash(items),
    totalPence: moneyInPence(total),
    currency: "GBP",
    expiresAt: now + CHECKOUT_TTL * 1000,
  };
  const payload = Buffer.from(JSON.stringify(intent)).toString("base64url");
  return payload + "." + signValue("checkout:" + payload);
}
export function verifyCheckoutIntent(
  token: string | undefined,
  orderId: string,
  now = Date.now(),
): CheckoutIntent {
  try {
    if (!token || token.length > 2048) throw new Error();
    const parts = token.split(".");
    if (parts.length !== 2 || !verifyValue("checkout:" + parts[0], parts[1])) throw new Error();
    const intent = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (
      intent.orderId !== orderId ||
      intent.currency !== "GBP" ||
      !Number.isSafeInteger(intent.totalPence) ||
      intent.totalPence < 1 ||
      !Number.isFinite(intent.expiresAt) ||
      intent.expiresAt <= now
    )
      throw new Error();
    return intent as CheckoutIntent;
  } catch {
    throw new Error("This payment does not belong to the current checkout or has expired.");
  }
}
export function assertIntentQuote(intent: CheckoutIntent, items: unknown, total: number) {
  if (intent.cartHash !== cartHash(items) || intent.totalPence !== moneyInPence(total))
    throw new Error("Checkout contents or total changed. Start a new payment.");
}
export function assertProviderAmount(order: any, expectedPence: number, captured = false) {
  if (order.purchase_units?.length !== 1) throw new Error("Invalid provider purchase units.");
  const unit = order.purchase_units[0];
  if (captured) {
    const captures = unit.payments?.captures;
    if (
      order.status !== "COMPLETED" ||
      captures?.length !== 1 ||
      captures[0].status !== "COMPLETED" ||
      !captures[0].id
    )
      throw new Error("Payment capture is not complete.");
    if (
      captures[0].amount?.currency_code !== "GBP" ||
      moneyInPence(captures[0].amount?.value) !== expectedPence
    )
      throw new Error("Captured payment amount/currency mismatch.");
    return captures[0];
  }
  if (unit.amount?.currency_code !== "GBP" || moneyInPence(unit.amount?.value) !== expectedPence)
    throw new Error("Provider order amount/currency mismatch.");
  return null;
}
