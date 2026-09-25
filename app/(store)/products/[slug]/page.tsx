export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import { getLiveProductBySlug, getLiveProducts } from "@/lib/products/get-products";
import { ProductDetailClient } from "./ProductDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getLiveProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.name} | NOVIXA`,
    description: product.description?.slice(0, 160),
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getLiveProductBySlug(slug);

  if (!product) notFound();

  // Fetch live products for curated related pairing
  let related: any[] = [];
  try {
    const allProducts = await getLiveProducts();
    related = allProducts
      .filter(
        (p) =>
          p.id !== product.id && (p.category === product.category || p.gender === product.gender),
      )
      .slice(0, 4);
  } catch {}

  return <ProductDetailClient product={product} relatedProducts={related} />;
}

