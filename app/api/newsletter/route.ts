import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 },
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify or register the WELCOME10 coupon
    let couponDetails = {
      code: "WELCOME10",
      discount: "10% off",
      minimumOrder: 40,
      terms: "Valid on orders above £40",
    };

    if (process.env.DATABASE_URL) {
      // 1. Capture customer lead in database if not already present
      await prisma.user
        .upsert({
          where: { email: cleanEmail },
          update: {},
          create: {
            email: cleanEmail,
            name: cleanEmail.split("@")[0],
            role: "CUSTOMER",
          },
        })
        .catch(() => null);

      // 2. Fetch or seed the WELCOME10 promotional voucher
      const welcomeCoupon = await prisma.coupon
        .upsert({
          where: { code: "WELCOME10" },
          update: { active: true, minimumOrder: 40 },
          create: {
            code: "WELCOME10",
            type: "PERCENTAGE",
            value: 10,
            minimumOrder: 40,
            active: true,
          },
        })
        .catch(() => null);

      if (welcomeCoupon) {
        couponDetails = {
          code: welcomeCoupon.code,
          discount: `${welcomeCoupon.value}% off`,
          minimumOrder: welcomeCoupon.minimumOrder,
          terms: `Valid on orders above £${welcomeCoupon.minimumOrder}`,
        };
      }
    }

    return NextResponse.json({
      success: true,
      message: "Welcome to the NOVIXA VIP list. Your private welcome offer is ready.",
      welcomeOffer: couponDetails,
    });
  } catch (error: any) {
    console.error("POST /api/newsletter error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to process subscription. Please try again." },
      { status: 500 },
    );
  }
}
