"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { ProductCard } from "@/components/products/ProductCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { getProduct, useCommerce, type Product } from "@/lib/commerce/context";

export default function WishlistPage() {
  const { wishlist } = useCommerce();
  const [products, setProducts] = useState<Product[]>([]);
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

      // First resolve statically available products for instantaneous rendering
      const staticMap = new Map<string, Product>();
      wishlist.forEach((id) => {
        const p = getProduct(id);
        if (p) staticMap.set(p.id, p);
      });

      // Fetch dynamic products from the API to guarantee all DB products and live prices load
      try {
        const res = await fetch(`/api/products?ids=${encodeURIComponent(wishlist.join(","))}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.products)) {
            data.products.forEach((p: Product) => staticMap.set(p.id, p));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch live wishlist products:", err);
      }

      if (isMounted) {
        const resolvedList = wishlist
          .map((id) => staticMap.get(id))
          .filter((p): p is Product => Boolean(p));
        setProducts(resolvedList);
        setLoading(false);
      }
    }

    loadWishlistProducts();
    return () => {
      isMounted = false;
    };
  }, [wishlist]);

  return (
    <PageShell eyebrow="Saved For Later" title="Your Wishlist">
      {loading ? (
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
