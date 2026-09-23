/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { productSchema, products as seedProducts, type Product } from "@/lib/commerce/catalogue";
async function requireProductAdmin() {
  if (process.env["NODE_ENV"] !== "production") return;
  const { getAuthenticatedAdmin } = await import("@/lib/auth.server");
  const admin = await getAuthenticatedAdmin().catch(() => null);
  if (!admin) throw new Response("Unauthorized", { status: 401 });
}

let previewProducts: Product[] = seedProducts.map((product) => ({ ...product }));
const hasDatabase = () => typeof process !== "undefined" && Boolean(process.env["DATABASE_URL"]);
const toPrismaCategory = (category: Product["category"]) =>
  category.toUpperCase() as "PERFUME" | "MAKEUP" | "GROOMING" | "BUNDLE" | "ACCESSORIES";
const toPrismaGender = (gender: Product["gender"]) =>
  gender.toUpperCase() as "MEN" | "WOMEN" | "UNISEX";
const fromPrisma = (product: any): Product =>
  productSchema.parse({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    salePrice: product.salePrice ?? undefined,
    gender: String(product.gender).toLowerCase(),
    category: String(product.category).toLowerCase(),
    brand: product.brand,
    sku: product.sku,
    images: product.images?.length
      ? product.images.map((image: { url: string }) => image.url)
      : ["/placeholder.svg"],
    fragranceFamily: product.fragranceFamily ?? undefined,
    topNotes: product.topNotes,
    middleNotes: product.middleNotes,
    baseNotes: product.baseNotes,
    occasion: product.occasions,
    longevity: product.longevity ?? undefined,
    shade: product.shade ?? undefined,
    finish: product.finish ?? undefined,
    coverage: product.coverage ?? undefined,
    skinType: product.skinType ?? undefined,
    hairType: product.hairType ?? undefined,
    ingredients: product.ingredients,
    stock: product.stock,
    rating: Number(product.rating),
    reviewCount: product.reviewCount,
    tags: product.tags,
  });

export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  await requireProductAdmin();
  if (!hasDatabase()) return { source: "preview" as const, products: previewProducts };
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  try {
    const records = await db.product.findMany({
      where: { status: { not: "ARCHIVED" } },
      include: { images: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return { source: "database" as const, products: records.map(fromPrisma) };
  } finally {
    await db.$disconnect();
  }
});

const productInput = productSchema;
export const saveProduct = createServerFn({ method: "POST" })
  .validator((data: unknown) => productInput.parse(data))
  .handler(async ({ data }) => {
    await requireProductAdmin();
    if (!hasDatabase()) {
      previewProducts = previewProducts.some((product) => product.id === data.id)
        ? previewProducts.map((product) => (product.id === data.id ? data : product))
        : [data, ...previewProducts];
      return { source: "preview" as const, product: data };
    }
    const { PrismaClient } = await import("@prisma/client");
    const db = new PrismaClient();
    try {
      const category = await db.category.upsert({
        where: { slug: data.category },
        update: { name: data.category },
        create: { slug: data.category, name: data.category },
      });
      const record = await db.product.upsert({
        where: { id: data.id },
        update: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          price: data.price,
          salePrice: data.salePrice ?? null,
          gender: toPrismaGender(data.gender),
          category: toPrismaCategory(data.category),
          categoryId: category.id,
          brand: data.brand,
          sku: data.sku,
          stock: data.stock,
          topNotes: data.topNotes ?? [],
          middleNotes: data.middleNotes ?? [],
          baseNotes: data.baseNotes ?? [],
          occasions: data.occasion ?? [],
          longevity: data.longevity,
          fragranceFamily: data.fragranceFamily,
          shade: data.shade,
          finish: data.finish,
          coverage: data.coverage,
          skinType: data.skinType,
          hairType: data.hairType,
          ingredients: data.ingredients ?? [],
          tags: data.tags,
        } as any,
        create: {
          id: data.id,
          name: data.name,
          slug: data.slug,
          description: data.description,
          price: data.price,
          salePrice: data.salePrice ?? null,
          gender: toPrismaGender(data.gender),
          category: toPrismaCategory(data.category),
          categoryId: category.id,
          brand: data.brand,
          sku: data.sku,
          stock: data.stock,
          topNotes: data.topNotes ?? [],
          middleNotes: data.middleNotes ?? [],
          baseNotes: data.baseNotes ?? [],
          occasions: data.occasion ?? [],
          longevity: data.longevity,
          fragranceFamily: data.fragranceFamily,
          shade: data.shade,
          finish: data.finish,
          coverage: data.coverage,
          skinType: data.skinType,
          hairType: data.hairType,
          ingredients: data.ingredients ?? [],
          tags: data.tags,
        } as any,
        include: { images: true },
      });

      if (Array.isArray(data.images) && data.images.length > 0) {
        await db.productImage.deleteMany({ where: { productId: record.id } });
        await db.productImage.createMany({
          data: data.images.map((url: string, index: number) => ({
            productId: record.id,
            url,
            alt: `${data.name} photo ${index + 1}`,
            sortOrder: index,
          })),
        });
      }

      const refreshed = await db.product.findUnique({
        where: { id: record.id },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      });

      return { source: "database" as const, product: fromPrisma(refreshed ?? record) };
    } finally {
      await db.$disconnect();
    }
  });

export const archiveProduct = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireProductAdmin();
    if (!hasDatabase()) {
      previewProducts = previewProducts.filter((product) => product.id !== data.id);
      return { source: "preview" as const, success: true };
    }
    const { PrismaClient } = await import("@prisma/client");
    const db = new PrismaClient();
    try {
      await db.product.update({ where: { id: data.id }, data: { status: "ARCHIVED" } });
      return { source: "database" as const, success: true };
    } finally {
      await db.$disconnect();
    }
  });
