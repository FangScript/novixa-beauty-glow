import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AdminShell,
  AdminStatus,
  AdminTable,
  MetricCard,
  TableCell,
  TableHeader,
} from "@/components/admin";
export const Route = createFileRoute("/admin/reviews")({ component: AdminReviews });
type Review = {
  id: number;
  product: string;
  customer: string;
  rating: number;
  review: string;
  verified: boolean;
  status: "Approved" | "Pending" | "Rejected";
};
function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([
    {
      id: 1,
      product: "Velvet Rose Eau de Parfum",
      customer: "Ayesha K.",
      rating: 5,
      review: "Absolutely love the products!",
      verified: true,
      status: "Approved",
    },
    {
      id: 2,
      product: "Complete Glam Bundle",
      customer: "Mira S.",
      rating: 5,
      review: "Everything I need in one edit.",
      verified: true,
      status: "Approved",
    },
    {
      id: 3,
      product: "Cloud Veil Foundation",
      customer: "Nadia R.",
      rating: 4,
      review: "Beautiful finish and easy to blend.",
      verified: false,
      status: "Pending",
    },
  ]);
  const moderate = (id: number, status: Review["status"]) =>
    setReviews((current) =>
      current.map((review) => (review.id === id ? { ...review, status } : review)),
    );
  const pending = reviews.filter((review) => review.status === "Pending").length;
  return (
    <AdminShell
      title="Reviews"
      description="Moderate customer feedback and protect the integrity of verified-purchase signals."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Average rating" value="4.8" detail="Across approved reviews" />
        <MetricCard
          label="Pending review"
          value={String(pending)}
          detail="Needs moderation"
          tone="dark"
        />
        <MetricCard label="Verified reviews" value="86%" detail="Of approved reviews" />
      </div>
      <div className="mt-8">
        <AdminTable>
          <TableHeader>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Rating</th>
            <th className="px-4 py-3">Review</th>
            <th className="px-4 py-3">Purchase</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </TableHeader>
          {reviews.map((review) => (
            <tr key={review.id} className="border-b border-[#e7ddd5] last:border-0">
              <TableCell>{review.product}</TableCell>
              <TableCell>{review.customer}</TableCell>
              <TableCell className="text-[#a0783d]">{"★".repeat(review.rating)}</TableCell>
              <TableCell>{review.review}</TableCell>
              <TableCell>
                {review.verified ? (
                  <AdminStatus tone="positive">Verified</AdminStatus>
                ) : (
                  <AdminStatus tone="warning">Unverified</AdminStatus>
                )}
              </TableCell>
              <TableCell>
                <AdminStatus
                  tone={
                    review.status === "Approved"
                      ? "positive"
                      : review.status === "Rejected"
                        ? "danger"
                        : "warning"
                  }
                >
                  {review.status}
                </AdminStatus>
              </TableCell>
              <TableCell className="text-right">
                {review.status === "Pending" && (
                  <span className="flex gap-2">
                    <button
                      onClick={() => moderate(review.id, "Approved")}
                      className="text-[#567149] underline"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => moderate(review.id, "Rejected")}
                      className="text-[#a35742] underline"
                    >
                      Reject
                    </button>
                  </span>
                )}
              </TableCell>
            </tr>
          ))}
        </AdminTable>
      </div>
    </AdminShell>
  );
}
