import { NextResponse } from "next/server";
import {
  capturePayPalOrder,
  confirmPayPalOrderPaymentSource,
  getPayPalOrderDetails,
} from "@/lib/payments/paypal";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paypalOrderId, paymentMethodData } = body;

    if (!paypalOrderId) {
      return NextResponse.json({ error: "paypalOrderId is required." }, { status: 400 });
    }

    // 1. Authoritative PayPal Order State Check
    let orderDetails: any;
    try {
      orderDetails = await getPayPalOrderDetails(paypalOrderId);
    } catch (fetchErr: any) {
      console.error(`Failed to fetch PayPal order [${paypalOrderId}]:`, fetchErr);
      return NextResponse.json(
        { error: fetchErr.message || "Failed to retrieve order state from PayPal." },
        { status: 500 },
      );
    }

    // If order is already completed, return immediately
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

    // 2. If not yet approved, confirm payment source if token provided
    if (orderDetails.status !== "APPROVED" && paymentMethodData?.tokenizationData?.token) {
      try {
        let parsedToken: any;
        try {
          parsedToken = JSON.parse(paymentMethodData.tokenizationData.token);
        } catch {
          parsedToken = paymentMethodData.tokenizationData.token;
        }

        await confirmPayPalOrderPaymentSource(paypalOrderId, {
          google_pay: typeof parsedToken === "object" ? parsedToken : { token: parsedToken },
        });
      } catch (confirmErr: any) {
        console.warn("Notice: Google Pay payment source confirmation:", confirmErr.message);
      }
    }

    // 3. Capture the PayPal order
    let captureData: any;
    try {
      captureData = await capturePayPalOrder(paypalOrderId);
    } catch (captureErr: any) {
      if (captureErr?.message?.includes("ORDER_ALREADY_CAPTURED")) {
        captureData = await getPayPalOrderDetails(paypalOrderId);
      } else {
        throw captureErr;
      }
    }

    const captureRecord = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    const isCompleted = captureData.status === "COMPLETED" || captureRecord?.status === "COMPLETED";

    const currencyCode =
      captureData.purchase_units?.[0]?.amount?.currency_code ||
      captureRecord?.amount?.currency_code;
    if (currencyCode && currencyCode !== "GBP") {
      return NextResponse.json(
        { error: `Payment currency mismatch: expected GBP, received ${currencyCode}.` },
        { status: 400 },
      );
    }

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
    console.error("Google Pay confirm & capture error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to confirm Google Pay transaction with PayPal." },
      { status: 500 },
    );
  }
}
