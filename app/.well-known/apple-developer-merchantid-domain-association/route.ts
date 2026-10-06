import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-static";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", ".well-known", "apple-developer-merchantid-domain-association");
    if (!fs.existsSync(filePath)) {
      return new NextResponse("File not found", { status: 404 });
    }
    const buffer = fs.readFileSync(filePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
