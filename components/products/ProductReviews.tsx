"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquarePlus,
  ThumbsUp,
  Camera,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomerAuth } from "@/lib/auth/customer-context";

export type ReviewItem = {
  id: string;
  productId?: string;
  product?: string;
  customer: string;
  rating: number;
  title?: string | null;
  review: string;
  verified: boolean;
  status: string;
  images?: string[];
  createdAt: string;
};

interface ProductReviewsProps {
  productId: string;
  productSlug?: string;
  productName: string;
}

export function ProductReviews({ productId, productSlug, productName }: ProductReviewsProps) {
  const { user } = useCustomerAuth();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterRating, setFilterRating] = useState<number | 0>(0);
  const [sortBy, setSortBy] = useState<"recent" | "highest">("recent");

  // Review Form state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState(user?.name || "");
  const [authorEmail, setAuthorEmail] = useState(user?.email || "");
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Sync auth state into form
  useEffect(() => {
    if (user) {
      if (!authorName) setAuthorName(user.name || "");
      if (!authorEmail) setAuthorEmail(user.email || "");
    }
  }, [user]);

  // Fetch reviews for this product
  useEffect(() => {
    setIsLoading(true);
    const identifier = productSlug || productId;
    fetch(`/api/reviews?productId=${encodeURIComponent(identifier)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.reviews && Array.isArray(data.reviews)) {
          setReviews(data.reviews);
        }
      })
      .catch((err) => console.warn("Failed to load product reviews:", err))
      .finally(() => setIsLoading(false));
  }, [productId, productSlug]);

  const ratingCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const rounded = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      counts[rounded] = (counts[rounded] || 0) + 1;
    });
    return counts;
  }, [reviews]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return "5.0";
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    let result = [...reviews];
    if (filterRating > 0) {
      result = result.filter((r) => Math.round(r.rating) === filterRating);
    }
    if (sortBy === "highest") {
      result.sort((a, b) => b.rating - a.rating);
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return result;
  }, [reviews, filterRating, sortBy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus(null);

    if (!rating) {
      setFormStatus({ type: "error", message: "Please select a star rating." });
      return;
    }
    if (!body.trim()) {
      setFormStatus({ type: "error", message: "Please write your review feedback." });
      return;
    }
    if (!user && !authorEmail.trim()) {
      setFormStatus({ type: "error", message: "Please provide an email address." });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: productSlug || productId,
          userId: user?.id,
          rating,
          title: title.trim(),
          body: body.trim(),
          images: reviewImages,
          authorName: authorName.trim() || user?.name || "Customer",
          authorEmail: authorEmail.trim() || user?.email,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit review.");
      }

      setFormStatus({
        type: "success",
        message: "Thank you! Your review has been submitted for moderation.",
      });

      // Clear form
      setTitle("");
      setBody("");
      setReviewImages([]);
      // Keep form open for a moment with confirmation
      setTimeout(() => {
        setShowForm(false);
        setFormStatus(null);
      }, 3500);
    } catch (err: any) {
      setFormStatus({
        type: "error",
        message: err.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (reviewImages.length + files.length > 4) {
      setFormStatus({
        type: "error",
        message: "You can upload up to 4 photos per review.",
      });
      return;
    }

    setIsUploadingImages(true);
    setFormStatus(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("file", f));

      const res = await fetch("/api/reviews/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload photo(s).");
      }

      setReviewImages((prev) => [...prev, ...data.urls].slice(0, 4));
    } catch (err: any) {
      setFormStatus({
        type: "error",
        message: err.message || "Failed to upload images.",
      });
    } finally {
      setIsUploadingImages(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setReviewImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const getRatingDescriptor = (val: number) => {
    switch (val) {
      case 5:
        return "Exceptional";
      case 4:
        return "Very Good";
      case 3:
        return "Good";
      case 2:
        return "Fair";
      case 1:
        return "Disappointing";
      default:
        return "";
    }
  };

  return (
    <section className="mt-20 border-t border-border pt-14">
      {/* Header & Write Review Action */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-rosewood">
            Patron Feedback
          </p>
          <h2 className="mt-1 font-display text-3xl md:text-4xl text-foreground">
            Customer Reviews
          </h2>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="rounded-none bg-ink text-white hover:bg-black text-[10px] font-semibold tracking-[0.14em] uppercase self-start sm:self-auto"
        >
          <MessageSquarePlus size={14} className="mr-2" />
          {showForm ? "Close Form" : "Write a Review"}
        </Button>
      </div>

      {/* Breakdown and Aggregate Score */}
      <div className="mt-8 grid gap-8 border-y border-border py-8 lg:grid-cols-12">
        {/* Overall Rating Score */}
        <div className="flex flex-col justify-center border-b border-border pb-6 lg:col-span-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-5xl md:text-6xl text-foreground">
              {averageRating}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-widest">
              out of 5.0
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-champagne">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                fill={star <= Math.round(Number(averageRating)) ? "currentColor" : "none"}
                className={star <= Math.round(Number(averageRating)) ? "" : "text-border"}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Based on {reviews.length} authenticated patron{" "}
            {reviews.length === 1 ? "review" : "reviews"}
          </p>
        </div>

        {/* Rating Breakdown Bars */}
        <div className="flex flex-col justify-center space-y-2 lg:col-span-8 lg:pl-4">
          {[5, 4, 3, 2, 1].map((starVal) => {
            const count = ratingCounts[starVal as 1 | 2 | 3 | 4 | 5] || 0;
            const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            return (
              <button
                key={starVal}
                type="button"
                onClick={() => setFilterRating(filterRating === starVal ? 0 : starVal)}
                className={`group flex items-center gap-3 text-xs transition-colors hover:text-foreground text-left ${
                  filterRating === starVal
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <span className="w-12 text-right">{starVal} stars</span>
                <div className="h-2 flex-1 overflow-hidden bg-border/40">
                  <div
                    className="h-full bg-rosewood transition-all duration-300 group-hover:bg-ink"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[11px] text-muted-foreground">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Review Submission Form Drawer / Panel */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="my-8 border border-border bg-blush/10 p-6 md:p-8 transition-all"
        >
          <div className="mb-6 border-b border-border pb-4">
            <h3 className="font-display text-2xl text-foreground">Share Your Experience</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Reviewing: <span className="font-semibold text-foreground">{productName}</span>
            </p>
          </div>

          <div className="space-y-5">
            {/* Star Rating Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                Overall Rating *
              </label>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 text-champagne focus:outline-none transition-transform hover:scale-110"
                      aria-label={`Rate ${star} star`}
                    >
                      <Star
                        size={22}
                        fill={(hoverRating || rating) >= star ? "currentColor" : "none"}
                        className={(hoverRating || rating) >= star ? "" : "text-border"}
                      />
                    </button>
                  ))}
                </div>
                <span className="ml-2 text-xs font-medium text-muted-foreground">
                  {getRatingDescriptor(hoverRating || rating)}
                </span>
              </div>
            </div>

            {/* Review Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                Headline / Title
              </label>
              <input
                type="text"
                placeholder="e.g. Sublime fragrance, unforgettable dry down"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 h-11 w-full border border-border bg-white/60 px-3 text-sm outline-none focus:border-rosewood transition-colors"
              />
            </div>

            {/* Review Body */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                Your Review *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Tell other patrons what you loved about this formulation, longevity, notes, and texture..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-2 w-full border border-border bg-white/60 p-3 text-sm outline-none focus:border-rosewood transition-colors"
              />
            </div>

            {/* Customer Review Photos Upload */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                  Product Photos (Optional)
                </label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {reviewImages.length}/4 photos
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Attach real customer photos (e.g., packaging, bottle, texture, application). Up to 4 photos (JPG, PNG, WebP, max 5MB each).
              </p>

              {/* Upload trigger & Previews grid */}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {reviewImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="group relative h-20 w-20 overflow-hidden rounded border border-border bg-sand/30 shadow-sm"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={`Review photo ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/80 text-white opacity-90 hover:bg-black hover:opacity-100 transition-opacity"
                      aria-label="Remove photo"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {reviewImages.length < 4 && (
                  <label
                    className={`flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-border bg-white/60 text-muted-foreground transition-all hover:border-rosewood hover:text-foreground ${
                      isUploadingImages ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      multiple
                      onChange={handleImageUpload}
                      disabled={isUploadingImages}
                      className="hidden"
                    />
                    {isUploadingImages ? (
                      <Loader2 size={18} className="animate-spin text-rosewood" />
                    ) : (
                      <>
                        <Camera size={20} className="mb-1 text-rosewood/80" />
                        <span className="text-[9px] font-semibold tracking-wider uppercase">Add Photo</span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>

            {/* Author Name and Email */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Elena Rostova"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="mt-2 h-11 w-full border border-border bg-white/60 px-3 text-sm outline-none focus:border-rosewood transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                  Your Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. elena@example.com"
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  className="mt-2 h-11 w-full border border-border bg-white/60 px-3 text-sm outline-none focus:border-rosewood transition-colors"
                />
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  Used to verify purchase; never displayed publicly.
                </span>
              </div>
            </div>

            {/* Status alerts */}
            {formStatus && (
              <div
                className={`flex items-start gap-2 border px-4 py-3 text-xs ${
                  formStatus.type === "success"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-[#c9765d] bg-[#fbf0ec] text-[#8f2d18]"
                }`}
              >
                {formStatus.type === "success" ? (
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                )}
                <span>{formStatus.message}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-none bg-ink text-white hover:bg-black px-7 text-[10px] font-semibold tracking-[0.14em] uppercase"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" /> Submitting…
                  </span>
                ) : (
                  "Submit Review"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                className="rounded-none text-[10px] font-semibold tracking-[0.14em] uppercase"
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Filters and Controls */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground uppercase tracking-wider text-[10px]">
            Filter:
          </span>
          <button
            type="button"
            onClick={() => setFilterRating(0)}
            className={`px-2.5 py-1 text-xs transition-colors ${
              filterRating === 0
                ? "bg-ink text-white font-medium"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({reviews.length})
          </button>
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterRating(s)}
              className={`px-2.5 py-1 text-xs transition-colors ${
                filterRating === s
                  ? "bg-ink text-white font-medium"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}★ ({ratingCounts[s as 1 | 2 | 3 | 4 | 5] || 0})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "recent" | "highest")}
            className="border border-border bg-white px-2 py-1 text-xs text-foreground outline-none focus:border-rosewood"
          >
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rating</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="mt-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-xs text-muted-foreground">
            <Loader2 size={16} className="mr-2 animate-spin text-rosewood" />
            Loading patron testimonials…
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="border border-border bg-blush/10 py-12 text-center">
            <p className="font-display text-2xl text-foreground">No Reviews Found</p>
            <p className="mt-2 text-xs text-muted-foreground max-w-sm mx-auto">
              {filterRating > 0
                ? `There are currently no ${filterRating}-star reviews for this product.`
                : "Be the first to share your thoughts on this luxury formulation."}
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="mt-5 rounded-none bg-ink text-white hover:bg-black text-[10px] font-semibold tracking-[0.14em] uppercase"
            >
              Write First Review
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredReviews.map((rev) => (
              <article key={rev.id} className="py-8 first:pt-4 last:pb-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sand text-xs font-semibold uppercase tracking-wider text-rosewood">
                      {rev.customer.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{rev.customer}</p>
                      {rev.verified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                          <CheckCircle2 size={11} /> Verified Buyer
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-0.5 text-champagne">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={12}
                          fill={star <= rev.rating ? "currentColor" : "none"}
                          className={star <= rev.rating ? "" : "text-border"}
                        />
                      ))}
                    </div>
                    <time dateTime={rev.createdAt}>
                      {new Date(rev.createdAt).toLocaleDateString("en-GB", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                </div>

                {rev.title && (
                  <h4 className="mt-4 text-sm font-semibold text-foreground">{rev.title}</h4>
                )}
                <p className="mt-2 text-sm leading-relaxed text-[#52443c]">{rev.review}</p>

                {/* Review Photos Gallery */}
                {rev.images && rev.images.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    {rev.images.map((imgUrl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLightboxImage(imgUrl)}
                        className="group relative h-20 w-20 overflow-hidden rounded border border-border bg-sand/20 focus:outline-none transition-transform hover:scale-105 hover:shadow-md"
                        aria-label={`View photo ${i + 1} from ${rev.customer}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt={`Review photo by ${rev.customer}`}
                          className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Photo Lightbox Modal */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-lg bg-black p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/75 text-white hover:bg-black transition-colors"
              aria-label="Close photo preview"
            >
              <X size={18} />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage}
              alt="Enlarged review photo"
              className="max-h-[85vh] w-auto max-w-full rounded object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
