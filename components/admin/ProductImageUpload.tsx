"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  UploadCloud,
  Trash2,
  Star,
  Plus,
  Link as LinkIcon,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export function ProductImageUpload({ images, onChange }: ProductImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = useCallback(
    async (fileList: FileList | File[] | null) => {
      if (!fileList || fileList.length === 0) return;

      const files = Array.from(fileList);

      // Pre-validate file sizes
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
          const errorMsg = `File "${file.name}" (${sizeMb}MB) exceeds the 25MB size limit.`;
          setUploadError(errorMsg);
          toast.error(errorMsg);
          return;
        }
      }

      setIsUploading(true);
      setUploadError(null);

      const formData = new FormData();
      for (const file of files) {
        formData.append("file", file);
      }

      try {
        const response = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });

        let data: any = {};
        try {
          data = await response.json();
        } catch {
          const text = await response.text().catch(() => "");
          data = {
            error: text || `Upload failed with status ${response.status} (${response.statusText})`,
          };
        }

        if (!response.ok) {
          throw new Error(data.error || "Failed to upload image.");
        }

        const newUrls: string[] = (
          data.urls && Array.isArray(data.urls)
            ? data.urls
            : data.url
              ? [data.url]
              : []
        ).filter(Boolean);

        if (newUrls.length > 0) {
          // Merge without duplicates, prepending newest images
          const combined = [...newUrls, ...images].filter(
            (url, index, arr) => arr.indexOf(url) === index,
          );
          onChange(combined);
          toast.success(
            newUrls.length === 1
              ? "Image uploaded successfully."
              : `${newUrls.length} images uploaded successfully.`,
          );
        } else {
          toast.error("Upload succeeded, but no image URL was returned.");
        }
      } catch (err: any) {
        const msg = err.message || "An unexpected error occurred during upload.";
        setUploadError(msg);
        toast.error(msg);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [images, onChange],
  );

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Support pasting image from clipboard (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        toast.info(`Uploading ${imageFiles.length} pasted image(s)...`);
        handleFileUpload(imageFiles);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleFileUpload]);

  const handleAddUrl = () => {
    const trimmed = customUrl.trim();
    if (!trimmed) return;
    if (!images.includes(trimmed)) {
      onChange([trimmed, ...images]);
      toast.success("Image URL added.");
    } else {
      toast.info("Image already in list.");
    }
    setCustomUrl("");
    setShowUrlInput(false);
  };

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
    toast.success("Image removed.");
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const selected = images[index];
    const filtered = images.filter((_, i) => i !== index);
    onChange([selected, ...filtered]);
    toast.success("Cover image updated.");
  };

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#776a61]">
          Product Images ({images.length})
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="inline-flex items-center gap-1 text-[11px] text-[#8f5d48] hover:underline"
        >
          <LinkIcon size={12} />
          {showUrlInput ? "Hide URL input" : "Add from URL"}
        </button>
      </div>

      {showUrlInput && (
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://example.com/image.jpg or /images/..."
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddUrl();
              }
            }}
            className="h-9 flex-1 border border-[#d9cec5] bg-white/70 px-3 text-xs outline-none focus:border-[#8f5d48]"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAddUrl}
            className="h-9 rounded-none bg-[#211b18] px-3 text-white hover:bg-black text-[10px] uppercase tracking-wider"
          >
            <Plus size={14} className="mr-1" /> Add
          </Button>
        </div>
      )}

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-6 transition-all ${
          isUploading
            ? "border-[#8f5d48] bg-[#8f5d48]/5"
            : isDragOver
              ? "border-[#8f5d48] bg-[#8f5d48]/10 scale-[1.01]"
              : "border-[#d9cec5] bg-white/40 hover:border-[#8f5d48] hover:bg-white/70"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.jpg,.jpeg,.png,.webp,.avif,.gif,.svg,.jfif"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-center text-[#8f5d48]">
            <Loader2 size={26} className="animate-spin" />
            <p className="text-xs font-semibold">Uploading image(s)...</p>
            <p className="text-[10px] text-[#776a61]">Saving high-resolution photos</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="rounded-full bg-[#f4ede6] p-2.5 text-[#8f5d48] group-hover:scale-110 transition-transform">
              <UploadCloud size={22} />
            </div>
            <p className="text-xs font-semibold text-[#211b18]">
              Click to browse, drag & drop photos, or paste with Ctrl+V
            </p>
            <p className="text-[10px] text-[#8f8279]">
              Supports PNG, JPG, WebP, AVIF, GIF, SVG up to 25MB
            </p>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="border border-[#b86d5a] bg-[#fbf2ef] p-3 text-xs text-[#8f2d18]">
          <p className="font-semibold">Upload failed</p>
          <p className="mt-0.5">{uploadError}</p>
        </div>
      )}

      {/* Thumbnails Gallery */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className={`group relative aspect-square overflow-hidden border bg-[#f9f6f2] shadow-xs transition-all ${
                idx === 0 ? "border-[#8f5d48] ring-2 ring-[#8f5d48]/40" : "border-[#d9cec5]"
              }`}
            >
              <img
                src={url}
                alt={`Product thumbnail ${idx + 1}`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />

              {/* Badge for Primary Image */}
              {idx === 0 && (
                <span className="absolute left-1.5 top-1.5 z-10 bg-[#8f5d48] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white shadow-xs">
                  ★ Cover Photo
                </span>
              )}

              {/* Action Overlays */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60 p-2 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
                {idx !== 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetPrimary(idx);
                    }}
                    className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[10px] font-semibold uppercase text-[#211b18] hover:bg-[#8f5d48] hover:text-white transition-colors cursor-pointer"
                  >
                    <Star size={11} /> Set as Cover
                  </button>
                )}
                <button
                  type="button"
                  title="Remove image"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(idx);
                  }}
                  className="inline-flex items-center gap-1 rounded bg-rose-600 px-2 py-1 text-[10px] font-semibold uppercase text-white hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  <Trash2 size={11} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="flex items-center gap-2 text-[11px] text-[#8f8279]">
          <ImageIcon size={14} />
          <span>No images uploaded yet. Cover photo is recommended.</span>
        </div>
      )}
    </div>
  );
}

