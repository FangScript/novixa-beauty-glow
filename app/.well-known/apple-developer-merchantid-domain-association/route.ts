import fs from "node:fs";
import path from "node:path";

export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      ".well-known",
      "apple-developer-merchantid-domain-association",
    );
    const content = fs.readFileSync(filePath, "utf-8");

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err: any) {
    return new Response("Not found", { status: 404 });
  }
}
