import { captureCheckoutPayment } from "@/lib/payments/capture-checkout";
import { getPreparedOrder } from "@/lib/payments/prepared-order";
import { z } from "zod";
import { orderInput } from "@/lib/commerce/order-input";
import { readJson, apiFailure, ApiError } from "@/lib/security/api";
import { shouldRestock } from "@/lib/commerce/payment-events";
import { NextResponse } from "next/server";
import { customerOrderScope } from "@/lib/security/identity";
import { prisma } from "@/lib/db/client";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import {
  getPayPalOrderDetails,
  capturePayPalOrder,
  refundPayPalCapture,
} from "@/lib/payments/paypal";
import { getAuthenticatedAdmin, getAuthenticatedCustomer } from "@/lib/auth/session";
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from "@/lib/email/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const userId = searchParams.get("userId");

  try {
    const admin = await getAuthenticatedAdmin();
    const customer = await getAuthenticatedCustomer();

    if (!admin && !customer) {
      return NextResponse.json(
        { error: "Authentication required to view order history." },
        { status: 401 },
      );
    }

    if (process.env.DATABASE_URL) {
      let whereClause: any = {};

      if (admin) {
        // Admin has permission to view all orders or filter
        if (userId) {
          const matchedUser = await prisma.user.findFirst({
            where: {
              OR: [{ id: userId }, ...(userId.includes("@") ? [{ email: userId }] : [])],
            },
            select: { id: true },
          });
          whereClause = matchedUser ? { userId: matchedUser.id } : { id: { equals: "__none__" } };
        } else if (email) {
          whereClause = {
            OR: [
              {
                shippingAddressSnapshot: {
                  path: ["email"],
                  string_contains: email,
                },
              },
              {
                user: { email: { equals: email, mode: "insensitive" } },
              },
            ],
          };
        }
      } else if (customer) {
        whereClause = { ...customerOrderScope(customer.id), paymentStatus: { not: "UNPAID" } };
      }

      const orders = await prisma.order.findMany({
        where: whereClause,
        include: {
          items: true,
          payment: true,
          shippingMethod: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      return NextResponse.json({ orders });
    }
  } catch (error) {
    console.error("Failed to fetch orders:", error);
  }

  return NextResponse.json({ error: "Order history is temporarily unavailable." }, { status: 503 });
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request, orderInput);
    const providerId = body.paymentDetails.paypalOrderId || body.paymentDetails.orderId;
    if (!providerId) throw new ApiError("Payment reference is required.");
    await captureCheckoutPayment(providerId);
    const order = await getPreparedOrder(providerId);
    return NextResponse.json({
      ok: true,
      order: {
        ...order,
        paymentMethod: order.payment?.method,
        payments: order.payment ? [order.payment] : [],
      },
    });
  } catch (error) {
    return apiFailure(
      error,
      "Your payment needs reconciliation. Do not pay again; contact support with the payment reference.",
    );
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized. Administrator session required." },
        { status: 401 },
      );
    }

    const body = await readJson(
      request,
      z.object({
        id: z.string().min(1).max(128),
        status: z.nativeEnum(OrderStatus).optional(),
        paymentStatus: z.nativeEnum(PaymentStatus).optional(),
        trackingNumber: z.string().max(180).optional(),
        cancellationReason: z.string().max(1000).optional(),
      }),
    );
    const { id, status, trackingNumber, paymentStatus } = body;

    if (!id) {
      return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Order management is temporarily unavailable." },
        { status: 503 },
      );
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true, payment: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (
      existingOrder.orderNumber.startsWith("NVX-PAYPAL-") &&
      ["UNPAID", "PROCESSING"].includes(existingOrder.paymentStatus)
    ) {
      throw new ApiError("Reconcile this provider payment before changing the order.", 409);
    }

    // Enforce Order State Machine Transitions
    const ALLOWED_ORDER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [
        OrderStatus.PROCESSING,
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED,
      ],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
      [OrderStatus.SHIPPED]: [
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
        OrderStatus.RETURNED,
        OrderStatus.REFUNDED,
      ],
      [OrderStatus.DELIVERED]: [OrderStatus.RETURNED, OrderStatus.REFUNDED],
      [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    if (status && status !== existingOrder.status) {
      const allowedNext = ALLOWED_ORDER_TRANSITIONS[existingOrder.status] || [];
      if (!allowedNext.includes(status as OrderStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status transition: Cannot change order from ${existingOrder.status} to ${status}.`,
          },
          { status: 400 },
        );
      }
    }

    // Enforce Payment State Machine Transitions
    const ALLOWED_PAYMENT_TRANSITIONS: Partial<Record<PaymentStatus, PaymentStatus[]>> = {
      [PaymentStatus.PENDING]: [PaymentStatus.PAID, PaymentStatus.FAILED, PaymentStatus.CANCELLED],
      [PaymentStatus.PAID]: [PaymentStatus.REFUNDED],
      [PaymentStatus.FAILED]: [],
      [PaymentStatus.CANCELLED]: [],
      [PaymentStatus.REFUNDED]: [],
    };

    if (paymentStatus && paymentStatus !== existingOrder.paymentStatus) {
      const allowedNext = ALLOWED_PAYMENT_TRANSITIONS[existingOrder.paymentStatus] || [];
      if (!allowedNext.includes(paymentStatus as PaymentStatus)) {
        return NextResponse.json(
          {
            error: `Invalid payment status transition: Cannot change payment from ${existingOrder.paymentStatus} to ${paymentStatus}.`,
          },
          { status: 400 },
        );
      }
    }

    // Process provider refund if transitioning to REFUNDED
    const isRefunding = status === OrderStatus.REFUNDED || paymentStatus === PaymentStatus.REFUNDED;
    if (
      isRefunding &&
      ![PaymentStatus.PAID, PaymentStatus.REFUNDED].includes(
        existingOrder.paymentStatus as "PAID" | "REFUNDED",
      )
    )
      throw new ApiError("Only a paid payment can be refunded.");
    if (isRefunding && existingOrder.paymentStatus === PaymentStatus.PAID) {
      if (!existingOrder.payment?.providerPaymentId || existingOrder.payment.provider !== "PAYPAL")
        throw new ApiError("This payment requires manual provider reconciliation.", 409);
      if (
        existingOrder.payment?.provider === "PAYPAL" &&
        (!(process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) ||
          !process.env.PAYPAL_CLIENT_SECRET)
      )
        return NextResponse.json(
          { error: "Payment provider is not configured for refunds." },
          { status: 503 },
        );
      if (
        existingOrder.payment?.providerPaymentId &&
        existingOrder.payment?.provider === "PAYPAL" &&
        (process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) &&
        process.env.PAYPAL_CLIENT_SECRET
      ) {
        try {
          const refund = await refundPayPalCapture(
            existingOrder.payment.providerPaymentId,
            Number(existingOrder.total),
          );
          if (refund.status !== "COMPLETED")
            return NextResponse.json(
              {
                error: "Refund is pending at the provider. Reconcile it before changing the order.",
              },
              { status: 409 },
            );
        } catch (refundErr: any) {
          console.error("PayPal capture refund failed:", refundErr);
          return NextResponse.json(
            {
              error:
                "PayPal could not complete this refund. Check the provider record before retrying.",
            },
            { status: 400 },
          );
        }
      }
    }

    if (
      existingOrder.orderNumber.startsWith("NVX-PAYPAL-") &&
      existingOrder.paymentStatus === "PROCESSING"
    )
      throw new ApiError("Reconcile this pending provider payment before changing the order.", 409);
    const effectiveStatus = status || existingOrder.status;
    const effectivePaymentStatus = isRefunding ? PaymentStatus.REFUNDED : paymentStatus;
    const restoreStock =
      existingOrder.paymentStatus !== "UNPAID" &&
      existingOrder.paymentStatus !== "FAILED" &&
      shouldRestock(existingOrder.status, effectiveStatus);
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id, updatedAt: existingOrder.updatedAt },
        data: {
          status: effectiveStatus,
          ...(trackingNumber !== undefined ? { trackingNumber } : {}),
          ...(effectivePaymentStatus ? { paymentStatus: effectivePaymentStatus } : {}),
        },
      });
      if (changed.count !== 1)
        throw new ApiError("Order changed concurrently. Refresh before retrying.", 409);
      if (restoreStock)
        for (const item of existingOrder.items) {
          if (item.productId)
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: Number(item.quantity) } },
            });
        }
      if (effectivePaymentStatus && existingOrder.payment)
        await tx.payment.update({
          where: { id: existingOrder.payment.id },
          data: { status: effectivePaymentStatus },
        });
      return tx.order.findUniqueOrThrow({
        where: { id },
        include: { items: true, user: { select: { name: true, email: true } } },
      });
    });

    // Trigger customer status email for key status transitions
    const emailableStatuses: OrderStatus[] = [
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ];

    if (status && emailableStatuses.includes(status as OrderStatus)) {
      const snap = updated.shippingAddressSnapshot as Record<string, string> | null;
      const customerEmail = snap?.email || (updated as any).user?.email;
      const customerName = snap?.fullName || (updated as any).user?.name || "Valued Patron";

      if (customerEmail) {
        sendOrderStatusEmail({
          status: status as "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED",
          orderNumber: updated.orderNumber,
          customerName,
          customerEmail,
          trackingNumber: updated.trackingNumber || undefined,
          cancellationReason: body.cancellationReason || undefined,
        }).catch((err) => console.warn(`Order status email [${status}] failed:`, err));
      }
    }

    return NextResponse.json({ ok: true, order: updated });
  } catch (error: any) {
    console.error("Update order error:", error);
    return apiFailure(
      error,
      "Failed to update order. Refresh and reconcile the provider record before retrying.",
    );
  }
}
