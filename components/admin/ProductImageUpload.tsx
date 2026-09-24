"use client";

import { useState, useRef } from "react";
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

export function ProductImageUpload({ images, onChange }: ProductImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("file", files[i]);
    }

    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image.");
      }

      if (data.urls && Array.isArray(data.urls)) {
        onChange([...data.urls, ...images]);
      } else if (data.url) {
        onChange([data.url, ...images]);
      }
      toast.success("Image uploaded successfully.");
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
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleAddUrl = () => {
    const trimmed = customUrl.trim();
    if (!trimmed) return;
    if (!images.includes(trimmed)) {
      onChange([trimmed, ...images]);
    }
    setCustomUrl("");
    setShowUrlInput(false);
  };

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const selected = images[index];
    const filtered = images.filter((_, i) => i !== index);
    onChange([selected, ...filtered]);
  };

  return (
    <div className="space-y-3">
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
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-5 transition-colors ${
          isUploading
            ? "border-[#8f5d48] bg-[#8f5d48]/5"
            : "border-[#d9cec5] bg-white/40 hover:border-[#8f5d48] hover:bg-white/70"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-center text-[#8f5d48]">
            <Loader2 size={24} className="animate-spin" />
            <p className="text-xs font-medium">Uploading image(s)...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-center">
            <div className="rounded-full bg-[#f4ede6] p-2.5 text-[#8f5d48] group-hover:scale-105 transition-transform">
              <UploadCloud size={20} />
            </div>
            <p className="text-xs font-medium text-[#211b18]">
              Click to browse or drag & drop product photos
            </p>
            <p className="text-[10px] text-[#8f8279]">
              Supports PNG, JPG, WebP, AVIF up to 5MB (stored on your server)
            </p>
          </div>
        )}
      </div>

      {uploadError && (
        <p className="border border-[#b86d5a] bg-[#fbf2ef] p-2.5 text-xs text-[#8f2d18]">
          {uploadError}
        </p>
      )}

      {/* Thumbnails Gallery */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {images.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className={`group relative aspect-square overflow-hidden border bg-[#f9f6f2] transition-all ${
                idx === 0 ? "border-[#8f5d48] ring-1 ring-[#8f5d48]" : "border-[#d9cec5]"
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
                <span className="absolute left-1.5 top-1.5 z-10 bg-[#8f5d48] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white shadow">
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
                    className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[10px] font-semibold uppercase text-[#211b18] hover:bg-[#8f5d48] hover:text-white transition-colors"
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
                  className="inline-flex items-center gap-1 rounded bg-rose-600 px-2 py-1 text-[10px] font-semibold uppercase text-white hover:bg-rose-700 transition-colors"
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
          <span>No images uploaded yet. At least one image is recommended.</span>
        </div>
      )}
    </div>
  );
}
