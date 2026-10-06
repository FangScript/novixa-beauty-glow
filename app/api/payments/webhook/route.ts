import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { PaymentStatus, OrderStatus } from "@prisma/client";
import { verifyWebhookSignature } from "@/lib/payments/processor";
import { verifyPayPalWebhookSignature } from "@/lib/payments/paypal";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    // PayPal Transmission Headers
    const transmissionId = request.headers.get("paypal-transmission-id");
    const transmissionTime = request.headers.get("paypal-transmission-time");
    const certUrl = request.headers.get("paypal-cert-url");
    const authAlgo = request.headers.get("paypal-auth-algo");
    const transmissionSig = request.headers.get("paypal-transmission-sig");
    const paypalWebhookId = process.env.PAYPAL_WEBHOOK_ID;

    let isVerified = false;

    // Check PayPal Asymmetric Webhook Signature
    if (transmissionId && transmissionSig && certUrl && authAlgo && transmissionTime && paypalWebhookId) {
      isVerified = await verifyPayPalWebhookSignature({
        transmissionId,
        transmissionTime,
        certUrl,
        authAlgo,
        transmissionSig,
        webhookId: paypalWebhookId,
        webhookEvent: payload,
      });

      if (!isVerified) {
        return NextResponse.json({ error: "Invalid PayPal webhook signature." }, { status: 401 });
      }
    } else {
      // Custom HMAC signature verification
      const signature = request.headers.get("x-webhook-signature") || "";
      const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;

      if (webhookSecret && signature) {
        isVerified = verifyWebhookSignature(rawBody, signature, webhookSecret);
      }
    }

    if (!isVerified) {
      return NextResponse.json(
        { error: "Unauthorized. Webhook signature is required and must be valid." },
        { status: 401 },
      );
    }

    // Idempotency: Check if this webhook event was already processed
    const webhookEventId = payload.id;
    if (webhookEventId && process.env.DATABASE_URL) {
      const existingEvent = await prisma.webhookEvent.findUnique({
        where: { id: webhookEventId },
      }).catch(() => null);

      if (existingEvent) {
        return NextResponse.json({ received: true, alreadyProcessed: true });
      }
    }

    // Extract identifiers supporting both native PayPal webhook schema and custom formats
    const eventType = (payload.event_type || payload.eventType || "").toUpperCase();
    const resource = payload.resource || {};
    const captureId = resource.id;
    const paypalOrderId =
      resource.supplementary_data?.related_ids?.order_id ||
      (payload.resource_type === "checkout-order" ? resource.id : undefined);
    const orderNumber = payload.orderNumber || resource.custom_id || resource.invoice_id;
    const providerPaymentId =
      payload.providerPaymentId || captureId || paypalOrderId || resource.id;
    const eventStatus = (resource.status || payload.status || "").toUpperCase();
    const orderId = payload.orderId;

    if (!providerPaymentId && !orderId && !orderNumber) {
      return NextResponse.json({ error: "Missing order or payment identifier." }, { status: 400 });
    }

    // Locate order
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          ...(orderId ? [{ id: orderId }] : []),
          ...(orderNumber ? [{ orderNumber }] : []),
          ...(providerPaymentId ? [{ payment: { providerPaymentId } }] : []),
          ...(paypalOrderId ? [{ payment: { providerPaymentId: paypalOrderId } }] : []),
        ],
      },
      include: { payment: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Idempotency: If order is already paid, acknowledge without re-processing
    if (order.paymentStatus === PaymentStatus.PAID && (eventStatus === "PAID" || eventStatus === "COMPLETED")) {
      return NextResponse.json({ received: true, alreadyPaid: true });
    }

    // Map status from PayPal events
    let newPaymentStatus: PaymentStatus = PaymentStatus.PENDING;
    let newOrderStatus: OrderStatus = order.status;

    if (
      eventType === "PAYMENT.CAPTURE.COMPLETED" ||
      eventType === "PAYMENT.CAPTURED" ||
      eventStatus === "COMPLETED" ||
      eventStatus === "PAID"
    ) {
      newPaymentStatus = PaymentStatus.PAID;
      // Never downgrade an order that is already PROCESSING, SHIPPED, or DELIVERED
      if (order.status === OrderStatus.PENDING) {
        newOrderStatus = OrderStatus.CONFIRMED;
      }
    } else if (
      eventType === "PAYMENT.CAPTURE.DENIED" ||
      eventType === "PAYMENT.FAILED" ||
      eventStatus === "DENIED" ||
      eventStatus === "FAILED"
    ) {
      if (order.paymentStatus !== PaymentStatus.PAID) {
        newPaymentStatus = PaymentStatus.FAILED;
      }
    } else if (
      eventType === "PAYMENT.CAPTURE.REVERSED" ||
      eventType === "PAYMENT.CANCELLED" ||
      eventStatus === "CANCELLED" ||
      eventStatus === "REFUNDED"
    ) {
      newPaymentStatus = PaymentStatus.CANCELLED;
      newOrderStatus = OrderStatus.CANCELLED;
    }

    await prisma.$transaction(async (tx) => {
      // If order was cancelled via webhook and wasn't already cancelled, restock inventory
      if (newOrderStatus === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
        const orderWithItems = await tx.order.findUnique({
          where: { id: order.id },
          include: { items: true },
        });
        if (orderWithItems?.items) {
          for (const item of orderWithItems.items) {
            if (item.productId) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: Number(item.quantity) } },
              });
            }
          }
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: newOrderStatus,
          paymentStatus: newPaymentStatus,
        },
      });

      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: {
            status: newPaymentStatus,
            rawStatus: JSON.stringify({
              lastWebhookEvent: eventType || eventStatus,
              receivedAt: new Date().toISOString(),
            }),
          },
        });
      }

      if (webhookEventId) {
        await tx.webhookEvent.create({
          data: {
            id: webhookEventId,
            eventType: eventType || "UNKNOWN",
            resourceId: providerPaymentId || order.id,
            status: newPaymentStatus,
            payload: payload,
          },
        }).catch(() => null);
      }
    });

    return NextResponse.json({ received: true, status: newPaymentStatus });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process webhook." },
      { status: 500 },
    );
  }
}
