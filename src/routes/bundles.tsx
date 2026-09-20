import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ProductCard } from "@/components/storefront";
import { products } from "@/lib/commerce";
export const Route = createFileRoute("/bundles")({ component: Bundles });
function Bundles() {
  return (
    <PageShell
      eyebrow="Curated together"
      title="Bundle offers"
      copy="Easy rituals, considered gifts, and more beauty for your budget."
    >
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
        {products
          .filter((p) => p.category === "bundle" || p.tags.includes("kit"))
          .map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
      </div>
    </PageShell>
  );
}
