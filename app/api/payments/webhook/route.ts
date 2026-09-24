import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { PaymentStatus, OrderStatus } from "@prisma/client";
import { verifyWebhookSignature } from "@/lib/payments/processor";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-webhook-signature") || "";
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    if (webhookSecret && !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const { eventType, providerPaymentId, orderId, orderNumber, status: eventStatus } = payload;

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
        ],
      },
      include: { payment: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Idempotency: If order is already paid, acknowledge without re-processing
    if (order.paymentStatus === PaymentStatus.PAID && eventStatus === "PAID") {
      return NextResponse.json({ received: true, alreadyPaid: true });
    }

    // Map status
    let newPaymentStatus: PaymentStatus = PaymentStatus.PENDING;
    let newOrderStatus: OrderStatus = order.status;

    if (eventType === "PAYMENT.CAPTURED" || eventStatus === "PAID") {
      newPaymentStatus = PaymentStatus.PAID;
      newOrderStatus = OrderStatus.CONFIRMED;
    } else if (eventType === "PAYMENT.FAILED" || eventStatus === "FAILED") {
      newPaymentStatus = PaymentStatus.FAILED;
    } else if (eventType === "PAYMENT.CANCELLED" || eventStatus === "CANCELLED") {
      newPaymentStatus = PaymentStatus.CANCELLED;
      newOrderStatus = OrderStatus.CANCELLED;
    }

    await prisma.$transaction(async (tx) => {
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
