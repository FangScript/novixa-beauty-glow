import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
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
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          {
            error: `Unsupported file format (${file.type}). Please upload JPG, PNG, WebP or AVIF images.`,
          },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Image "${file.name}" exceeds the 5MB size limit.` },
          { status: 400 },
        );
      }

      const extension = path.extname(file.name) || `.${file.type.split("/")[1]}`;
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
