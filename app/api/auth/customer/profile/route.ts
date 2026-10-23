import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { readJson, apiFailure, ApiError } from "@/lib/security/api";
export async function PATCH(request: Request) {
  try {
    const customer = await getAuthenticatedCustomer();
    if (!customer) throw new ApiError("Sign in to update your profile.", 401);
    const { name } = await readJson(request, z.object({ name: z.string().trim().min(1).max(180) }));
    const user = await prisma.user.update({
      where: { id: customer.id },
      data: { name },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json({ ok: true, user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiFailure(error, "Unable to update your profile.");
  }
}
