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

    // If paymentMethodData is provided from Google Pay SDK, confirm payment source with PayPal
    if (paymentMethodData?.tokenizationData?.token) {
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

    // Capture the PayPal order
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
