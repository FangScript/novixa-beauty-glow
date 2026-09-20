import { PageShell } from "@/components/layout/PageShell";
import { ProductCard } from "@/components/products/ProductCard";
import { products } from "@/lib/products/catalogue";

export const metadata = {
  title: "Women's Fragrance & Beauty Edit",
  description: "Luminous floral notes, couture makeup essentials, and everyday glow for her.",
};

export default function WomenPage() {
  const womenProducts = products.filter((p) => p.gender === "women");

  return (
    <PageShell
      eyebrow="For Her"
      title="Women's Edit"
      copy="Luminous floral bouquets, velvet accords, couture makeup, and everyday glow essentials."
    >
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
        {womenProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </PageShell>
  );
}
