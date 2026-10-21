import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, apiFailure, limitAttempts } from "@/lib/security/api";
import { requireCheckoutIntent } from "@/lib/payments/checkout-session";
export async function POST(request: Request) {
  try {
    const body = await readJson(
      request,
      z.object({
        step: z.enum(["confirmOrder", "captureOrder"]),
        paypalOrderId: z.string().regex(/^[A-Z0-9]{10,32}$/),
        status: z.number().int().min(100).max(599).optional(),
      }),
      16384,
    );
    await requireCheckoutIntent(body.paypalOrderId);
    limitAttempts("payment-diagnostics:" + body.paypalOrderId, 10);
    // Exclude client error objects, tokens, and payer details.
    console.warn("Wallet client failure", body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiFailure(error, "Unable to record payment diagnostics.");
  }
}
