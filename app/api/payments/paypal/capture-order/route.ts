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
      return NextResponse.json(
        { error: "PayPal Order ID is required." },
        { status: 400 },
      );
    }

    // If an Apple Pay or wallet payment source is supplied, confirm it first
    if (applePayPayment) {
      try {
        await confirmPayPalOrderPaymentSource(paypalOrderId, {
          apple_pay: {
            id: applePayPayment.id,
            token: applePayPayment.token,
          },
        });
      } catch (err: any) {
        console.warn("Notice: Apple Pay confirmation before capture:", err.message);
      }
    } else if (paymentSource) {
      try {
        await confirmPayPalOrderPaymentSource(paypalOrderId, paymentSource);
      } catch (err: any) {
        console.warn("Notice: Payment source confirmation before capture:", err.message);
      }
    }

    // Authoritative PayPal API Capture
    let captureData: any;
    try {
      captureData = await capturePayPalOrder(paypalOrderId);
    } catch (captureErr: any) {
      // If already captured, fetch authoritative details
      if (captureErr?.message?.includes("ORDER_ALREADY_CAPTURED")) {
        captureData = await getPayPalOrderDetails(paypalOrderId);
      } else {
        console.error("PayPal capture error:", captureErr);
        throw captureErr;
      }
    }

    const captureRecord = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    const isCompleted =
      captureData.status === "COMPLETED" ||
      captureRecord?.status === "COMPLETED";

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
