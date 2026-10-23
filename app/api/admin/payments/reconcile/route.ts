import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedAdmin } from "@/lib/auth/session";
import { readJson, apiFailure, ApiError } from "@/lib/security/api";
import { reconcilePreparedOrder } from "@/lib/payments/prepared-order";
export async function POST(request: Request) {
  try {
    if (!(await getAuthenticatedAdmin())) throw new ApiError("Administrator access required.", 403);
    const { paypalOrderId } = await readJson(
      request,
      z.object({ paypalOrderId: z.string().regex(/^[A-Z0-9]{10,32}$/) }),
    );
    return NextResponse.json(await reconcilePreparedOrder(paypalOrderId));
  } catch (error) {
    return apiFailure(error, "Unable to reconcile this payment.");
  }
}
