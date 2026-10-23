import { getPreparedOrder, reservePreparedOrder, finishPreparedOrder } from "./prepared-order";
import { moneyInPence } from "../commerce/pricing";
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
  const draft = await getPreparedOrder(orderId);
  if (
    moneyInPence(draft.total) !== intent.totalPence ||
    JSON.parse(draft.payment!.rawStatus || "{}").cartHash !== intent.cartHash
  )
    throw new ApiError("Checkout does not match the saved order.", 409);
  if (draft.paymentStatus === "PAID")
    return {
      ok: true,
      status: "COMPLETED",
      captureId: draft.payment!.providerPaymentId,
      paypalOrderId: orderId,
    };
  const { order, capture } = await settleProviderOrder(orderId, intent.totalPence, {
    beforeCapture: () => reservePreparedOrder(orderId),
    getOrder: getPayPalOrderDetails,
    captureOrder: capturePayPalOrder,
    pause: () => new Promise((resolve) => setTimeout(resolve, 600)),
  });
  await finishPreparedOrder(orderId, order);
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
