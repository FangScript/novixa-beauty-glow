import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ProductCard } from "@/components/storefront";
import { products } from "@/lib/commerce";
export const Route = createFileRoute("/women")({ component: Women });
function Women() {
  return (
    <PageShell
      eyebrow="For her"
      title="Women's edit"
      copy="Floral signatures, expressive colour and beauty rituals designed to feel like you."
    >
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
        {products
          .filter((p) => p.gender === "women" || p.gender === "unisex")
          .map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
      </div>
    </PageShell>
  );
}
