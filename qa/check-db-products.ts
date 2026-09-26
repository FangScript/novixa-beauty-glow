import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();
async function run() {
  const dbProducts = await prisma.product.findMany({
    include: { images: true },
  });
  console.log("DB Products count:", dbProducts.length);
  for (const p of dbProducts) {
    console.log({ id: p.id, name: p.name, slug: p.slug, sku: p.sku, images: p.images.map((i) => i.url) });
  }
}
run().finally(() => prisma.$disconnect());
