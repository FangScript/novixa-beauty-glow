import type { Prisma } from "@prisma/client";
import { ApiError } from "../security/api";
type SavedOrder = Prisma.OrderGetPayload<{
  include: { items: true; payment: true; shippingMethod: true };
}>;
/** Must run in one database transaction; failures roll back the claim and stock. */
export async function reserveSavedOrder(tx: Prisma.TransactionClient, order: SavedOrder) {
  const claimed = await tx.payment.updateMany({
    where: { id: order.payment!.id, status: "UNPAID" },
    data: { status: "PROCESSING" },
  });
  if (!claimed.count) {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: order.payment!.id } });
    if (!["PROCESSING", "PAID"].includes(payment.status))
      throw new ApiError("This checkout cannot be captured. Contact support if charged.", 409);
    if (payment.status === "PROCESSING")
      await tx.payment.update({ where: { id: payment.id }, data: { updatedAt: new Date() } });
    return;
  }
  for (const item of order.items) {
    if (!item.productId) throw new ApiError("An item is no longer available.", 409);
    const changed = await tx.product.updateMany({
      where: { id: item.productId, status: "ACTIVE", stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (changed.count !== 1)
      throw new ApiError("An item sold out before payment. Refresh your bag.", 409);
  }
  if (order.couponId) {
    const coupon = await tx.coupon.findUnique({ where: { id: order.couponId } });
    if (
      !coupon ||
      !coupon.active ||
      (coupon.expiresAt && coupon.expiresAt <= new Date()) ||
      (coupon.startsAt && coupon.startsAt > new Date())
    )
      throw new ApiError("The coupon is no longer available.", 409);
    const changed = await tx.coupon.updateMany({
      where: {
        id: coupon.id,
        active: true,
        usageCount: coupon.usageCount,
        ...(coupon.usageLimit === null
          ? {}
          : { usageCount: { equals: coupon.usageCount, lt: coupon.usageLimit } }),
      },
      data: { usageCount: { increment: 1 } },
    });
    if (changed.count !== 1)
      throw new ApiError("The coupon limit was reached. Refresh checkout.", 409);
  }
  await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "PROCESSING" } });
}
