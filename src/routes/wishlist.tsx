import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ProductCard, EmptyState } from "@/components/storefront";
import { getProduct, useCommerce } from "@/lib/commerce";
export const Route = createFileRoute("/wishlist")({ component: Wishlist });
function Wishlist() {
  const { wishlist } = useCommerce();
  const saved = wishlist.map(getProduct).filter((p): p is NonNullable<typeof p> => Boolean(p));
  return (
    <PageShell eyebrow="Saved for later" title="Wishlist">
      {!saved.length ? (
        <div className="mt-10">
          <EmptyState
            title="Your wishlist is empty"
            copy="Save pieces you love and come back to them anytime."
          />
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {saved.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
