import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, apiFailure } from "@/lib/security/api";
import { captureCheckoutPayment } from "@/lib/payments/capture-checkout";
export async function POST(request: Request) {
  try {
    const { paypalOrderId } = await readJson(
      request,
      z.object({ paypalOrderId: z.string().regex(/^[A-Z0-9]{10,32}$/) }),
    );
    return NextResponse.json(await captureCheckoutPayment(paypalOrderId));
  } catch (error) {
    console.error(
      "Checkout capture rejected",
      error instanceof Error ? error.message : "Unknown failure",
    );
    return apiFailure(
      error,
      "Payment could not be verified. If charged, contact support before retrying.",
    );
  }
}
