import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AdminShell,
  AdminStatus,
  AdminTable,
  MetricCard,
  TableCell,
  TableHeader,
} from "@/components/admin";
import { listAdminReviews, moderateAdminReview } from "@/lib/admin-service";
export const Route = createFileRoute("/admin/reviews")({ component: AdminReviews });
type Review = {
  id: string;
  product: string;
  customer: string;
  rating: number;
  review: string;
  verified: boolean;
  status: "Approved" | "Pending" | "Rejected";
};
function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const list = useServerFn(listAdminReviews);
  const moderate = useServerFn(moderateAdminReview);
  useEffect(() => {
    list().then(setReviews);
  }, [list]);
  const update = async (id: string, status: "APPROVED" | "REJECTED") => {
    const result = await moderate({ data: { id, status } });
    setReviews((current) =>
      current.map((review) =>
        review.id === id
          ? { ...review, status: result.status === "APPROVED" ? "Approved" : "Rejected" }
          : review,
      ),
    );
  };
  const pending = reviews.filter((review) => review.status === "Pending").length;
  const average = reviews.length
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : "—";
  return (
    <AdminShell
      title="Reviews"
      description="Moderate persistent customer feedback and verified-purchase signals."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Average rating" value={average} detail="Database reviews" />
        <MetricCard
          label="Pending review"
          value={String(pending)}
          detail="Needs moderation"
          tone="dark"
        />
        <MetricCard
          label="Verified reviews"
          value={
            reviews.length
              ? `${Math.round((reviews.filter((r) => r.verified).length / reviews.length) * 100)}%`
              : "—"
          }
          detail="Of loaded reviews"
        />
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
                      onClick={() => update(review.id, "APPROVED")}
                      className="text-[#567149] underline"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => update(review.id, "REJECTED")}
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
