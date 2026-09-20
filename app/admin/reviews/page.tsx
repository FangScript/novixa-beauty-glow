"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import {
  AdminShell,
  AdminStatus,
  AdminTable,
  MetricCard,
  TableCell,
  TableHeader,
} from "@/components/admin";

type Review = {
  id: string;
  product: string;
  customer: string;
  rating: number;
  review: string;
  verified: boolean;
  status: "Approved" | "Pending" | "Rejected";
};

const initialReviews: Review[] = [
  {
    id: "rev-1",
    product: "Velvet Rose Eau de Parfum",
    customer: "Ayesha Khan",
    rating: 5,
    review: "The longevity on this fragrance is unbelievable. Subtle rose and warm amber.",
    verified: true,
    status: "Approved",
  },
  {
    id: "rev-2",
    product: "Noir Élan Eau de Parfum",
    customer: "Arjun Mehta",
    rating: 5,
    review: "Complex woody scent. Perfect for evening events. Gets lots of compliments.",
    verified: true,
    status: "Approved",
  },
  {
    id: "rev-3",
    product: "Matte Silk Liquid Lipstick",
    customer: "Mira Shah",
    rating: 4,
    review: "Comfortable formula that does not dry lips. Would love more nude shades!",
    verified: true,
    status: "Pending",
  },
];

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);

  const update = (id: string, status: "Approved" | "Rejected") => {
    setReviews((current) =>
      current.map((r) => (r.id === id ? { ...r, status } : r)),
    );
  };

  const pending = reviews.filter((r) => r.status === "Pending").length;
  const average = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "5.0";

  return (
    <AdminShell
      title="Reviews"
      description="Moderate customer feedback, ratings, and verified-purchase signals."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Average rating" value={average} detail="Across all products" />
        <MetricCard
          label="Pending moderation"
          value={String(pending)}
          detail="Requires administrator approval"
          tone={pending > 0 ? "dark" : "light"}
        />
        <MetricCard
          label="Total reviews"
          value={String(reviews.length)}
          detail="Customer verified testimonials"
        />
      </div>

      <div className="mt-8">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Rating</th>
            <th className="px-4 py-3">Review Feedback</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Moderation</th>
          </TableHeader>
          {reviews.map((rev) => (
            <tr key={rev.id} className="border-b border-[#e7ddd5] last:border-0 hover:bg-black/[0.02]">
              <TableCell className="font-medium text-[#211b18]">{rev.product}</TableCell>
              <TableCell>
                <p>{rev.customer}</p>
                {rev.verified && (
                  <span className="text-[9px] text-[#4b6742] font-semibold">✓ Verified Buyer</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-0.5 text-champagne">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} size={11} fill="currentColor" />
                  ))}
                </div>
              </TableCell>
              <TableCell className="max-w-xs text-xs text-[#52443c] leading-relaxed">
                “{rev.review}”
              </TableCell>
              <TableCell>
                <AdminStatus
                  tone={
                    rev.status === "Approved"
                      ? "positive"
                      : rev.status === "Pending"
                        ? "warning"
                        : "danger"
                  }
                >
                  {rev.status}
                </AdminStatus>
              </TableCell>
              <TableCell className="text-right space-x-2">
                {rev.status !== "Approved" && (
                  <button
                    onClick={() => update(rev.id, "Approved")}
                    className="text-xs text-[#4b6742] underline hover:text-black"
                  >
                    Approve
                  </button>
                )}
                {rev.status !== "Rejected" && (
                  <button
                    onClick={() => update(rev.id, "Rejected")}
                    className="text-xs text-[#8f3f2d] underline hover:text-black"
                  >
                    Reject
                  </button>
                )}
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>
    </AdminShell>
  );
}
