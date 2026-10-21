import { z } from "zod";
import { orderInput } from "@/lib/commerce/order-input";
import { readJson, apiFailure, ApiError } from "@/lib/security/api";
import { shouldRestock } from "@/lib/commerce/payment-events";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCheckoutQuote } from "@/lib/commerce/quote";
import { CommerceError } from "@/lib/commerce/pricing";
import { requireCheckoutIntent } from "@/lib/payments/checkout-session";
import { assertIntentQuote } from "@/lib/payments/checkout-intent";
import { customerOrderScope } from "@/lib/security/identity";
import { prisma } from "@/lib/db/client";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { verifyPaymentServerSide, type PaymentMethod } from "@/lib/payments/processor";
import {
  getPayPalOrderDetails,
  capturePayPalOrder,
  refundPayPalCapture,
} from "@/lib/payments/paypal";
import { settleProviderOrder } from "@/lib/payments/capture-provider";
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
        whereClause = customerOrderScope(customer.id);
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

  return NextResponse.json({ orders: [] });
}

export async function POST(request: Request) {
  try {
    const authAdmin = await getAuthenticatedAdmin();
    const authCustomer = await getAuthenticatedCustomer();
    const authenticatedUser =
      authCustomer ||
      (authAdmin
        ? {
            id: authAdmin.id,
            email: authAdmin.email,
            name: authAdmin.name,
            role: authAdmin.role,
          }
        : null);

    // Guest checkout is fully supported. If an account is authenticated, link its ID.
    const resolvedPrismaUserId: string | null = authenticatedUser ? authenticatedUser.id : null;

    const body = await readJson(request, orderInput);
    const { customer, address } = body;
    if (!process.env.DATABASE_URL)
      return NextResponse.json({ error: "Checkout is temporarily unavailable." }, { status: 503 });
    const quote = await getCheckoutQuote({ ...body, couponCode: body.couponCode || undefined });
    const items = quote.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Your shopping bag is empty." }, { status: 400 });
    }

    const paymentDetails = body.paymentDetails || {};

    const effectiveEmail = (
      customer?.email ||
      paymentDetails.payerEmail ||
      authenticatedUser?.email ||
      ""
    ).trim();

    const effectiveName = (
      customer?.name ||
      paymentDetails.payerName ||
      paymentDetails.shippingAddress?.fullName ||
      authenticatedUser?.name ||
      "Customer"
    ).trim();

    const effectivePhone = (
      customer?.phone ||
      paymentDetails.phone ||
      paymentDetails.shippingAddress?.phone ||
      ""
    ).trim();

    const effectiveLine1 = (
      address?.line1 ||
      paymentDetails.shippingAddress?.line1 ||
      paymentDetails.shippingAddress?.addressLines?.[0] ||
      ""
    ).trim();

    const effectiveCity = (
      address?.city ||
      paymentDetails.shippingAddress?.city ||
      paymentDetails.shippingAddress?.locality ||
      ""
    ).trim();

    const effectiveState = (
      address?.state ||
      paymentDetails.shippingAddress?.state ||
      paymentDetails.shippingAddress?.administrativeArea ||
      effectiveCity ||
      "Greater London"
    ).trim();

    const effectivePostalCode = (
      address?.postalCode ||
      paymentDetails.shippingAddress?.postalCode ||
      ""
    ).trim();

    if (
      !effectiveEmail ||
      !effectiveName ||
      !effectiveLine1 ||
      !effectiveCity ||
      !effectivePostalCode
    ) {
      return NextResponse.json(
        { error: "A customer email, name, and complete delivery address are required." },
        { status: 400 },
      );
    }

    const {
      subtotal,
      discount,
      shipping,
      tax,
      lineItems: lineItemsToCreate,
      couponId: validCouponId,
      shippingMethodId: resolvedShippingMethodId,
      shippingMethodName: resolvedShippingMethodName,
    } = quote;
    const total = quote.total;
    const orderNumber =
      "NVX-" +
      new Date().getUTCFullYear() +
      "-" +
      randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();

    const fullShippingSnapshot = {
      fullName: effectiveName,
      email: effectiveEmail,
      phone: effectivePhone,
      line1: effectiveLine1,
      line2: address?.line2 || paymentDetails.shippingAddress?.line2 || "",
      city: effectiveCity,
      state: effectiveState,
      postalCode: effectivePostalCode,
      country: address?.country || paymentDetails.shippingAddress?.countryCode || "GB",
    };

    const paymentMethod = (
      typeof body.paymentMethod === "string" ? body.paymentMethod : ""
    ).toUpperCase() as PaymentMethod;
    if (!["PAYPAL", "CARD", "GOOGLE_PAY", "APPLE_PAY"].includes(paymentMethod)) {
      return NextResponse.json({ error: "This payment method is not enabled." }, { status: 400 });
    }
    if (
      !(process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) ||
      !process.env.PAYPAL_CLIENT_SECRET
    ) {
      return NextResponse.json(
        { error: "Payment processing is temporarily unavailable." },
        { status: 503 },
      );
    }

    const normalizedPaymentDetails = paymentDetails;

    // Verify payment server-side using provider-agnostic engine
    const verification = verifyPaymentServerSide(
      paymentMethod,
      normalizedPaymentDetails,
      total,
      "GBP",
    );

    if (!verification.valid) {
      return NextResponse.json(
        {
          error:
            verification.error || "Payment verification failed. Please check your payment details.",
        },
        { status: 400 },
      );
    }

    const paypalOrderId =
      normalizedPaymentDetails.paypalOrderId ||
      normalizedPaymentDetails.orderId ||
      verification.metadata?.paypalOrderId;
    try {
      const intent = await requireCheckoutIntent(paypalOrderId);
      assertIntentQuote(intent, items, total);
      const { capture } = await settleProviderOrder(paypalOrderId, intent.totalPence, {
        getOrder: getPayPalOrderDetails,
        captureOrder: capturePayPalOrder,
        pause: () => new Promise((resolve) => setTimeout(resolve, 600)),
      });
      verification.status = PaymentStatus.PAID;
      verification.providerPaymentId = capture.id;
    } catch (error) {
      console.error(
        "Payment verification rejected",
        error instanceof Error ? error.message : "Unknown failure",
      );
      return NextResponse.json(
        {
          error:
            "Payment could not be verified for this checkout. If charged, contact support before retrying.",
        },
        { status: 409 },
      );
    }

    // A unique provider capture ID makes finalization retries idempotent.
    if (verification.providerPaymentId) {
      const existingPayment = await prisma.payment.findUnique({
        where: { providerPaymentId: verification.providerPaymentId },
        include: {
          order: {
            include: {
              items: true,
              payment: true,
              shippingMethod: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (existingPayment?.order) {
        return NextResponse.json({
          ok: true,
          idempotent: true,
          order: {
            ...existingPayment.order,
            paymentMethod: verification.method,
            payments: [existingPayment],
          },
        });
      }
    }

    const orderStatus =
      verification.status === PaymentStatus.PAID ? OrderStatus.CONFIRMED : OrderStatus.PENDING;

    // Execute atomic order placement & stock decrement transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      // 1. Atomically decrement stock and guarantee no negative stock / overselling
      for (const item of items) {
        const decQty = Math.round(Number(item.quantity) * 100) / 100;
        const result = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: { gte: decQty },
          },
          data: {
            stock: { decrement: decQty },
          },
        });
        if (result.count === 0) {
          throw new Error(
            `Insufficient stock for item "${item.productId}". The product may have just sold out.`,
          );
        }
      }

      // 2. Increment coupon usage if applied
      if (validCouponId) {
        const used = await tx.coupon.updateMany({
          where: {
            id: validCouponId,
            active: true,
            usageLimit: quote.couponUsageLimit,
            ...(quote.couponUsageLimit !== null
              ? { usageCount: { lt: quote.couponUsageLimit } }
              : {}),
          },
          data: { usageCount: { increment: 1 } },
        });
        if (used.count !== 1) throw new CommerceError("The coupon usage limit has been reached.");
      }

      // 3. Create Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          status: orderStatus,
          paymentStatus: verification.status,
          subtotal,
          discount,
          shipping,
          tax,
          total,
          userId: resolvedPrismaUserId,
          couponId: validCouponId,
          shippingMethodId: resolvedShippingMethodId,
          shippingMethodName: resolvedShippingMethodName,
          shippingAddressSnapshot: fullShippingSnapshot,
          items: {
            create: lineItemsToCreate,
          },
          payment: {
            create: {
              provider: verification.provider,
              method: verification.method,
              providerPaymentId: verification.providerPaymentId,
              amount: total,
              currency: "GBP",
              status: verification.status,
              rawStatus: JSON.stringify(verification.metadata || {}),
            },
          },
        },
        include: {
          items: true,
          payment: true,
          shippingMethod: true,
        },
      });

      return newOrder;
    });

    // Send confirmation email (awaited to guarantee completion in serverless environments)
    try {
      await sendOrderConfirmationEmail({
        orderNumber: createdOrder.orderNumber,
        customerName: effectiveName,
        customerEmail: effectiveEmail,
        items: createdOrder.items.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
        })),
        subtotal: Number(createdOrder.subtotal),
        discount: Number(createdOrder.discount),
        shipping: Number(createdOrder.shipping),
        total: Number(createdOrder.total),
        shippingAddress: fullShippingSnapshot,
        paymentMethod: verification.method,
        deliveryMethodName: resolvedShippingMethodName,
      });

      // Also dispatch order notification copy to store admin
      const storeAdminEmail =
        process.env.ADMIN_EMAIL || process.env.SUPPORT_EMAIL || "novixaretail@gmail.com";
      if (effectiveEmail.toLowerCase() !== storeAdminEmail.toLowerCase()) {
        sendOrderConfirmationEmail({
          orderNumber: createdOrder.orderNumber,
          customerName: `${effectiveName} (Store Alert)`,
          customerEmail: storeAdminEmail,
          items: createdOrder.items.map((item) => ({
            ...item,
            unitPrice: Number(item.unitPrice),
          })),
          subtotal: Number(createdOrder.subtotal),
          discount: Number(createdOrder.discount),
          shipping: Number(createdOrder.shipping),
          total: Number(createdOrder.total),
          shippingAddress: fullShippingSnapshot,
          paymentMethod: verification.method,
          deliveryMethodName: resolvedShippingMethodName,
        }).catch((adminErr) => console.warn("Admin order email notification notice:", adminErr));
      }
    } catch (emailErr) {
      console.warn("Order confirmation email failed:", emailErr);
    }

    const paymentRecord = (createdOrder as any).payment;

    return NextResponse.json({
      ok: true,
      order: {
        ...createdOrder,
        paymentMethod: verification.method,
        payments: paymentRecord ? [paymentRecord] : [],
      },
    });
  } catch (error: any) {
    console.error("Order placement error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof CommerceError || error instanceof ApiError
            ? error.message
            : "Failed to place order. If charged, contact support before retrying.",
      },
      {
        status:
          error instanceof ApiError ? error.status : error instanceof CommerceError ? 400 : 500,
      },
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

    const effectiveStatus = status || existingOrder.status;
    const effectivePaymentStatus = isRefunding ? PaymentStatus.REFUNDED : paymentStatus;
    const restoreStock = shouldRestock(existingOrder.status, effectiveStatus);
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
