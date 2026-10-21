import { prisma } from "@/lib/db/client";
import { CommerceError, normalizeCart, priceCart } from "./pricing";

/** All payment creation and order finalization use this one authoritative quote. */
export async function getCheckoutQuote(input: {
  items?: unknown;
  couponCode?: unknown;
  shippingMethodId?: unknown;
}) {
  const items = normalizeCart(input.items);
  if (
    input.couponCode !== undefined &&
    (typeof input.couponCode !== "string" || input.couponCode.length > 64)
  )
    throw new CommerceError("Invalid coupon code.");
  if (
    input.shippingMethodId !== undefined &&
    (typeof input.shippingMethodId !== "string" || input.shippingMethodId.length > 128)
  )
    throw new CommerceError("Invalid delivery method.");
  const code = typeof input.couponCode === "string" ? input.couponCode.trim().toUpperCase() : "";
  const methodId = typeof input.shippingMethodId === "string" ? input.shippingMethodId : "";
  const [products, coupon, method] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: items.map((line) => line.productId) }, status: "ACTIVE" },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    }),
    code ? prisma.coupon.findUnique({ where: { code } }) : null,
    methodId
      ? prisma.shippingMethod.findUnique({ where: { id: methodId } })
      : prisma.shippingMethod.findFirst({ where: { active: true, isDefault: true } }),
  ]);
  if (code && !coupon) throw new CommerceError("Coupon not found.");
  if (methodId && !method) throw new CommerceError("Delivery method not found.");
  return priceCart(
    items,
    products,
    coupon,
    method || { name: "Normal Delivery", price: 4.95, active: true },
  );
}
