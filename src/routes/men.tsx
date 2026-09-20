import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ProductCard } from "@/components/storefront";
import { products } from "@/lib/commerce";
export const Route = createFileRoute("/men")({ component: Men });
function Men() {
  return (
    <PageShell
      eyebrow="For him"
      title="Men's edit"
      copy="Confident fragrance and considered grooming essentials for every ritual."
    >
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
        {products
          .filter((p) => p.gender === "men")
          .map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
      </div>
    </PageShell>
  );
}
