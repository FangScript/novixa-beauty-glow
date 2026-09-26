import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { sendSupportInquiryEmail } from "@/lib/email/service";

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

    let createdInquiryId: string | undefined = undefined;

    // Record inquiry in DB if available
    if (process.env.DATABASE_URL) {
      const cleanEmail = email.trim().toLowerCase();
      // Ensure customer record exists so the inquiry is never dropped
      const customer = await prisma.user
        .upsert({
          where: { email: cleanEmail },
          update: {
            ...(phone ? { phone: phone.trim() } : {}),
          },
          create: {
            email: cleanEmail,
            name: name.trim(),
            phone: phone ? phone.trim() : null,
            role: "CUSTOMER",
          },
        })
        .catch(() => null);

      if (customer) {
        const auditLog = await prisma.adminAuditLog
          .create({
            data: {
              userId: customer.id,
              action: "CUSTOMER_INQUIRY",
              resource: "CONCIERGE",
              resourceId: orderNumber ? orderNumber.trim() : null,
              metadata: {
                name: name.trim(),
                email: cleanEmail,
                phone: phone ? phone.trim() : null,
                subject: subject || "General Inquiry",
                message: message.trim(),
                status: "PENDING",
                submittedAt: new Date().toISOString(),
              },
            },
          })
          .catch((err) => {
            console.warn("Failed to create audit log for inquiry:", err);
            return null;
          });

        if (auditLog) {
          createdInquiryId = auditLog.id;
        }
      }
    }

    // Dispatch emails asynchronously
    sendSupportInquiryEmail({
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : null,
      subject: subject || "General Inquiry",
      orderNumber: orderNumber ? orderNumber.trim() : null,
      message: message.trim(),
      inquiryId: createdInquiryId,
    }).catch((err) => console.warn("Background support email failed:", err));

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
