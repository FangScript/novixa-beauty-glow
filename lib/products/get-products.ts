import { prisma } from "@/lib/db/client";
import { products as fallbackProducts, type Product } from "@/lib/products/catalogue";

export async function getLiveProducts(): Promise<Product[]> {
  try {
    if (process.env.DATABASE_URL) {
      const dbProducts = await prisma.product.findMany({
        where: { status: { not: "ARCHIVED" } },
        include: { images: { orderBy: { sortOrder: "asc" } } },
        orderBy: { updatedAt: "desc" },
      });

      if (dbProducts.length > 0) {
        return dbProducts.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          price: p.price,
          salePrice: p.salePrice ?? undefined,
          gender: p.gender.toLowerCase() as Product["gender"],
          category: p.category.toLowerCase() as Product["category"],
          brand: p.brand,
          sku: p.sku,
          stock: p.stock,
          rating: Number(p.rating),
          reviewCount: p.reviewCount,
          tags: p.tags,
          images:
            p.images.length > 0
              ? p.images.map((img) => img.url)
              : ["/images/product-perfume.jpg"],
          topNotes: p.topNotes,
          middleNotes: p.middleNotes,
          baseNotes: p.baseNotes,
          occasion: p.occasions,
          ingredients: p.ingredients,
        }));
      }
    }
  } catch (error) {
    console.warn("Failed to fetch live products from database, falling back to catalogue:", error);
  }

  return fallbackProducts;
}

export async function getLiveProductBySlug(slug: string): Promise<Product | null> {
  try {
    if (process.env.DATABASE_URL) {
      const dbProduct = await prisma.product.findFirst({
        where: { slug, status: { not: "ARCHIVED" } },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      });

      if (dbProduct) {
        return {
          id: dbProduct.id,
          name: dbProduct.name,
          slug: dbProduct.slug,
          description: dbProduct.description,
          price: dbProduct.price,
          salePrice: dbProduct.salePrice ?? undefined,
          gender: dbProduct.gender.toLowerCase() as Product["gender"],
          category: dbProduct.category.toLowerCase() as Product["category"],
          brand: dbProduct.brand,
          sku: dbProduct.sku,
          stock: dbProduct.stock,
          rating: Number(dbProduct.rating),
          reviewCount: dbProduct.reviewCount,
          tags: dbProduct.tags,
          images:
            dbProduct.images.length > 0
              ? dbProduct.images.map((img) => img.url)
              : ["/images/product-perfume.jpg"],
          topNotes: dbProduct.topNotes,
          middleNotes: dbProduct.middleNotes,
          baseNotes: dbProduct.baseNotes,
          occasion: dbProduct.occasions,
          ingredients: dbProduct.ingredients,
        };
      }
    }
  } catch (error) {
    console.warn("Failed to fetch live product by slug from database:", error);
  }

  const fallback = fallbackProducts.find((p) => p.slug === slug);
  return fallback ?? null;
}
