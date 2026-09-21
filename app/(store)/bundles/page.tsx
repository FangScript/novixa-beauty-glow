import { PageShell } from "@/components/layout/PageShell";
import { ProductCard } from "@/components/products/ProductCard";
import { getLiveProducts } from "@/lib/products/get-products";

export const metadata = {
  title: "Curated Bundle Offers",
  description: "Complete beauty rituals, signature pairing sets, and luxury value bundles.",
};

export default async function BundlesPage() {
  const allProducts = await getLiveProducts();
  const bundleProducts = allProducts.filter(
    (p) => p.category === "bundle" || p.tags.includes("kit"),
  );

  return (
    <PageShell
      eyebrow="Curated Together"
      title="Bundle Offers"
      copy="Complete beauty rituals, signature pairing sets, and exceptional value for your beauty ritual."
    >
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
        {bundleProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </PageShell>
  );
}
