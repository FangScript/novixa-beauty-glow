import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, orderNumber, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: "Name, email, and message are required." },
        { status: 400 },
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    // Record inquiry in DB if available
    if (process.env.DATABASE_URL) {
      // Find or link user
      const existingUser = await prisma.user
        .findUnique({
          where: { email: email.trim().toLowerCase() },
        })
        .catch(() => null);

      if (existingUser) {
        await prisma.adminAuditLog
          .create({
            data: {
              userId: existingUser.id,
              action: "CUSTOMER_INQUIRY",
              resource: "CONCIERGE",
              resourceId: orderNumber ? orderNumber.trim() : null,
              metadata: {
                name: name.trim(),
                email: email.trim(),
                phone: phone ? phone.trim() : null,
                subject: subject || "General Inquiry",
                message: message.trim(),
              },
            },
          })
          .catch(() => null);
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "Thank you for contacting NOVIXA. Your private inquiry has been received, and our concierge will respond within 24 hours.",
    });
  } catch (error: any) {
    console.error("POST /api/contact error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to transmit message. Please try again." },
      { status: 500 },
    );
  }
}
