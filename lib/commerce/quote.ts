import { BUNDLE_PREFIX, expandBundles } from "./bundles";
import { prisma } from "@/lib/db/client";
import { CommerceError, normalizeCart, priceCart } from "./pricing";

/** All payment creation and order finalization use this one authoritative quote. */
export async function getCheckoutQuote(input: {
  items?: unknown;
  couponCode?: unknown;
  shippingMethodId?: unknown;
}) {
  const requestedItems = normalizeCart(input.items);
  const bundleIds = requestedItems
    .filter((i) => i.productId.startsWith(BUNDLE_PREFIX))
    .map((i) => i.productId.slice(BUNDLE_PREFIX.length));
  const bundles = bundleIds.length
    ? await prisma.bundle.findMany({
        where: { id: { in: bundleIds } },
        include: {
          items: {
            include: {
              product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
            },
          },
        },
      })
    : [];
  const expanded = expandBundles(requestedItems, bundles);
  const items = expanded.items;
  if (
    input.couponCode !== undefined &&
    (typeof input.couponCode !== "string" || input.couponCode.length > 64)
  )
    throw new CommerceError("Invalid coupon code.");
  if (
    input.shippingMethodId !== undefined &&
    (typeof input.shippingMethodId !== "string" || input.shippingMethodId.length > 128)
  )
    throw new CommerceError("Invalid delivery method.");
  const code = typeof input.couponCode === "string" ? input.couponCode.trim().toUpperCase() : "";
  const methodId = typeof input.shippingMethodId === "string" ? input.shippingMethodId : "";
  const [products, coupon, method] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: items.map((line) => line.productId) }, status: "ACTIVE" },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    }),
    code ? prisma.coupon.findUnique({ where: { code } }) : null,
    methodId
      ? prisma.shippingMethod.findUnique({ where: { id: methodId } })
      : prisma.shippingMethod.findFirst({ where: { active: true, isDefault: true } }),
  ]);
  if (code && !coupon) throw new CommerceError("Coupon not found.");
  if (methodId && !method) throw new CommerceError("Delivery method not found.");
  const productMap = new Map(products.map((p) => [p.id, p]));
  const pricedBundles = expandBundles(
    requestedItems,
    bundles.map((bundle) => ({
      ...bundle,
      items: bundle.items.map((item) => ({
        ...item,
        product: productMap.get(item.productId) || item.product,
      })),
    })),
  );
  const quote = priceCart(
    items,
    products,
    coupon,
    method || { name: "Normal Delivery", price: 4.95, active: true },
    Date.now(),
    pricedBundles.adjustmentPence,
  );
  const cartItems = requestedItems.map((line) => {
    if (line.productId.startsWith(BUNDLE_PREFIX))
      return pricedBundles.snapshots.find((i) => i.productId === line.productId)!;
    const p = productMap.get(line.productId)!;
    return {
      ...line,
      product: {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        salePrice: p.salePrice === null ? null : Number(p.salePrice),
        stock: p.stock,
        sku: p.sku,
        image: p.images[0]?.url || "/images/product-perfume.jpg",
      },
    };
  });
  return { ...quote, cartItems };
}
