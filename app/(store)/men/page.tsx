import { PageShell } from "@/components/layout/PageShell";
import { ProductCard } from "@/components/products/ProductCard";
import { products } from "@/lib/products/catalogue";

export const metadata = {
  title: "Men's Fragrance & Grooming Edit",
  description: "Confident fragrances and refined grooming essentials for him.",
};

export default function MenPage() {
  const menProducts = products.filter((p) => p.gender === "men");

  return (
    <PageShell
      eyebrow="For Him"
      title="Men's Edit"
      copy="Confident fragrances, refined accords, and considered grooming essentials for every ritual."
    >
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
        {menProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </PageShell>
  );
}
