"use client";

import { PageShell } from "@/components/layout/PageShell";
import { ProductCard } from "@/components/products/ProductCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { getProduct, useCommerce } from "@/lib/commerce/context";

export default function WishlistPage() {
  const { wishlist } = useCommerce();
  const saved = wishlist.map(getProduct).filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <PageShell eyebrow="Saved For Later" title="Your Wishlist">
      {!saved.length ? (
        <div className="mt-8">
          <EmptyState
            title="Your wishlist is empty"
            copy="Save items you love and revisit them anytime to complete your signature look."
            action="/shop"
            actionLabel="DISCOVER PRODUCTS"
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {saved.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
