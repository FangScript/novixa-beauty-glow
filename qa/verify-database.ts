import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const [products, categories, images, active] = await Promise.all([
  db.product.count(),
  db.category.count(),
  db.productImage.count(),
  db.product.count({ where: { status: "ACTIVE" } }),
]);
console.log(JSON.stringify({ products, categories, images, active }, null, 2));
await db.$disconnect();
