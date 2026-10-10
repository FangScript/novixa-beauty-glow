import { NextResponse } from "next/server";
import {
  capturePayPalOrder,
  confirmPayPalOrderPaymentSource,
  getPayPalOrderDetails,
} from "@/lib/payments/paypal";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paypalOrderId, paymentSource, applePayPayment } = body;

    if (!paypalOrderId) {
      return NextResponse.json({ error: "PayPal Order ID is required." }, { status: 400 });
    }

    // 1. Authoritative PayPal Order State Check
    let orderDetails: any;
    try {
      orderDetails = await getPayPalOrderDetails(paypalOrderId);
    } catch (fetchErr: any) {
      console.error(`Failed to fetch PayPal order details [orderId: ${paypalOrderId}]:`, fetchErr);
      return NextResponse.json(
        { error: fetchErr.message || "Failed to retrieve order state from PayPal." },
        { status: 500 },
      );
    }

    // If order is already completed/captured, return authoritative details immediately
    if (orderDetails.status === "COMPLETED") {
      const captureRecord = orderDetails.purchase_units?.[0]?.payments?.captures?.[0];
      const captureId = captureRecord?.id || paypalOrderId;
      const payer = orderDetails.payer || {};

      return NextResponse.json({
        ok: true,
        status: orderDetails.status,
        captureId,
        paypalOrderId,
        payerEmail: payer.email_address,
        payerName: payer.name
          ? `${payer.name.given_name || ""} ${payer.name.surname || ""}`.trim()
          : null,
        details: orderDetails,
      });
    }

    // 2. If the order is not yet approved, confirm payment source (Apple Pay or wallet)
    if (orderDetails.status !== "APPROVED") {
      if (applePayPayment) {
        // In PayPal PPCP mode (no Apple merchant certificate), the client-side SDK
        // handles Apple Pay token decryption via paypal.Applepay().confirmOrder().
        // Raw tokens sent to confirm-payment-source will ALWAYS 500.
        // If the order isn't APPROVED at this point, the client-side confirmation failed.
        const hasAppleCert = !!(
          process.env.APPLE_PAY_CERTIFICATE && process.env.APPLE_PAY_PRIVATE_KEY
        );
        if (!hasAppleCert) {
          console.error(
            `Apple Pay order ${paypalOrderId} is not APPROVED (status: ${orderDetails.status}). ` +
              `Client-side confirmOrder must succeed before capture. No Apple merchant cert configured for server-side fallback.`,
          );
          return NextResponse.json(
            {
              error:
                "Apple Pay confirmation failed. Please try again or use a different payment method.",
            },
            { status: 400 },
          );
        }

        // Only attempt server-side confirm if Apple merchant certificate IS configured (non-PPCP / direct integration)
        try {
          const confirmData = await confirmPayPalOrderPaymentSource(paypalOrderId, {
            apple_pay: {
              id: applePayPayment.id,
              token: applePayPayment.token,
            },
          });
          orderDetails = confirmData;
        } catch (confirmErr: any) {
          console.error(
            `Apple Pay payment source confirmation failed [orderId: ${paypalOrderId}, debug_id: ${confirmErr.debugId || "unknown"}]:`,
            confirmErr.message,
          );
          return NextResponse.json(
            {
              error: "Payment source confirmation failed with PayPal. Your card was not charged.",
              debugId: confirmErr.debugId,
            },
            { status: 400 },
          );
        }
      } else if (paymentSource) {
        try {
          const confirmData = await confirmPayPalOrderPaymentSource(paypalOrderId, paymentSource);
          orderDetails = confirmData;
        } catch (confirmErr: any) {
          console.error(
            `Payment source confirmation failed [orderId: ${paypalOrderId}, debug_id: ${confirmErr.debugId || "unknown"}]:`,
            confirmErr.message,
          );
          // CRITICAL: STOP IMMEDIATELY! Do NOT proceed to capture when confirmation fails.
          return NextResponse.json(
            {
              error: "Payment source confirmation failed with PayPal. Your card was not charged.",
              debugId: confirmErr.debugId,
            },
            { status: 400 },
          );
        }
      }
    }

    // 3. Verify order is in APPROVED or COMPLETED state before attempting capture
    // When client-side SDK confirms payment, PayPal's backend can take 200-800ms to propagate APPROVED
    if (orderDetails.status !== "APPROVED" && orderDetails.status !== "COMPLETED") {
      for (let attempt = 0; attempt < 4; attempt++) {
        await new Promise((r) => setTimeout(r, 600));
        try {
          orderDetails = await getPayPalOrderDetails(paypalOrderId);
          if (orderDetails.status === "APPROVED" || orderDetails.status === "COMPLETED") {
            break;
          }
        } catch {}
      }
    }

    if (orderDetails.status !== "APPROVED" && orderDetails.status !== "COMPLETED") {
      console.error(
        `PayPal order ${paypalOrderId} cannot be captured because status is ${orderDetails.status} (expected APPROVED).`,
      );
      return NextResponse.json(
        {
          error: `Order is not approved for payment (status: ${orderDetails.status}). Please try again.`,
        },
        { status: 400 },
      );
    }

    // If order was already completed during confirmation, skip capture
    if (orderDetails.status === "COMPLETED") {
      const captureRecord = orderDetails.purchase_units?.[0]?.payments?.captures?.[0];
      const captureId = captureRecord?.id || paypalOrderId;
      const payer = orderDetails.payer || {};

      return NextResponse.json({
        ok: true,
        status: orderDetails.status,
        captureId,
        paypalOrderId,
        payerEmail: payer.email_address,
        payerName: payer.name
          ? `${payer.name.given_name || ""} ${payer.name.surname || ""}`.trim()
          : null,
        details: orderDetails,
      });
    }

    // 4. Authoritative PayPal API Capture
    let captureData: any;
    try {
      captureData = await capturePayPalOrder(paypalOrderId);
    } catch (captureErr: any) {
      if (captureErr?.message?.includes("ORDER_ALREADY_CAPTURED")) {
        captureData = await getPayPalOrderDetails(paypalOrderId);
      } else {
        console.error(
          `PayPal capture error [orderId: ${paypalOrderId}, debug_id: ${captureErr.debugId || "unknown"}]:`,
          captureErr.message,
        );
        return NextResponse.json(
          {
            error: captureErr.message || "Failed to capture PayPal payment.",
            debugId: captureErr.debugId,
          },
          { status: 400 },
        );
      }
    }

    const captureRecord = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    const isCompleted = captureData.status === "COMPLETED" || captureRecord?.status === "COMPLETED";

    const captureId = captureRecord?.id || paypalOrderId;
    const payer = captureData.payer || {};

    return NextResponse.json({
      ok: isCompleted,
      status: captureData.status,
      captureId,
      paypalOrderId,
      payerEmail: payer.email_address,
      payerName: payer.name
        ? `${payer.name.given_name || ""} ${payer.name.surname || ""}`.trim()
        : null,
      details: captureData,
    });
  } catch (error: any) {
    console.error("PayPal Capture Order Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to capture PayPal payment" },
      { status: 500 },
    );
  }
}
