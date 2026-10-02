import { NextResponse } from "next/server";
import {
  confirmPayPalOrderPaymentSource,
  capturePayPalOrder,
  getPayPalOrderDetails,
} from "@/lib/payments/paypal";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paypalOrderId, paymentMethodData } = body;

    if (!paypalOrderId) {
      return NextResponse.json(
        { error: "PayPal Order ID is required." },
        { status: 400 },
      );
    }

    // Step 1: If Google Pay payment method token is provided, confirm the payment source with PayPal
    if (paymentMethodData?.tokenizationData?.token) {
      try {
        const rawToken = paymentMethodData.tokenizationData.token;
        await confirmPayPalOrderPaymentSource(paypalOrderId, {
          google_pay: {
            name: paymentMethodData.description || "Google Pay User",
            token: rawToken,
          },
        });
      } catch (confirmError: any) {
        console.warn("PayPal confirm-payment-source notice for Google Pay:", confirmError.message);
        // Continue to capture in case it was already confirmed client-side via SDK
      }
    }

    // Step 2: Capture the order via PayPal Orders v2 API
    const captureData = await capturePayPalOrder(paypalOrderId);

    const isCompleted =
      captureData.status === "COMPLETED" ||
      captureData.purchase_units?.[0]?.payments?.captures?.[0]?.status === "COMPLETED";

    const captureId =
      captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || paypalOrderId;

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
    console.error("Google Pay Confirmation & Capture Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to finalize Google Pay payment" },
      { status: 500 },
    );
  }
}
