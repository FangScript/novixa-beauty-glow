import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getAuthenticatedAdmin } from "@/lib/auth/session";
import { sendSupportReplyEmail } from "@/lib/email/service";

export async function POST(request: Request) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized. Administrator session required." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { inquiryId, toEmail, toName, originalSubject, replyMessage } = body;

    if (!toEmail || !replyMessage || !originalSubject) {
      return NextResponse.json(
        { error: "toEmail, originalSubject, and replyMessage are required." },
        { status: 400 },
      );
    }

    // Send the reply email
    const emailResult = await sendSupportReplyEmail({
      toName: toName || "Valued Patron",
      toEmail: toEmail.trim(),
      originalSubject,
      replyMessage: replyMessage.trim(),
      agentName: admin.name || "NOVIXA Concierge Team",
      inquiryId,
    });

    if (!emailResult.ok) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to send reply email." },
        { status: 500 },
      );
    }

    // Update the inquiry status in DB if we have a real inquiryId and DB is available
    if (inquiryId && process.env.DATABASE_URL) {
      await prisma.adminAuditLog
        .update({
          where: { id: inquiryId },
          data: {
            metadata: {
              status: "IN_REVIEW",
              lastRepliedAt: new Date().toISOString(),
              repliedBy: admin.name || admin.email,
            },
          },
        })
        .catch((err) => console.warn("Failed to update inquiry status after reply:", err));
    }

    return NextResponse.json({
      ok: true,
      message: `Reply sent successfully to ${toEmail}.`,
    });
  } catch (error: any) {
    console.error("POST /api/admin/support/reply error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send support reply." },
      { status: 500 },
    );
  }
}
