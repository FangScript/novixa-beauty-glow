import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, apiFailure } from "@/lib/security/api";
import { captureCheckoutPayment } from "@/lib/payments/capture-checkout";
export async function POST(request: Request) {
  let reference = "";
  try {
    const { paypalOrderId } = await readJson(
      request,
      z.object({ paypalOrderId: z.string().regex(/^[A-Z0-9]{10,32}$/) }),
    );
    reference = paypalOrderId;
    return NextResponse.json(await captureCheckoutPayment(paypalOrderId));
  } catch (error) {
    console.error(
      "Checkout capture rejected",
      error instanceof Error ? error.message : "Unknown failure",
    );
    return apiFailure(
      error,
      `Payment confirmation is pending. Do not pay again. Contact support with reference ${reference || "from your wallet"}.`,
    );
  }
}
