import { assertProviderAmount } from "./checkout-intent";

export interface CaptureProvider {
  getOrder(id: string): Promise<any>;
  captureOrder(id: string): Promise<any>;
  pause(): Promise<void>;
  beforeCapture?(): Promise<void>;
}
export async function settleProviderOrder(
  id: string,
  totalPence: number,
  provider: CaptureProvider,
) {
  let order = await provider.getOrder(id);
  for (
    let attempt = 0;
    attempt < 4 && !["APPROVED", "COMPLETED"].includes(order.status);
    attempt++
  ) {
    await provider.pause();
    order = await provider.getOrder(id);
  }
  if (order.status !== "COMPLETED") {
    if (order.status !== "APPROVED") throw new Error("Payment approval is incomplete.");
    assertProviderAmount(order, totalPence);
    await provider.beforeCapture?.();
    try {
      order = await provider.captureOrder(id);
    } catch {
      // A lost response may still mean capture succeeded. Read state before retrying.
      order = await provider.getOrder(id);
    }
  }
  const capture = assertProviderAmount(order, totalPence, true);
  return { order, capture };
}
