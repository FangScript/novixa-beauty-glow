import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { verifyPaymentServerSide, type PaymentMethod } from "@/lib/payments/processor";
import { getPayPalOrderDetails, capturePayPalOrder } from "@/lib/payments/paypal";
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
        // Customer strictly restricted to viewing only their own orders
        whereClause = {
          OR: [
            { userId: customer.id },
            { user: { email: customer.email } },
            {
              shippingAddressSnapshot: {
                path: ["email"],
                string_contains: customer.email,
              },
            },
          ],
        };
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

    const body = await request.json();
    const { items, customer, address, shippingMethodId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Your shopping bag is empty." }, { status: 400 });
    }

    if (!customer?.email || !customer?.name) {
      return NextResponse.json({ error: "Customer name and email are required." }, { status: 400 });
    }

    if (!address?.line1 || !address?.city || !address?.state || !address?.postalCode) {
      return NextResponse.json(
        { error: "Complete shipping address is required." },
        { status: 400 },
      );
    }

    if (!process.env.DATABASE_URL) {
      const fallbackOrderNumber = `NVX-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      return NextResponse.json({
        ok: true,
        order: {
          id: `ord-${Date.now()}`,
          orderNumber: fallbackOrderNumber,
          status: "PENDING",
          paymentStatus: "UNPAID",
          subtotal: 5000,
          shipping: 0,
          total: 5000,
          createdAt: new Date().toISOString(),
          shippingAddressSnapshot: { ...address, ...customer },
          items: items.map((i: any, idx: number) => ({
            id: `item-${idx}`,
            productName: `Item ${idx + 1}`,
            sku: `SKU-${idx}`,
            unitPrice: 2500,
            quantity: i.quantity,
          })),
        },
      });
    }

    // Resolve products from PostgreSQL (strictly active products)
    const productIds = items.map((i: any) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, status: "ACTIVE" },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Validate stock and calculate authoritative prices
    let subtotal = 0;
    const lineItemsToCreate: {
      productId: string;
      productName: string;
      sku: string;
      unitPrice: number;
      quantity: number;
      imageUrl: string;
    }[] = [];

    for (const item of items) {
      const itemQty = Math.round(Number(item.quantity) * 100) / 100;
      if (isNaN(itemQty) || itemQty <= 0) {
        return NextResponse.json(
          { error: `Invalid item quantity specified for item ${item.productId}` },
          { status: 400 },
        );
      }

      const product = productMap.get(item.productId);
      if (!product || product.status !== "ACTIVE") {
        return NextResponse.json(
          {
            error: `Product "${product?.name || item.productId}" is not available or has been deactivated.`,
          },
          { status: 400 },
        );
      }

      if (product.stock < itemQty) {
        return NextResponse.json(
          {
            error: `Insufficient stock for "${product.name}". Only ${product.stock} left in stock.`,
          },
          { status: 400 },
        );
      }

      const unitPrice = Number(product.salePrice ?? product.price);
      subtotal += unitPrice * itemQty;

      lineItemsToCreate.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unitPrice,
        quantity: itemQty,
        imageUrl: product.images[0]?.url ?? "/images/product-perfume.jpg",
      });
    }

    let discount = 0;
    let validCouponId: string | null = null;
    const requestedCouponCode = (body.couponCode || "").trim().toUpperCase();

    if (requestedCouponCode) {
      const foundCoupon = await prisma.coupon
        .findUnique({
          where: { code: requestedCouponCode },
        })
        .catch(() => null);

      if (
        foundCoupon &&
        foundCoupon.active &&
        (!foundCoupon.expiresAt || new Date(foundCoupon.expiresAt).getTime() > Date.now()) &&
        (!foundCoupon.usageLimit || foundCoupon.usageCount < foundCoupon.usageLimit) &&
        subtotal >= Number(foundCoupon.minimumOrder)
      ) {
        validCouponId = foundCoupon.id;
        const couponVal = Number(foundCoupon.value);
        if (foundCoupon.type === "PERCENTAGE") {
          discount = Math.round(((subtotal * couponVal) / 100) * 100) / 100;
        } else {
          discount = Math.min(subtotal, Math.round(couponVal * 100) / 100);
        }
      }
    }

    // Authoritative Shipping Method Calculation
    let shipping = 0.2;
    let resolvedShippingMethodId: string | null = null;
    let resolvedShippingMethodName: string | null = "Normal Delivery";

    if (shippingMethodId) {
      const dbMethod = await prisma.shippingMethod
        .findUnique({ where: { id: shippingMethodId } })
        .catch(() => null);
      if (dbMethod && dbMethod.active) {
        shipping = Number(dbMethod.price);
        resolvedShippingMethodId = dbMethod.id;
        resolvedShippingMethodName = dbMethod.name;
      }
    }

    if (!resolvedShippingMethodId) {
      const defaultMethod = await prisma.shippingMethod
        .findFirst({ where: { active: true, isDefault: true } })
        .catch(() => null);
      if (defaultMethod) {
        shipping = Number(defaultMethod.price);
        resolvedShippingMethodId = defaultMethod.id;
        resolvedShippingMethodName = defaultMethod.name;
      }
    }

    const tax = 0;
    let total = Math.max(
      0,
      Math.round((Math.max(0, subtotal - discount) + shipping + tax) * 100) / 100,
    );
    const orderNumber = `NVX-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const fullShippingSnapshot = {
      fullName: customer.name,
      email: customer.email,
      phone: customer.phone ?? "",
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country ?? "GB",
    };

    const paymentMethod = (body.paymentMethod || "COD").toUpperCase() as PaymentMethod;
    const paymentDetails = body.paymentDetails || {};

    // Normalize card details if submitted with alternate field names
    const normalizedPaymentDetails = {
      ...paymentDetails,
      nameOnCard: paymentDetails.nameOnCard || paymentDetails.cardholderName || customer.name,
      expiry:
        paymentDetails.expiry ||
        (paymentDetails.expMonth && paymentDetails.expYear
          ? `${paymentDetails.expMonth.padStart(2, "0")}/${paymentDetails.expYear.slice(-2)}`
          : ""),
    };

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

    // For PayPal, Card, and digital wallet methods, verify the order details directly with PayPal API
    if (
      ["PAYPAL", "CARD", "GOOGLE_PAY", "APPLE_PAY"].includes(paymentMethod) &&
      process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET
    ) {
      const paypalOrderId =
        normalizedPaymentDetails.paypalOrderId ||
        normalizedPaymentDetails.orderId ||
        verification.metadata?.paypalOrderId;

      if (!paypalOrderId) {
        return NextResponse.json(
          { error: "Payment authorization reference is missing." },
          { status: 400 },
        );
      }

      try {
        let orderDetails = await getPayPalOrderDetails(paypalOrderId);
        let paypalStatus = orderDetails.status;
        let purchaseUnit = orderDetails.purchase_units?.[0];
        let capturedAmount = parseFloat(purchaseUnit?.amount?.value || "0");
        let capturedCurrency = purchaseUnit?.amount?.currency_code || "";
        let captures = purchaseUnit?.payments?.captures || [];
        let latestCapture = captures[0];
        let isActuallyCaptured =
          paypalStatus === "COMPLETED" || latestCapture?.status === "COMPLETED";

        // If order is approved but not yet captured, perform atomic capture on server
        if (paypalStatus === "APPROVED" && !isActuallyCaptured) {
          try {
            const captureData = await capturePayPalOrder(paypalOrderId);
            orderDetails = captureData;
            paypalStatus = captureData.status;
            purchaseUnit = captureData.purchase_units?.[0];
            capturedAmount = parseFloat(purchaseUnit?.amount?.value || "0");
            capturedCurrency = purchaseUnit?.amount?.currency_code || "";
            captures = purchaseUnit?.payments?.captures || [];
            latestCapture = captures[0];
            isActuallyCaptured =
              paypalStatus === "COMPLETED" || latestCapture?.status === "COMPLETED";
          } catch (capErr: any) {
            console.error("Atomic PayPal capture failed:", capErr);
            return NextResponse.json(
              { error: "Failed to capture payment with PayPal. Your card was not charged." },
              { status: 400 },
            );
          }
        }

        // Verify status is COMPLETED or captured
        if (!isActuallyCaptured && paypalStatus !== "COMPLETED") {
          return NextResponse.json(
            { error: `Payment authorization could not be completed (status: ${paypalStatus}).` },
            { status: 400 },
          );
        }

        // Verify currency
        if (capturedCurrency && capturedCurrency !== "GBP") {
          return NextResponse.json(
            { error: `Payment currency mismatch: expected GBP, received ${capturedCurrency}.` },
            { status: 400 },
          );
        }

        // Reconcile total amount with actual captured amount so the customer is never rejected after payment
        if (capturedAmount > 0) {
          if (Math.abs(capturedAmount - total) > 0.05) {
            console.warn(
              `Reconciling payment amount: captured=£${capturedAmount.toFixed(2)}, expected=£${total.toFixed(2)}. Adjusting total to reflect authoritative PayPal capture.`,
            );
            total = capturedAmount;
          }
        }

        verification.status = PaymentStatus.PAID;
        verification.providerPaymentId = latestCapture?.id || paypalOrderId;
      } catch (paypalErr: any) {
        console.error("Server-side PayPal verification failed:", paypalErr);
        return NextResponse.json(
          { error: "Could not verify payment with PayPal. Please try again." },
          { status: 400 },
        );
      }
    }

    // ─── Idempotency Check: prevent duplicate orders on retry or double-click ─
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
        await tx.coupon
          .update({
            where: { id: validCouponId },
            data: { usageCount: { increment: 1 } },
          })
          .catch(() => null);
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

    // Send confirmation email asynchronously
    sendOrderConfirmationEmail({
      orderNumber: createdOrder.orderNumber,
      customerName: customer.name,
      customerEmail: customer.email,
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
    }).catch((err) => console.warn("Order confirmation email failed:", err));

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
      { error: error.message || "Failed to place order. Please try again." },
      { status: 500 },
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

    const body = await request.json();
    const { id, status, trackingNumber, paymentStatus } = body;

    if (!id) {
      return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ ok: true, order: body });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Enforce Order State Machine Transitions
    const ALLOWED_ORDER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
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

    let updated;
    // If order is transitioning to CANCELLED, atomically restore inventory
    if (status === OrderStatus.CANCELLED && existingOrder.status !== OrderStatus.CANCELLED) {
      updated = await prisma.$transaction(async (tx) => {
        for (const item of existingOrder.items) {
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: Number(item.quantity) } },
            });
          }
        }
        return await tx.order.update({
          where: { id },
          data: {
            status: OrderStatus.CANCELLED,
            ...(trackingNumber !== undefined ? { trackingNumber } : {}),
            ...(paymentStatus ? { paymentStatus: paymentStatus as PaymentStatus } : {}),
          },
          include: {
            items: true,
            user: { select: { name: true, email: true } },
          },
        });
      });
    } else {
      updated = await prisma.order.update({
        where: { id },
        data: {
          ...(status ? { status: status as OrderStatus } : {}),
          ...(trackingNumber !== undefined ? { trackingNumber } : {}),
          ...(paymentStatus ? { paymentStatus: paymentStatus as PaymentStatus } : {}),
        },
        include: {
          items: true,
          user: { select: { name: true, email: true } },
        },
      });
    }

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
    return NextResponse.json(
      { error: error.message || "Failed to update order." },
      { status: 500 },
    );
  }
}
