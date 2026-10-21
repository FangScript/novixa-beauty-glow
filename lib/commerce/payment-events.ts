import { moneyInPence } from "./pricing";

/** Refund resources may identify their capture through the authenticated event's 'up' link. */
export function eventCaptureId(type: string, resource: Record<string, any>): string | null {
  const related = resource.supplementary_data?.related_ids?.capture_id;
  if (typeof related === "string" && /^[A-Z0-9]{10,32}$/.test(related)) return related;
  if (!["PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED"].includes(type))
    return typeof resource.id === "string" && /^[A-Z0-9]{10,32}$/.test(resource.id)
      ? resource.id
      : null;
  for (const link of Array.isArray(resource.links) ? resource.links : []) {
    if (link?.rel !== "up" || typeof link.href !== "string") continue;
    try {
      const url = new URL(link.href);
      const match = url.pathname.match(/^\/v2\/payments\/captures\/([A-Z0-9]{10,32})$/);
      if (
        url.protocol === "https:" &&
        [
          "api.paypal.com",
          "api-m.paypal.com",
          "api.sandbox.paypal.com",
          "api-m.sandbox.paypal.com",
        ].includes(url.hostname) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        (!url.port || url.port === "443") &&
        match
      )
        return match[1];
    } catch {
      /* Invalid links are not capture references. */
    }
  }
  return type === "PAYMENT.CAPTURE.REVERSED" &&
    typeof resource.id === "string" &&
    /^[A-Z0-9]{10,32}$/.test(resource.id)
    ? resource.id
    : null;
}

export function paymentEventDecision(
  type: string,
  current: { paymentStatus: string; status: string; total: unknown },
  amount?: { value?: string; currency_code?: string },
) {
  if (type === "PAYMENT.CAPTURE.COMPLETED") {
    if (["REFUNDED", "CANCELLED"].includes(current.paymentStatus))
      return { action: "ignore" as const };
    if (
      !amount ||
      amount.currency_code !== "GBP" ||
      moneyInPence(amount.value) !== moneyInPence(current.total)
    )
      throw new Error("Webhook payment amount/currency mismatch.");
    return {
      action: "update" as const,
      paymentStatus: "PAID" as const,
      status: current.status === "PENDING" ? ("CONFIRMED" as const) : current.status,
    };
  }
  if (type === "PAYMENT.CAPTURE.DENIED")
    return ["PAID", "REFUNDED", "CANCELLED"].includes(current.paymentStatus)
      ? { action: "ignore" as const }
      : { action: "update" as const, paymentStatus: "FAILED" as const, status: current.status };
  if (type === "PAYMENT.CAPTURE.REFUNDED") {
    if (!amount || amount.currency_code !== "GBP")
      throw new Error("Webhook refund currency mismatch.");
    const refunded = moneyInPence(amount.value),
      total = moneyInPence(current.total);
    if (refunded < 1 || refunded > total) throw new Error("Webhook refund amount mismatch.");
    if (current.paymentStatus === "REFUNDED") return { action: "ignore" as const };
    if (refunded < total) return { action: "partial-refund" as const };
    return {
      action: "update" as const,
      paymentStatus: "REFUNDED" as const,
      status: "REFUNDED" as const,
    };
  }
  if (type === "PAYMENT.CAPTURE.REVERSED" && current.paymentStatus === "REFUNDED")
    return { action: "ignore" as const };
  if (type === "PAYMENT.CAPTURE.REVERSED")
    return {
      action: "update" as const,
      paymentStatus: "CANCELLED" as const,
      status: current.status,
    };
  return { action: "ignore" as const };
}

export function shouldRestock(previous: string, next: string) {
  // Financial refunds alone do not prove that shipped goods were physically returned.
  return (
    ["PENDING", "CONFIRMED", "PROCESSING", "RETURNED"].includes(previous) &&
    ["CANCELLED", "REFUNDED"].includes(next)
  );
}
