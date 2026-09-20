import { PrismaClient, ProductCategory, Gender, ProductStatus } from "@prisma/client";
import { products } from "../src/lib/commerce/catalogue";

const db = new PrismaClient();
const categoryNames = ["perfume", "makeup", "grooming", "bundle", "accessories"] as const;

async function main() {
  const categories = new Map<string, string>();
  for (const slug of categoryNames) {
    const category = await db.category.upsert({
      where: { slug },
      update: { name: slug },
      create: { slug, name: slug },
    });
    categories.set(slug, category.id);
  }
  for (const product of products) {
    const record = await db.product.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        salePrice: product.salePrice,
        gender: product.gender.toUpperCase() as Gender,
        category: product.category.toUpperCase() as ProductCategory,
        categoryId: categories.get(product.category)!,
        brand: product.brand,
        status: ProductStatus.ACTIVE,
        fragranceFamily: product.fragranceFamily,
        topNotes: product.topNotes ?? [],
        middleNotes: product.middleNotes ?? [],
        baseNotes: product.baseNotes ?? [],
        occasions: product.occasion ?? [],
        longevity: product.longevity,
        shade: product.shade,
        finish: product.finish,
        coverage: product.coverage,
        skinType: product.skinType,
        hairType: product.hairType,
        ingredients: product.ingredients ?? [],
        stock: product.stock,
        rating: product.rating,
        reviewCount: product.reviewCount,
        tags: product.tags,
      },
      create: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        salePrice: product.salePrice,
        gender: product.gender.toUpperCase() as Gender,
        category: product.category.toUpperCase() as ProductCategory,
        categoryId: categories.get(product.category)!,
        brand: product.brand,
        sku: product.sku,
        status: ProductStatus.ACTIVE,
        fragranceFamily: product.fragranceFamily,
        topNotes: product.topNotes ?? [],
        middleNotes: product.middleNotes ?? [],
        baseNotes: product.baseNotes ?? [],
        occasions: product.occasion ?? [],
        longevity: product.longevity,
        shade: product.shade,
        finish: product.finish,
        coverage: product.coverage,
        skinType: product.skinType,
        hairType: product.hairType,
        ingredients: product.ingredients ?? [],
        stock: product.stock,
        rating: product.rating,
        reviewCount: product.reviewCount,
        tags: product.tags,
      },
    });
    await db.productImage.deleteMany({ where: { productId: record.id } });
    await db.productImage.createMany({
      data: product.images.map((url, sortOrder) => ({
        productId: record.id,
        url: String(url),
        alt: product.name,
        sortOrder,
      })),
    });
  }
  console.log(`Seeded ${products.length} products across ${categories.size} categories.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
