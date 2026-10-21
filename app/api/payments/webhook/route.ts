import { NextResponse } from "next/server";
import { z } from "zod";
import { OrderStatus, PaymentStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { verifyPayPalWebhookSignature } from "@/lib/payments/paypal";
import { paymentEventDecision, eventCaptureId } from "@/lib/commerce/payment-events";
import { readBody, apiFailure, ApiError } from "@/lib/security/api";
export async function POST(request: Request) {
  try {
    const rawEvent = (await readBody(request, 262144)).toString("utf8");
    let input: unknown;
    try {
      input = JSON.parse(rawEvent);
    } catch {
      throw new ApiError("Invalid webhook JSON.");
    }
    const parsed = z
      .object({
        id: z.string().min(1).max(128),
        event_type: z.string().min(1).max(128),
        resource: z.record(z.any()),
        resource_type: z.string().optional(),
      })
      .passthrough()
      .safeParse(input);
    if (!parsed.success) throw new ApiError("Invalid webhook event.");
    const payload = parsed.data;
    const get = (header: string) => request.headers.get(header) || "";
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    const transmissionId = get("paypal-transmission-id"),
      transmissionTime = get("paypal-transmission-time");
    const certUrl = get("paypal-cert-url"),
      authAlgo = get("paypal-auth-algo"),
      transmissionSig = get("paypal-transmission-sig");
    if (
      !webhookId ||
      !transmissionId ||
      !transmissionTime ||
      !certUrl ||
      !authAlgo ||
      !transmissionSig
    )
      throw new ApiError("A native PayPal webhook signature is required.", 401);
    if (
      !(await verifyPayPalWebhookSignature({
        webhookId,
        transmissionId,
        transmissionTime,
        certUrl,
        authAlgo,
        transmissionSig,
        webhookEventRaw: rawEvent,
      }))
    )
      throw new ApiError("Invalid PayPal webhook signature.", 401);
    if (
      ![
        "PAYMENT.CAPTURE.COMPLETED",
        "PAYMENT.CAPTURE.DENIED",
        "PAYMENT.CAPTURE.REFUNDED",
        "PAYMENT.CAPTURE.REVERSED",
      ].includes(payload.event_type)
    )
      return NextResponse.json({ received: true, action: "ignore" });
    const resource = payload.resource;
    const related = resource.supplementary_data?.related_ids;
    const providerId = eventCaptureId(payload.event_type, resource);
    if (!providerId) throw new ApiError("A capture reference is required for reconciliation.");
    const order = await prisma.order.findFirst({
      where: {
        payment: {
          provider: "PAYPAL",
          providerPaymentId: {
            in: [providerId, related?.order_id].filter(
              (id): id is string => typeof id === "string" && Boolean(id),
            ),
          },
        },
      },
      include: { payment: true },
    });
    if (!order) throw new ApiError("Order is not ready for reconciliation.", 503);
    const result = await prisma.$transaction(async (tx) => {
      // Claim and processing commit together; retries cannot double-apply.
      await tx.webhookEvent.create({
        // The source is parsed JSON; passthrough fields retain the provider event for reconciliation.
        data: {
          id: payload.id,
          eventType: payload.event_type,
          resourceId: providerId,
          payload: payload as Prisma.InputJsonObject,
        },
      });
      const current = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
      const decision = paymentEventDecision(payload.event_type, current, resource.amount);
      if (decision.action === "update") {
        const changed = await tx.order.updateMany({
          where: { id: current.id, updatedAt: current.updatedAt },
          data: {
            paymentStatus: decision.paymentStatus as PaymentStatus,
            status: decision.status as OrderStatus,
          },
        });
        if (changed.count !== 1)
          throw new ApiError("Order changed concurrently. Retry reconciliation.", 409);
        if (order.payment)
          await tx.payment.update({
            where: { id: order.payment.id },
            data: { status: decision.paymentStatus as PaymentStatus },
          });
      }
      await tx.webhookEvent.update({
        where: { id: payload.id },
        data: {
          status:
            decision.action === "partial-refund"
              ? "PARTIAL_REFUND_REVIEW_REQUIRED"
              : decision.action,
        },
      });
      // Financial refunds do not prove that physical stock was returned.
      return decision.action;
    });
    return NextResponse.json({ received: true, action: result });
  } catch (error: any) {
    if (error?.code === "P2002")
      return NextResponse.json({ received: true, alreadyProcessed: true });
    console.error(
      "PayPal webhook reconciliation failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return apiFailure(error, "Unable to reconcile this payment event.");
  }
}
