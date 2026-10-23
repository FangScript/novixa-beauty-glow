import { prisma } from "@/lib/db/client";
import { getAuthenticatedCustomer } from "@/lib/auth/session";
import { preparedOrderNumber } from "@/lib/payments/prepared-order";
import { cartHash } from "@/lib/payments/checkout-intent";
import { requireUKDestination } from "@/lib/commerce/shipping";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createPayPalOrder } from "@/lib/payments/paypal";
import { getCheckoutQuote } from "@/lib/commerce/quote";
import { CommerceError, moneyInPence } from "@/lib/commerce/pricing";
import { readJson, apiFailure, ApiError } from "@/lib/security/api";
import { authSecret } from "@/lib/security/signing";
import {
  createCheckoutIntent,
  CHECKOUT_COOKIE,
  CHECKOUT_TTL,
} from "@/lib/payments/checkout-intent";

const text = z.string().trim().max(180).optional();
const schema = z.object({
  customer: z.object({
    name: z.string().trim().min(1).max(180),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(80).optional(),
  }),
  items: z.unknown(),
  expectedTotal: z.number().finite().positive(),
  couponCode: z.string().max(64).optional(),
  shippingMethodId: z.string().max(128).optional(),
  shippingAddress: z.object({
    name: text,
    addressLine1: z.string().trim().min(1).max(180),
    addressLine2: text,
    city: z.string().trim().min(1).max(180),
    state: text,
    postalCode: z.string().trim().min(1).max(32),
    countryCode: text,
  }),
  paymentSource: z.enum(["card", "paypal", "apple_pay", "google_pay"]).default("paypal"),
});
export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) throw new ApiError("Checkout is temporarily unavailable.", 503);
    authSecret();
    const body = await readJson(request, schema);
    let countryCode: string;
    try {
      countryCode = requireUKDestination(body.shippingAddress.countryCode);
    } catch {
      throw new CommerceError("Delivery is currently available to United Kingdom addresses only.");
    }
    const quote = await getCheckoutQuote({ ...body, countryCode });
    if (moneyInPence(body.expectedTotal) !== quote.totalPence)
      throw new CommerceError(
        "Prices or delivery charges changed. Refresh checkout before paying.",
      );
    const order = await createPayPalOrder({
      amount: quote.total,
      currency: "GBP",
      orderNumber: "NVX-" + randomUUID(),
      description: "NOVIXA purchase",
      paymentSourceType: body.paymentSource,
      shippingAddress: body.shippingAddress,
    });
    if (!order.id) throw new Error("Provider returned no order ID.");
    const customer = await getAuthenticatedCustomer();
    const address = body.shippingAddress;
    await prisma.order.create({
      data: {
        orderNumber: preparedOrderNumber(order.id),
        status: "PENDING",
        paymentStatus: "UNPAID",
        userId: customer?.id || null,
        subtotal: quote.subtotal,
        discount: quote.discount,
        shipping: quote.shipping,
        tax: quote.tax,
        total: quote.total,
        couponId: quote.couponId,
        shippingMethodId: quote.shippingMethodId,
        shippingMethodName: quote.shippingMethodName,
        shippingAddressSnapshot: {
          fullName: body.customer.name,
          email: body.customer.email,
          phone: body.customer.phone || "",
          line1: address.addressLine1,
          line2: address.addressLine2 || "",
          city: address.city,
          state: address.state || "",
          postalCode: address.postalCode,
          country: countryCode,
        },
        items: { create: quote.lineItems },
        payment: {
          create: {
            provider: "PAYPAL",
            method: body.paymentSource.toUpperCase(),
            status: "UNPAID",
            providerPaymentId: order.id,
            amount: quote.total,
            currency: "GBP",
            rawStatus: JSON.stringify({ paypalOrderId: order.id, cartHash: cartHash(quote.items) }),
          },
        },
      },
    });
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
