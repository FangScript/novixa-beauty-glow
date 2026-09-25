import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

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

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

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
    const supabase = getSupabaseClient();
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
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      let fileSaved = false;

      // ── Strategy 1: Supabase Storage Cloud Upload (Vercel & Production) ───
      if (supabase) {
        try {
          const { data, error } = await supabase.storage
            .from("products")
            .upload(`reviews/${safeFilename}`, buffer, {
              contentType: mimeType || "image/jpeg",
              upsert: true,
            });

          if (!error && data) {
            const { data: pubData } = supabase.storage
              .from("products")
              .getPublicUrl(`reviews/${safeFilename}`);
            if (pubData?.publicUrl) {
              uploadedUrls.push(pubData.publicUrl);
              fileSaved = true;
            }
          }
        } catch (sErr: any) {
          console.warn("Supabase review upload attempt error:", sErr?.message);
        }
      }

      // ── Strategy 2: Local Disk Storage (Local Dev & Self-hosted) ───────────
      if (!fileSaved) {
        try {
          await mkdir(uploadDir, { recursive: true });
          const destinationPath = path.join(uploadDir, safeFilename);
          await writeFile(destinationPath, buffer);
          uploadedUrls.push(`/uploads/reviews/${safeFilename}`);
          fileSaved = true;
        } catch (diskErr: any) {
          console.warn("Local disk write failed for review photo:", diskErr?.message);
        }
      }

      // ── Strategy 3: Base64 Data URL Fallback (Never Fails) ─────────────────
      if (!fileSaved) {
        const base64 = buffer.toString("base64");
        uploadedUrls.push(`data:${mimeType || "image/jpeg"};base64,${base64}`);
      }
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

