import { z } from "zod";
import { readJson, apiFailure } from "@/lib/security/api";
import { NextResponse } from "next/server";
import { validateApplePayMerchantSession } from "@/lib/payments/paypal";

export async function POST(request: Request) {
  try {
    const body = await readJson(
      request,
      z.object({
        validationUrl: z.string().url().max(2048),
        domainName: z.string().max(253).optional(),
      }),
    );
    const { validationUrl, domainName } = body;

    if (!validationUrl || typeof validationUrl !== "string") {
      return NextResponse.json({ error: "validationUrl is required." }, { status: 400 });
    }

    const merchantSession = await validateApplePayMerchantSession(validationUrl, domainName);

    return NextResponse.json({ ok: true, merchantSession });
  } catch (error: any) {
    console.error("Apple Pay validate merchant error:", error);
    return apiFailure(
      error,
      "Unable to validate Apple Pay. Check merchant configuration or use another payment method.",
    );
  }
}
