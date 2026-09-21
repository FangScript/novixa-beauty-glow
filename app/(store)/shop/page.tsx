export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { getLiveProducts } from "@/lib/products/get-products";
import { ShopClient } from "@/components/shop/ShopClient";

export const metadata = {
  title: "Shop All Fragrances, Cosmetics & Accessories",
  description: "Browse the complete NOVIXA luxury catalogue.",
};

export default async function ShopPage() {
  const products = await getLiveProducts();

  return (
    <Suspense fallback={<div className="page-shell py-20 text-center text-sm">Loading catalogue…</div>}>
      <ShopClient initialProducts={products} />
    </Suspense>
  );
}
