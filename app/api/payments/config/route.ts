import { NextResponse } from "next/server";
import { publicPaymentConfig } from "@/lib/payments/public-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store, max-age=0" };
  try {
    // Pass the runtime environment, rather than compiling NEXT_PUBLIC values into this route.
    return NextResponse.json(publicPaymentConfig(process.env), { headers });
  } catch (error) {
    console.error(
      "Payment configuration rejected",
      error instanceof Error ? error.message : "Unknown failure",
    );
    return NextResponse.json(
      { error: "Payment configuration is unavailable. Please contact support." },
      { status: 503, headers },
    );
  }
}
