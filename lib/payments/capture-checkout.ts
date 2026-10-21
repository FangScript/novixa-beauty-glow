import { requireCheckoutIntent } from "./checkout-session";
import { settleProviderOrder } from "./capture-provider";
import { capturePayPalOrder, getPayPalOrderDetails } from "./paypal";
import { ApiError } from "../security/api";

/** SDKs approve payments; this service accepts only the resulting provider order reference. */
export async function captureCheckoutPayment(orderId: string) {
  let intent;
  try {
    intent = await requireCheckoutIntent(orderId);
  } catch {
    throw new ApiError("This payment does not belong to the current checkout.", 403);
  }
  const { order, capture } = await settleProviderOrder(orderId, intent.totalPence, {
    getOrder: getPayPalOrderDetails,
    captureOrder: capturePayPalOrder,
    pause: () => new Promise((resolve) => setTimeout(resolve, 600)),
  });
  const payer = order.payer || {};
  return {
    ok: true,
    status: "COMPLETED",
    captureId: capture.id,
    paypalOrderId: orderId,
    payerEmail: payer.email_address,
    payerName: payer.name
      ? `${payer.name.given_name || ""} ${payer.name.surname || ""}`.trim()
      : null,
  };
}
