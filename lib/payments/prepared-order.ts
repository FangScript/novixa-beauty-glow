import { reserveSavedOrder } from "./reserve-order";
import { prisma } from "@/lib/db/client";
import { ApiError } from "@/lib/security/api";
import { moneyInPence } from "@/lib/commerce/pricing";
import { assertProviderAmount } from "./checkout-intent";
import { getPayPalOrderDetails } from "./paypal";
import { sendOrderConfirmationEmail } from "@/lib/email/service";

export const preparedOrderNumber = (providerId: string) => "NVX-PAYPAL-" + providerId;
export const orderInclude = { items: true, payment: true, shippingMethod: true } as const;
export async function getPreparedOrder(providerId: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber: preparedOrderNumber(providerId) },
    include: orderInclude,
  });
  if (!order?.payment)
    throw new ApiError("This checkout has no saved order. Refresh checkout before paying.", 409);
  return order;
}

/** Claim inventory and coupon usage once, before making any capture request. */
export async function reservePreparedOrder(providerId: string) {
  const order = await getPreparedOrder(providerId);
  return prisma.$transaction((tx) => reserveSavedOrder(tx, order));
}

/** The order already exists. A crash after capture is recoverable via webhook or retry. */
export async function finishPreparedOrder(providerId: string, providerOrder: any) {
  const order = await getPreparedOrder(providerId);
  const capture = assertProviderAmount(providerOrder, moneyInPence(order.total), true)!;
  const changed = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: order.payment!.id, status: "PROCESSING" },
      data: { status: "PAID", providerPaymentId: capture.id },
    });
    if (claimed.count)
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CONFIRMED", paymentStatus: "PAID" },
      });
    else {
      const current = await tx.payment.findUniqueOrThrow({ where: { id: order.payment!.id } });
      if (current.status !== "PAID")
        throw new ApiError("Payment requires manual reconciliation. Do not pay again.", 409);
    }
    return claimed.count;
  });
  const saved = await getPreparedOrder(providerId);
  if (changed) {
    const address = saved.shippingAddressSnapshot as any;
    try {
      await sendOrderConfirmationEmail({
        orderNumber: saved.orderNumber,
        customerName: address.fullName,
        customerEmail: address.email,
        items: saved.items.map((item) => ({ ...item, unitPrice: Number(item.unitPrice) })),
        subtotal: Number(saved.subtotal),
        discount: Number(saved.discount),
        shipping: Number(saved.shipping),
        total: Number(saved.total),
        shippingAddress: address,
        paymentMethod: saved.payment!.method,
        deliveryMethodName: saved.shippingMethodName || "Delivery",
      });
    } catch (error) {
      console.warn("Saved order confirmation email failed", saved.orderNumber);
    }
  }
  return saved;
}

/** Read-only provider verification; recovery never creates a second charge. */
export async function reconcilePreparedOrder(providerId: string) {
  const remote = await getPayPalOrderDetails(providerId);
  if (remote.status !== "COMPLETED") {
    const order = await getPreparedOrder(providerId);
    // Never release an uncertain capture based on elapsed time alone. A
    // processing reservation needs a definitive provider VOIDED status.
    const expired = order.createdAt.getTime() < Date.now() - 3600000;
    const idle = order.payment!.updatedAt.getTime() < Date.now() - 300000;
    if (
      expired &&
      idle &&
      (order.paymentStatus !== "PROCESSING" || remote.status === "VOIDED") &&
      ["CREATED", "APPROVED", "VOIDED"].includes(remote.status) &&
      ["UNPAID", "PROCESSING", "FAILED"].includes(order.paymentStatus)
    ) {
      await prisma.$transaction(async (tx) => {
        const changed = await tx.payment.updateMany({
          where: {
            id: order.payment!.id,
            status: order.payment!.status,
            updatedAt: order.payment!.updatedAt,
          },
          data: { status: "CANCELLED" },
        });
        if (!changed.count)
          throw new ApiError("Payment changed concurrently. Retry reconciliation.", 409);
        if (order.paymentStatus === "PROCESSING") {
          for (const item of order.items)
            if (item.productId)
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
              });
          if (order.couponId)
            await tx.coupon.updateMany({
              where: { id: order.couponId, usageCount: { gt: 0 } },
              data: { usageCount: { decrement: 1 } },
            });
        }
        await tx.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED", paymentStatus: "CANCELLED" },
        });
      });
      return { recovered: false, status: "CANCELLED" };
    }
    return { recovered: false, status: remote.status };
  }
  const order = await finishPreparedOrder(providerId, remote);
  return { recovered: true, orderId: order.id, status: order.paymentStatus };
}
