export class CommerceError extends Error {
  readonly status = 400;
}
export type CartLine = { productId: string; quantity: number };
export interface PricedProduct {
  id: string;
  name: string;
  sku: string;
  status: string;
  price: unknown;
  salePrice?: unknown;
  stock: number;
  isMeasured: boolean;
  images?: Array<{ url: string }>;
}
export interface PricedCoupon {
  id: string;
  type: string;
  value: unknown;
  minimumOrder: unknown;
  active: boolean;
  usageLimit: number | null;
  usageCount: number;
  startsAt?: Date | null;
  expiresAt?: Date | null;
}
export interface PricedShipping {
  id?: string;
  name: string;
  price: unknown;
  active: boolean;
}

export function moneyInPence(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 99999999)
    throw new CommerceError("Invalid monetary amount.");
  return Math.round(number * 100);
}

export function normalizeCart(input: unknown): CartLine[] {
  if (!Array.isArray(input) || !input.length || input.length > 100)
    throw new CommerceError("Cart must contain between 1 and 100 items.");
  const combined = new Map<string, number>();
  for (const line of input) {
    if (
      !line ||
      typeof line.productId !== "string" ||
      !line.productId.trim() ||
      line.productId.length > 128 ||
      typeof line.quantity !== "number" ||
      !Number.isFinite(line.quantity) ||
      line.quantity <= 0 ||
      line.quantity > 99 ||
      Math.abs(line.quantity * 100 - Math.round(line.quantity * 100)) > 0.00001
    ) {
      throw new CommerceError(
        "Cart items must have a product ID and a valid positive quantity (up to 99, at most two decimal places).",
      );
    }
    const quantity = Math.round(((combined.get(line.productId) || 0) + line.quantity) * 100) / 100;
    if (quantity > 99) throw new CommerceError("Combined product quantity exceeds 99.");
    combined.set(line.productId, quantity);
  }
  return [...combined].map(([productId, quantity]) => ({ productId, quantity }));
}

export function priceCart(
  items: CartLine[],
  products: PricedProduct[],
  coupon: PricedCoupon | null,
  method: PricedShipping,
  now = Date.now(),
  bundleAdjustmentPence = 0,
) {
  const productMap = new Map(products.map((product) => [product.id, product]));
  let subtotalPence = 0;
  const lineItems = items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product || product.status !== "ACTIVE")
      throw new CommerceError("A product is no longer available.");
    if (!product.isMeasured && !Number.isInteger(item.quantity))
      throw new CommerceError("This product requires a whole-number quantity.");
    if (product.stock < item.quantity)
      throw new CommerceError("Insufficient stock for " + product.name + ".");
    const unitPricePence = moneyInPence(product.salePrice ?? product.price);
    subtotalPence += Math.round(unitPricePence * item.quantity);
    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      unitPrice: unitPricePence / 100,
      quantity: item.quantity,
      imageUrl: product.images?.[0]?.url || null,
    };
  });
  if (!Number.isSafeInteger(bundleAdjustmentPence))
    throw new CommerceError("Invalid bundle pricing.");
  const merchandisePence = subtotalPence - bundleAdjustmentPence;
  if (merchandisePence < 0) throw new CommerceError("Invalid bundle total.");
  let discountPence = 0;
  if (coupon) {
    if (
      !coupon.active ||
      (coupon.startsAt && coupon.startsAt.getTime() > now) ||
      (coupon.expiresAt && coupon.expiresAt.getTime() <= now) ||
      (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) ||
      merchandisePence < moneyInPence(coupon.minimumOrder)
    )
      throw new CommerceError("This coupon is not currently available for this order.");
    const value = Number(coupon.value);
    if (!Number.isFinite(value) || value < 0 || (coupon.type === "PERCENTAGE" && value > 100))
      throw new CommerceError("Invalid coupon configuration.");
    discountPence = Math.min(
      merchandisePence,
      coupon.type === "PERCENTAGE"
        ? Math.round((merchandisePence * value) / 100)
        : moneyInPence(value),
    );
  }
  if (!method.active) throw new CommerceError("The delivery method is no longer available.");
  const freeStandard = merchandisePence >= 7000 && /normal|standard/i.test(method.name);
  const shippingPence = freeStandard ? 0 : moneyInPence(method.price);
  const totalPence = merchandisePence - discountPence + shippingPence;
  if (!Number.isSafeInteger(totalPence) || totalPence < 1)
    throw new CommerceError("The checkout total must be at least one penny.");
  return {
    items,
    lineItems,
    subtotal: subtotalPence / 100,
    discount: (discountPence + bundleAdjustmentPence) / 100,
    bundleAdjustment: bundleAdjustmentPence / 100,
    merchandiseSubtotal: merchandisePence / 100,
    couponDiscount: discountPence / 100,
    shipping: shippingPence / 100,
    tax: 0,
    total: totalPence / 100,
    totalPence,
    couponId: coupon?.id || null,
    couponUsageLimit: coupon?.usageLimit ?? null,
    shippingMethodId: method.id || null,
    shippingMethodName: method.name,
  };
}
