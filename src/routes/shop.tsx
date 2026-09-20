import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageShell, ProductCard } from "@/components/storefront";
import { products, searchProducts, type ProductCategory } from "@/lib/commerce";
export const Route = createFileRoute("/shop")({ component: Shop });
function Shop() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ProductCategory>("all");
  const [sort, setSort] = useState("featured");
  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
  }, []);
  const results = useMemo(() => {
    const list = searchProducts(query).filter((p) => category === "all" || p.category === category);
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
      eyebrow="The NOVIXA edit"
      title="Shop all"
      copy="A considered collection of fragrance, colour, grooming and tools for every kind of glow."
    >
      <div className="mt-10 flex flex-col gap-3 border-y border-border py-4 md:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product, category or note"
          className="h-10 flex-1 border border-border bg-transparent px-3 text-sm outline-none focus:border-rosewood"
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
      <p className="mt-6 text-xs text-muted-foreground">{results.length} products</p>
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
        {results.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {!results.length && (
        <p className="py-20 text-center text-sm text-muted-foreground">
          No products match that search.
        </p>
      )}
    </PageShell>
  );
}
export const shopProducts = products;
