"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { ProductCard } from "@/components/products/ProductCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { getProduct, useCommerce, type Product } from "@/lib/commerce/context";

export default function WishlistPage() {
  const { wishlist, toggleWishlist } = useCommerce();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadWishlistProducts() {
      if (wishlist.length === 0) {
        if (isMounted) {
          setProducts([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/products?ids=${encodeURIComponent(wishlist.join(","))}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.products))
          throw new Error("Unable to load current wishlist products.");
        if (isMounted) setProducts(data.products);
      } catch (error) {
        if (isMounted) {
          setProducts([]);
          setError(error instanceof Error ? error.message : "Unable to load wishlist.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadWishlistProducts();
    return () => {
      isMounted = false;
    };
  }, [wishlist, revision]);

  return (
    <PageShell eyebrow="Saved For Later" title="Your Wishlist">
      {!loading &&
        !error &&
        wishlist
          .filter((id) => !products.some((p) => p.id === id))
          .map((id) => (
            <p key={id} className="mt-4">
              A saved item is no longer available.{" "}
              <button onClick={() => toggleWishlist(id)} className="underline">
                Remove saved item
              </button>
            </p>
          ))}
      {error ? (
        <div role="alert">
          {error} <button onClick={() => setRevision((n) => n + 1)}>Retry</button>
        </div>
      ) : loading ? (
        <div className="mt-12 flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-800 border-t-transparent" />
        </div>
      ) : !products.length ? (
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
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
