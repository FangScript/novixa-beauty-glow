import { createHmac } from "node:crypto";
import { prisma } from "../lib/db/client";

async function testWebhook() {
  console.log("=== TESTING PAYMENT WEBHOOK INTEGRATION ===");

  // Find the BACS order that is currently PENDING
  const order = await prisma.order.findFirst({
    where: { paymentStatus: "PENDING" },
    include: { payment: true },
  });

  if (!order || !order.payment) {
    console.log("No pending order found for webhook test.");
    return;
  }

  console.log(`Testing webhook for Order: ${order.orderNumber} (Current Status: ${order.paymentStatus})`);

  const secret = process.env.PAYMENT_WEBHOOK_SECRET || "novixa_webhook_secret_dev_2026";
  const payload = JSON.stringify({
    eventType: "PAYMENT.CAPTURED",
    eventId: `evt_${Date.now()}`,
    orderNumber: order.orderNumber,
    paymentId: order.payment.id,
    providerPaymentId: order.payment.providerPaymentId,
    status: "PAID",
    amount: order.total,
    currency: "GBP",
  });

  const signature = createHmac("sha256", secret).update(payload).digest("hex");

  const res = await fetch("http://localhost:8080/api/payments/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature": signature,
    },
    body: payload,
  });

  const data = await res.json();
  console.log("Webhook response status:", res.status);
  console.log("Webhook response data:", data);

  // Check that the order is now PAID
  const updatedOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: { payment: true },
  });

  console.log(`Updated Order Status: ${updatedOrder?.status}`);
  console.log(`Updated Order Payment Status: ${updatedOrder?.paymentStatus}`);
  console.log(`Updated Payment Model Status: ${updatedOrder?.payment?.status}`);

  if (updatedOrder?.paymentStatus === "PAID" && updatedOrder?.payment?.status === "PAID") {
    console.log("✓ Webhook successfully processed and synchronized payment & order status!");
  } else {
    console.error("Webhook status synchronization failed!");
  }
}

testWebhook()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
