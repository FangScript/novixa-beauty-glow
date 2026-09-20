"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { ProductCard } from "@/components/products/ProductCard";
import { products, searchProducts, type ProductCategory } from "@/lib/products/catalogue";

function ShopContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialCategory = (searchParams.get("category") as ProductCategory) ?? "all";

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<"all" | ProductCategory>(initialCategory);
  const [sort, setSort] = useState("featured");

  const results = useMemo(() => {
    const list = searchProducts(query).filter(
      (p) => category === "all" || p.category === category,
    );
    return [...list].sort((a, b) =>
      sort === "price-low"
        ? (a.salePrice ?? a.price) - (b.salePrice ?? b.price)
        : sort === "price-high"
          ? (b.salePrice ?? b.price) - (a.salePrice ?? a.price)
          : b.rating - a.rating,
    );
  }, [query, category, sort]);

  return (
    <PageShell
      eyebrow="The NOVIXA Edit"
      title="Shop All"
      copy="A considered collection of fragrance, colour, grooming and tools for every kind of glow."
    >
      <div className="mt-8 flex flex-col gap-3 border-y border-border py-4 md:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product, category or note"
          className="h-10 flex-1 border border-border bg-white/40 px-3 text-sm outline-none focus:border-rosewood"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className="h-10 border border-border bg-background px-3 text-xs"
        >
          <option value="all">All categories</option>
          <option value="perfume">Perfumes</option>
          <option value="makeup">Makeup</option>
          <option value="grooming">Grooming</option>
          <option value="accessories">Accessories</option>
          <option value="bundle">Bundles</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-10 border border-border bg-background px-3 text-xs"
        >
          <option value="featured">Sort: Featured</option>
          <option value="price-low">Price: low to high</option>
          <option value="price-high">Price: high to low</option>
        </select>
      </div>

      <div className="mt-6 flex justify-between items-center text-xs text-muted-foreground">
        <span>{results.length} products available</span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
        {results.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {!results.length && (
        <div className="py-24 text-center">
          <p className="font-display text-2xl text-foreground">No products found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your search keywords or removing category filters.
          </p>
        </div>
      )}
    </PageShell>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="page-shell py-20 text-center text-sm">Loading catalogue…</div>}>
      <ShopContent />
    </Suspense>
  );
}
