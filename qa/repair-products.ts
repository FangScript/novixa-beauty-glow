import { prisma } from "../lib/db/client";
import { products as catalogueProducts } from "../lib/products/catalogue";

async function repair() {
  console.log("Starting product price and stock repair...");
  
  const catalogueMap = new Map(catalogueProducts.map((p) => [p.id, p]));

  const corrupted = await prisma.product.findMany({
    where: {
      OR: [{ price: { lt: 0.01 } }, { stock: { lt: 0.01 } }],
    },
  });

  console.log(`Found ${corrupted.length} corrupted products.`);

  for (const item of corrupted) {
    const cat = catalogueMap.get(item.id);
    let newPrice: number;
    let newSalePrice: number | null = null;
    let newStock: number;
    let newRating: number = 4.8;
    let newReviewCount: number = 25;

    if (cat) {
      newPrice = cat.price;
      newSalePrice = cat.salePrice ?? null;
      newStock = cat.stock;
      newRating = cat.rating;
      newReviewCount = cat.reviewCount;
    } else if (item.id === "cmubng3xb0004tb5crp88lx5t") {
      newPrice = 85;
      newSalePrice = 75;
      newStock = 20;
      newRating = 4.8;
      newReviewCount = 12;
    } else {
      newPrice = 50;
      newStock = 15;
    }

    await prisma.product.update({
      where: { id: item.id },
      data: {
        price: newPrice,
        salePrice: newSalePrice,
        stock: newStock,
        rating: newRating,
        reviewCount: newReviewCount,
      },
    });

    console.log(`✓ Repaired ${item.name} (${item.id}): price £${newPrice}, stock ${newStock}`);
  }

  // Verify all products
  const remaining = await prisma.product.count({
    where: {
      OR: [{ price: { lt: 0.01 } }, { stock: { lt: 0.01 } }],
    },
  });

  console.log(`Repair complete. Corrupted products remaining: ${remaining}`);
}

repair()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
