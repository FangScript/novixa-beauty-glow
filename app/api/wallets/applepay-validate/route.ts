import { NextResponse } from "next/server";
import { validateApplePayMerchantSession } from "@/lib/payments/paypal";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { validationUrl, domainName } = body;

    if (!validationUrl) {
      return NextResponse.json(
        { error: "Apple Pay validationUrl is required." },
        { status: 400 },
      );
    }

    const host = request.headers.get("host") || domainName || "www.novixaretail.com";
    const cleanHost = host.split(":")[0];

    const merchantSession = await validateApplePayMerchantSession(validationUrl, cleanHost);

    return NextResponse.json({
      ok: true,
      merchantSession,
    });
  } catch (error: any) {
    console.error("Apple Pay Merchant Validation Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to validate Apple Pay merchant session" },
      { status: 500 },
    );
  }
}
