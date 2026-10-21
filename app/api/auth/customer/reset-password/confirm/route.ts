import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { readJson, apiFailure, ApiError } from "@/lib/security/api";
import { recoveryTokenId } from "@/lib/auth/recovery-token";
import { hashPassword, CUSTOMER_SESSION_COOKIE, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const { token, password } = await readJson(
      request,
      z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: z.string().min(8).max(256) }),
    );
    const id = recoveryTokenId(token);
    const recovery = await prisma.session.findUnique({ where: { id } });
    if (!recovery || recovery.expiresAt <= new Date())
      throw new ApiError("This reset link is invalid or expired.");
    const passwordHash = hashPassword(password);
    await prisma.$transaction(async (tx) => {
      const used = await tx.session.deleteMany({
        where: { id, userId: recovery.userId, expiresAt: { gt: new Date() } },
      });
      if (used.count !== 1) throw new ApiError("This reset link has already been used.");
      await tx.user.update({
        where: { id: recovery.userId },
        data: { passwordHash, emailVerifiedAt: new Date() },
      });
      await tx.session.deleteMany({ where: { userId: recovery.userId } });
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(CUSTOMER_SESSION_COOKIE);
    response.cookies.delete(SESSION_COOKIE);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return apiFailure(error, "Unable to reset your password.");
  }
}
