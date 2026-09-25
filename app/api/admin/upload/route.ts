import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  "image/svg+xml",
  "image/heic",
  "image/heif",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
  ".svg",
  ".jfif",
  ".heic",
  ".heif",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/pjpeg": ".jpg",
  "image/jfif": ".jpg",
  "image/png": ".png",
  "image/x-png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    // Support "file", "files", or "image" field names
    let files = formData.getAll("file") as File[];
    if (!files || files.length === 0) {
      files = formData.getAll("files") as File[];
    }
    if (!files || files.length === 0) {
      files = formData.getAll("image") as File[];
    }
    if (!files || files.length === 0) {
      files = formData.getAll("images") as File[];
    }

    // Filter out any non-file or empty entries
    const validFiles = files.filter(
      (f) => f && typeof f === "object" && typeof f.arrayBuffer === "function" && f.size > 0,
    );

    if (validFiles.length === 0) {
      return NextResponse.json({ error: "No valid image files provided for upload." }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
    await mkdir(uploadDir, { recursive: true });

    const uploadedUrls: string[] = [];

    for (const file of validFiles) {
      const mimeType = (file.type || "").toLowerCase().trim();
      const rawExt = path.extname(file.name || "").toLowerCase().trim();

      const isMimeAllowed = ALLOWED_MIME_TYPES.has(mimeType);
      const isExtAllowed = ALLOWED_EXTENSIONS.has(rawExt);

      // If neither MIME nor extension is valid, reject
      if (!isMimeAllowed && !isExtAllowed) {
        return NextResponse.json(
          {
            error: `Unsupported file format (${file.type || "unknown"}). Allowed formats: JPG, PNG, WebP, AVIF, GIF, SVG.`,
          },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        return NextResponse.json(
          { error: `File "${file.name}" (${sizeMb}MB) exceeds the maximum limit of 25MB.` },
          { status: 400 },
        );
      }

      // Determine clean extension
      let extension = isExtAllowed ? rawExt : (MIME_TO_EXT[mimeType] || ".jpg");
      if (extension === ".jpeg" || extension === ".jfif") {
        extension = ".jpg";
      }

      const safeFilename = `novixa-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;
      const destinationPath = path.join(uploadDir, safeFilename);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(destinationPath, buffer);

      uploadedUrls.push(`/uploads/products/${safeFilename}`);
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      url: uploadedUrls[0],
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload file. Please try again." },
      { status: 500 },
    );
  }
}

