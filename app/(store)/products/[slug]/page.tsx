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

export async function generateStaticParams() {
  try {
    const products = await getLiveProducts();
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getLiveProductBySlug(slug);

  if (!product) notFound();

  return <ProductDetailClient product={product} />;
}
