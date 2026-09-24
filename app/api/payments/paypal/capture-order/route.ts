import { NextResponse } from "next/server";
import { capturePayPalOrder, getPayPalOrderDetails } from "@/lib/payments/paypal";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paypalOrderId } = body;

    if (!paypalOrderId) {
      return NextResponse.json(
        { error: "PayPal Order ID is required." },
        { status: 400 },
      );
    }

    // Capture the payment via PayPal API
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
      payerName: payer.name ? `${payer.name.given_name || ""} ${payer.name.surname || ""}`.trim() : null,
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
