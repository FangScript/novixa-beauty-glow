"use client";

import { useState } from "react";
import {
  Check,
  Truck,
  Package,
  MapPin,
  Copy,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { formatPrice } from "@/lib/products/catalogue";
import { Button } from "@/components/ui/button";

export type OrderData = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  total: number;
  subtotal: number;
  discount?: number;
  shipping?: number;
  createdAt: string;
  trackingNumber?: string | null;
  shippingAddressSnapshot?: any;
  items?: Array<{
    id?: string;
    productName: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    imageUrl?: string | null;
  }>;
};

const STEPS = [
  { label: "Order Placed", desc: "Received in queue" },
  { label: "Confirmed", desc: "Formulation prepared" },
  { label: "Dispatched", desc: "Courier handover" },
  { label: "Out for Delivery", desc: "With local agent" },
  { label: "Delivered", desc: "Safely received" },
];

function getStepIndex(
  status: string,
  hasTracking: boolean,
): { index: number; isCancelled: boolean } {
  const upper = (status || "").toUpperCase();
  if (upper === "CANCELLED" || upper === "REFUNDED" || upper === "RETURNED") {
    return { index: -1, isCancelled: true };
  }
  if (upper === "DELIVERED") return { index: 4, isCancelled: false };
  if (upper === "SHIPPED") {
    return { index: hasTracking ? 3 : 2, isCancelled: false };
  }
  if (upper === "PROCESSING" || upper === "CONFIRMED") {
    return { index: 1, isCancelled: false };
  }
  return { index: 0, isCancelled: false }; // PENDING
}

export function OrderTracker({ order }: { order: OrderData }) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const hasTracking = Boolean(order.trackingNumber && order.trackingNumber.trim());
  const { index: currentStepIndex, isCancelled } = getStepIndex(order.status, hasTracking);

  const copyTracking = () => {
    if (!order.trackingNumber) return;
    navigator.clipboard.writeText(order.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const addr = order.shippingAddressSnapshot || {};
  const items = order.items || [];
  const discount = order.discount || 0;
  const shipping = order.shipping ?? 0;

  // Percentage for the horizontal progress bar (0% to 100%)
  const progressPercent = isCancelled
    ? 0
    : Math.max(0, Math.min(100, (currentStepIndex / (STEPS.length - 1)) * 100));

  return (
    <article className="border border-border bg-white/70 p-6 sm:p-8 shadow-xs transition-all hover:bg-white/85">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-bold tracking-wider text-foreground">
              {order.orderNumber}
            </span>
            <span
              className={`px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                isCancelled
                  ? "bg-[#fbf0ec] text-[#8f2d18]"
                  : currentStepIndex === 4
                    ? "bg-emerald-100 text-emerald-800"
                    : currentStepIndex >= 2
                      ? "bg-sky-100 text-sky-800"
                      : "bg-[#f4ede6] text-[#8f5d48]"
              }`}
            >
              {order.status}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Ordered on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <div className="text-right">
          <p className="text-base font-semibold text-foreground">{formatPrice(order.total)}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {order.paymentStatus === "PAID" ? "Paid Online" : "Cash on Delivery"}
          </p>
        </div>
      </div>

      {/* Visual Status Stepper */}
      <div className="py-7">
        {isCancelled ? (
          <div className="flex items-center gap-3 border border-[#c9765d] bg-[#fbf0ec] p-4 text-xs text-[#8f2d18]">
            <AlertCircle size={18} className="shrink-0" />
            <div>
              <p className="font-semibold">Order Cancelled</p>
              <p className="mt-0.5 text-[11px] text-[#8f2d18]/80">
                This order was cancelled. Any pre-authorized charges will be refunded to your source
                account.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Background Line */}
            <div className="absolute left-0 top-4 h-0.5 w-full bg-border/60" />
            {/* Active Progress Line */}
            <div
              className="absolute left-0 top-4 h-0.5 bg-rosewood transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />

            {/* Step Nodes */}
            <div className="relative flex justify-between">
              {STEPS.map((step, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                return (
                  <div key={step.label} className="flex flex-col items-center text-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                        isCompleted
                          ? "border-rosewood bg-rosewood text-white"
                          : isCurrent
                            ? "border-rosewood bg-white text-rosewood ring-4 ring-rosewood/15"
                            : "border-border bg-white text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? (
                        <Check size={13} strokeWidth={2.5} />
                      ) : (
                        <span className="text-[11px] font-semibold">{idx + 1}</span>
                      )}
                    </div>

                    <div className="mt-2.5 max-w-[80px] sm:max-w-[100px]">
                      <p
                        className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${
                          isCurrent
                            ? "text-rosewood"
                            : isCompleted
                              ? "text-foreground"
                              : "text-muted-foreground/60"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="hidden sm:block text-[9px] text-muted-foreground mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Logistics & Tracking Number Card */}
      <div className="mt-2 border border-border/80 bg-[#fbf9f6] p-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rosewood/10 text-rosewood">
              <Truck size={15} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                Courier Tracking
              </p>
              {hasTracking ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-sm font-bold text-foreground">
                    {order.trackingNumber}
                  </span>
                  <button
                    type="button"
                    onClick={copyTracking}
                    className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[10px] font-medium text-rosewood border border-border/80 hover:border-rosewood transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check size={11} className="text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-foreground font-medium mt-0.5">
                  Awaiting dispatch & logistics scan
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-right text-xs">
            <span className="text-muted-foreground hidden md:inline">Destination:</span>
            <span className="font-medium text-foreground">
              {addr.city ? `${addr.city}, ${addr.state}` : "Standard Shipping"}
            </span>
          </div>
        </div>
      </div>

      {/* Item summary & Toggle Breakdown */}
      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2 overflow-hidden">
              {items.slice(0, 3).map((item, idx) => (
                <img
                  key={idx}
                  src={item.imageUrl || "/images/product-perfume.jpg"}
                  alt=""
                  className="inline-block h-9 w-9 rounded-full border-2 border-white object-cover bg-blush/20"
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"} in package
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs font-semibold uppercase tracking-wider text-rosewood hover:underline"
          >
            {showDetails ? "Hide Details" : "View Details"}
          </button>
        </div>

        {/* Expandable Order Breakdown */}
        {showDetails && (
          <div className="mt-5 space-y-4 border-t border-dashed border-border pt-4 animate-in fade-in duration-200">
            {/* Products List */}
            <div className="divide-y divide-border/60">
              {items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.imageUrl || "/images/product-perfume.jpg"}
                      alt=""
                      className="h-10 w-10 object-cover border border-border bg-blush/20"
                    />
                    <div>
                      <p className="font-medium text-foreground">{item.productName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Quantity: {item.quantity} · {formatPrice(item.unitPrice)} each
                      </p>
                    </div>
                  </div>
                  <span className="font-medium text-foreground">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="border-t border-border/80 pt-3 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#4b6742] font-medium">
                  <span>Discount</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{shipping === 0 ? "Complimentary" : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold text-foreground">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>

            {/* Shipping Details */}
            {addr.line1 && (
              <div className="border-t border-border/80 pt-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                  Delivered to:
                </span>
                <p className="mt-1 text-foreground">
                  {addr.fullName || "Customer"} · {addr.phone || ""}
                </p>
                <p className="mt-0.5">
                  {addr.line1}
                  {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} -{" "}
                  {addr.postalCode}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
