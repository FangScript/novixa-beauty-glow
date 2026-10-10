import { prisma } from "@/lib/db/client";
import {
  products as fallbackProducts,
  registerLiveProducts,
  type Product,
} from "@/lib/products/catalogue";

function isInternalTestProduct(p: any): boolean {
  const name = (p.name || "").toLowerCase();
  const slug = (p.slug || "").toLowerCase();
  const desc = (p.description || "").toLowerCase();
  return (
    desc.includes("testing product") ||
    desc.includes("test product") ||
    slug === "odessian-mist" ||
    slug.startsWith("test-") ||
    name === "odessian mist"
  );
}

function mapDbProduct(p: any): Product {
  const approvedReviews = p.reviews || [];
  const reviewCount = approvedReviews.length;
  const rating =
    reviewCount > 0
      ? Number(
          (
            approvedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewCount
          ).toFixed(1),
        )
      : Number(p.rating || 0);

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: Number(p.price),
    salePrice: p.salePrice !== null && p.salePrice !== undefined ? Number(p.salePrice) : undefined,
    gender: (p.gender?.toLowerCase() ?? "unisex") as Product["gender"],
    category: (p.category?.toLowerCase() ?? "perfume") as Product["category"],
    brand: p.brand || "NOVIXA",
    sku: p.sku,
    stock: p.stock ?? 0,
    rating,
    reviewCount,
    tags: p.tags ?? [],
    images:
      p.images && p.images.length > 0
        ? p.images.map((img: any) => img.url)
        : ["/images/product-perfume.jpg"],
    topNotes: p.topNotes ?? [],
    middleNotes: p.middleNotes ?? [],
    baseNotes: p.baseNotes ?? [],
    occasion: p.occasions ?? [],
    ingredients: p.ingredients ?? [],
    fragranceFamily: p.fragranceFamily ?? undefined,
    longevity: p.longevity ?? undefined,
    shade: p.shade ?? undefined,
    finish: p.finish ?? undefined,
    coverage: p.coverage ?? undefined,
    skinType: p.skinType ?? undefined,
    hairType: p.hairType ?? undefined,
    badge: p.tags?.includes("bestseller") || p.sku === "NVP-001" ? "BEST SELLER" : undefined,
  };
}

export async function getLiveProducts(): Promise<Product[]> {
  try {
    if (process.env.DATABASE_URL) {
      const dbProducts = await prisma.product.findMany({
        where: { status: "ACTIVE" },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          reviews: { where: { status: "APPROVED" }, select: { rating: true } },
        },
        orderBy: { updatedAt: "desc" },
      });

      const published = dbProducts.filter((p) => !isInternalTestProduct(p));

      if (published.length > 0) {
        const live = published.map(mapDbProduct);
        registerLiveProducts(live);
        return live;
      }
    }
  } catch (error) {
    console.warn("Failed to fetch live products from database, falling back to catalogue:", error);
  }

  return fallbackProducts.filter((p) => !isInternalTestProduct(p));
}

export async function getLiveProductBySlug(slug: string): Promise<Product | null> {
  if (!slug) return null;
  const decoded = decodeURIComponent(slug).trim();
  const lower = decoded.toLowerCase();

  // Prevent internal test fixtures from ever resolving
  if (lower === "odessian-mist" || lower.startsWith("test-")) {
    return null;
  }

  try {
    if (process.env.DATABASE_URL) {
      const dbProduct = await prisma.product.findFirst({
        where: {
          OR: [
            { slug: lower },
            { slug: { equals: lower, mode: "insensitive" } },
            { slug: decoded },
            { id: decoded },
            { sku: { equals: decoded, mode: "insensitive" } },
          ],
          status: "ACTIVE",
        },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          reviews: { where: { status: "APPROVED" }, select: { rating: true } },
        },
      });

      if (dbProduct && !isInternalTestProduct(dbProduct)) {
        const prod = mapDbProduct(dbProduct);
        registerLiveProducts([prod]);
        return prod;
      }
    }
  } catch (error) {
    console.warn("Failed to fetch live product by slug from database:", error);
  }

  const fallback = fallbackProducts.find(
    (p) =>
      !isInternalTestProduct(p) &&
      (p.slug.toLowerCase() === lower ||
        p.id.toLowerCase() === lower ||
        p.sku.toLowerCase() === lower),
  );
  return fallback ?? null;
}

export async function getLiveProductById(id: string): Promise<Product | null> {
  return getLiveProductBySlug(id);
}
