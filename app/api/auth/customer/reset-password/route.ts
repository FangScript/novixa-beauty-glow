import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { readJson, apiFailure, limitAttempts, ApiError } from "@/lib/security/api";
import { getBaseAppUrl } from "@/lib/auth/google-oauth";
import { newRecoveryToken } from "@/lib/auth/recovery-token";
import { sendMail } from "@/lib/email/service";
import { escapeHtml } from "@/lib/security/html";

export async function POST(request: Request) {
  try {
    const { email } = await readJson(
      request,
      z.object({
        email: z
          .string()
          .trim()
          .email()
          .max(254)
          .transform((value) => value.toLowerCase()),
      }),
    );
    limitAttempts("password-reset:" + email, 3);
    if (!process.env.DATABASE_URL) throw new ApiError("Account recovery is unavailable.", 503);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const recovery = newRecoveryToken();
      await prisma.session.create({
        data: { id: recovery.id, userId: user.id, expiresAt: recovery.expiresAt },
      });
      const link = getBaseAppUrl(request) + "/account/reset-password#token=" + recovery.token;
      const sent = await sendMail({
        to: user.email,
        subject: "Reset your NOVIXA password",
        html:
          '<p>Use this link within 15 minutes to reset your password:</p><p><a href="' +
          escapeHtml(link) +
          '">Reset password</a></p><p>If you did not request this, ignore this email.</p>',
      });
      if (!sent.ok || "simulated" in sent) {
        await prisma.session.delete({ where: { id: recovery.id } });
        console.error("Password recovery email was not delivered.");
      }
    }
    return NextResponse.json({
      ok: true,
      message: "If that account exists, a recovery email will be sent.",
    });
  } catch (error) {
    return apiFailure(error, "Account recovery is temporarily unavailable.");
  }
}
