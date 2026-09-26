export const dynamic = "force-dynamic";
export const revalidate = 0;

import { PageShell } from "@/components/layout/PageShell";
import { ProductCard } from "@/components/products/ProductCard";
import { BundleCard, type DynamicBundle } from "@/components/bundles/BundleCard";
import { getLiveProducts } from "@/lib/products/get-products";
import { prisma } from "@/lib/db/client";

export const metadata = {
  title: "Curated Bundle Offers",
  description: "Complete beauty rituals, signature pairing sets, and luxury value bundles.",
};

async function getDynamicBundles(): Promise<DynamicBundle[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const rawBundles = await prisma.bundle.findMany({
      where: { status: "ACTIVE" },
      include: {
        items: {
          include: {
            product: {
              include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return rawBundles.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      price: b.price,
      originalValue: b.originalValue,
      status: b.status,
      savings: Math.round((1 - b.price / b.originalValue) * 100),
      products: b.items.length,
      items: b.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        name: i.product.name,
        image: i.product.images[0]?.url ?? "/images/product-perfume.jpg",
      })),
    }));
  } catch (error) {
    console.warn("Could not fetch dynamic bundles:", error);
    return [];
  }
}

export default async function BundlesPage() {
  const [allProducts, dynamicBundles] = await Promise.all([
    getLiveProducts(),
    getDynamicBundles(),
  ]);

  const bundleProducts = allProducts.filter(
    (p) => p.category === "bundle" || p.tags.includes("kit"),
  );

  return (
    <PageShell
      eyebrow="Curated Together"
      title="Bundle Offers"
      copy="Complete beauty rituals, signature pairing sets, and exceptional value for your beauty ritual."
    >
      {/* 1. Dynamic Bundles Section (if configured in database) */}
      {dynamicBundles.length > 0 && (
        <section className="mt-8 mb-16">
          <div className="border-b border-[#d9cec5] pb-3 mb-6">
            <h2 className="font-display text-2xl text-[#211b18]">Signature Ritual Sets</h2>
            <p className="text-xs text-[#776a61] mt-1">
              Curated combinations crafted to deliver an elevated sensorial journey.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {dynamicBundles.map((bundle) => (
              <BundleCard key={bundle.id} bundle={bundle} />
            ))}
          </div>
        </section>
      )}

      {/* 2. Curated Value Kits & Pairings */}
      <section className={dynamicBundles.length > 0 ? "mt-12" : "mt-8"}>
        {dynamicBundles.length > 0 && (
          <div className="border-b border-[#d9cec5] pb-3 mb-6">
            <h2 className="font-display text-2xl text-[#211b18]">Curated Kits & Boxed Sets</h2>
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {bundleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
