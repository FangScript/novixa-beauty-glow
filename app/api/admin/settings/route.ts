import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/auth/session";

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasSmtp = Boolean(
    process.env.SMTP_HOST &&
    (process.env.SMTP_USER || process.env.EMAIL_USER) &&
    (process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD),
  );
  const hasResend = Boolean(process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY);

  return NextResponse.json({
    database: Boolean(process.env.DATABASE_URL),
    payments: Boolean(process.env.PAYPAL_CLIENT_ID),
    email: hasSmtp || hasResend,
    emailProvider: hasSmtp ? "Gmail / SMTP" : hasResend ? "Resend" : null,
    media: Boolean(process.env.MEDIA_BUCKET || process.env.S3_BUCKET),
  });
}
