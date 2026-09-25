import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/jfif",
  "image/png",
  "image/x-png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
  ".jfif",
]);

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB per file
const MAX_FILES = 4;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("file") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No image files provided." }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `You can upload up to ${MAX_FILES} photos per review.` },
        { status: 400 },
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "reviews");
    await mkdir(uploadDir, { recursive: true });

    const uploadedUrls: string[] = [];

    for (const file of files) {
      const mimeType = (file.type || "").toLowerCase().trim();
      const rawExt = path.extname(file.name || "").toLowerCase().trim();

      const isMimeAllowed = ALLOWED_MIME_TYPES.has(mimeType);
      const isExtAllowed = ALLOWED_EXTENSIONS.has(rawExt);

      if (!isMimeAllowed && !isExtAllowed) {
        return NextResponse.json(
          {
            error: `Unsupported file format (${file.type || "unknown"}). Please upload JPG, PNG, WebP or AVIF images.`,
          },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Image "${file.name}" exceeds the 15MB size limit.` },
          { status: 400 },
        );
      }

      let extension = isExtAllowed ? rawExt : ".jpg";
      if (extension === ".jpeg" || extension === ".jfif") {
        extension = ".jpg";
      }
      const safeFilename = `review-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;
      const destinationPath = path.join(uploadDir, safeFilename);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(destinationPath, buffer);

      uploadedUrls.push(`/uploads/reviews/${safeFilename}`);
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      url: uploadedUrls[0],
    });
  } catch (error: any) {
    console.error("Review image upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process photo upload." },
      { status: 500 },
    );
  }
}
