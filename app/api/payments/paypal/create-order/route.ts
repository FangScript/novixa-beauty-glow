import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createPayPalOrder } from "@/lib/payments/paypal";
import { getCheckoutQuote } from "@/lib/commerce/quote";
import { CommerceError } from "@/lib/commerce/pricing";
import { readJson, apiFailure, ApiError } from "@/lib/security/api";
import { authSecret } from "@/lib/security/signing";
import {
  createCheckoutIntent,
  CHECKOUT_COOKIE,
  CHECKOUT_TTL,
} from "@/lib/payments/checkout-intent";

const text = z.string().trim().max(180).optional();
const schema = z.object({
  items: z.unknown(),
  couponCode: z.string().max(64).optional(),
  shippingMethodId: z.string().max(128).optional(),
  shippingAddress: z
    .object({
      name: text,
      addressLine1: text,
      addressLine2: text,
      city: text,
      state: text,
      postalCode: text,
      countryCode: text,
    })
    .optional(),
  paymentSource: z.enum(["card", "paypal", "apple_pay", "google_pay"]).default("paypal"),
});
export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) throw new ApiError("Checkout is temporarily unavailable.", 503);
    authSecret();
    const body = await readJson(request, schema);
    const quote = await getCheckoutQuote(body);
    const order = await createPayPalOrder({
      amount: quote.total,
      currency: "GBP",
      orderNumber: "NVX-" + randomUUID(),
      description: "NOVIXA purchase",
      paymentSourceType: body.paymentSource,
      shippingAddress: body.shippingAddress,
    });
    if (!order.id) throw new Error("Provider returned no order ID.");
    const response = NextResponse.json({
      ok: true,
      id: order.id,
      amount: quote.total,
      currency: "GBP",
    });
    response.cookies.set(
      CHECKOUT_COOKIE,
      createCheckoutIntent(order.id, quote.items, quote.total),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: CHECKOUT_TTL,
      },
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof CommerceError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    console.error(
      "PayPal order creation failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return apiFailure(error, "Unable to initialize this payment.");
  }
}
