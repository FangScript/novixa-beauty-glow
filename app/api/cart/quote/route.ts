import { NextResponse } from "next/server";
import { z } from "zod";
import { getCheckoutQuote } from "@/lib/commerce/quote";
import { CommerceError } from "@/lib/commerce/pricing";
import { readJson, apiFailure } from "@/lib/security/api";

export async function POST(request: Request) {
  try {
    const body = await readJson(
      request,
      z.object({
        items: z.unknown(),
        couponCode: z.string().max(64).optional(),
        shippingMethodId: z.string().max(128).optional(),
      }),
    );
    const quote = await getCheckoutQuote(body);
    return NextResponse.json(
      {
        items: quote.cartItems,
        subtotal: quote.merchandiseSubtotal,
        discount: quote.couponDiscount,
        shipping: quote.shipping,
        total: quote.total,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof CommerceError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return apiFailure(error, "Unable to verify current prices. Please try again.");
  }
}
