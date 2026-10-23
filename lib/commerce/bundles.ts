import {
  CommerceError,
  moneyInPence,
  normalizeCart,
  type CartLine,
  type PricedProduct,
} from "./pricing";

export const BUNDLE_PREFIX = "bundle:";
export interface CheckoutBundle {
  id: string;
  name: string;
  slug: string;
  status: string;
  price: unknown;
  items: Array<{ productId: string; quantity: number; product: PricedProduct }>;
}

/** Expand database-owned bundles, ignoring all browser-supplied prices. */
export function expandBundles(lines: CartLine[], bundles: CheckoutBundle[]) {
  const expanded: CartLine[] = [];
  const snapshots = [];
  let adjustmentPence = 0;
  for (const line of lines) {
    if (!line.productId.startsWith(BUNDLE_PREFIX)) {
      expanded.push(line);
      continue;
    }
    const bundle = bundles.find((b) => BUNDLE_PREFIX + b.id === line.productId);
    if (!bundle || bundle.status !== "ACTIVE" || !bundle.items.length)
      throw new CommerceError("This bundle is no longer available.");
    if (!Number.isInteger(line.quantity))
      throw new CommerceError("Bundles require whole-number quantities.");
    let componentPence = 0;
    let stock = 99;
    for (const component of bundle.items) {
      if (!Number.isFinite(component.quantity) || component.quantity <= 0)
        throw new CommerceError("Invalid bundle configuration.");
      componentPence += Math.round(
        moneyInPence(component.product.salePrice ?? component.product.price) *
          component.quantity *
          line.quantity,
      );
      stock = Math.min(stock, Math.floor(component.product.stock / component.quantity));
      expanded.push({
        productId: component.productId,
        quantity: component.quantity * line.quantity,
      });
    }
    const price = moneyInPence(bundle.price) / 100;
    adjustmentPence += componentPence - moneyInPence(price) * line.quantity;
    snapshots.push({
      productId: line.productId,
      quantity: line.quantity,
      product: {
        id: line.productId,
        name: bundle.name,
        slug: "",
        price,
        salePrice: null,
        stock,
        sku: bundle.id,
        image: bundle.items[0].product.images?.[0]?.url || "/images/product-perfume.jpg",
      },
    });
  }
  const items = normalizeCart(expanded);
  // Component demand is aggregated for stock. Reconcile per-line rounding so
  // fractional components shared across bundles still charge the exact set price.
  const componentProducts = new Map(
    bundles.flatMap((bundle) =>
      bundle.items.map((item) => [item.productId, item.product] as const),
    ),
  );
  for (const line of items) {
    const product = componentProducts.get(line.productId);
    if (!product) continue;
    const unit = moneyInPence(product.salePrice ?? product.price);
    const separatelyRounded = expanded
      .filter((item) => item.productId === line.productId)
      .reduce((sum, item) => sum + Math.round(unit * item.quantity), 0);
    adjustmentPence += Math.round(unit * line.quantity) - separatelyRounded;
  }
  return { items, adjustmentPence, snapshots };
}
