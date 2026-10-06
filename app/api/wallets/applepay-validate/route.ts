import { NextResponse } from "next/server";
import { validateApplePayMerchantSession } from "@/lib/payments/paypal";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { validationUrl, domainName } = body;

    if (!validationUrl || typeof validationUrl !== "string") {
      return NextResponse.json(
        { error: "validationUrl is required." },
        { status: 400 },
      );
    }

    const merchantSession = await validateApplePayMerchantSession(validationUrl, domainName);

    return NextResponse.json({ ok: true, merchantSession });
  } catch (error: any) {
    console.error("Apple Pay validate merchant error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to validate Apple Pay merchant." },
      { status: 500 },
    );
  }
}
