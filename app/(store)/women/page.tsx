export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ProductCard } from "@/components/products/ProductCard";
import { getLiveProducts } from "@/lib/products/get-products";

const baseUrl = "https://www.novixaretail.com";

export const metadata: Metadata = {
  title: "Women's Luxury Perfumes & Beauty Edit UK",
  description:
    "Shop luxury women's fragrances, floral eau de parfum, and radiant makeup essentials. Handcrafted in the UK with complimentary delivery over £70.",
  alternates: {
    canonical: `${baseUrl}/women`,
    languages: {
      "en-GB": `${baseUrl}/women`,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: `${baseUrl}/women`,
    siteName: "NOVIXA UK",
    title: "Women's Luxury Fragrances & Beauty | NOVIXA UK",
    description: "Luminous floral notes, couture makeup essentials, and everyday glow for her.",
    images: [
      {
        url: `${baseUrl}/images/hero-perfume.jpg`,
        width: 1200,
        height: 630,
        alt: "NOVIXA Women's Luxury Collection UK",
      },
    ],
  },
};

export default async function WomenPage() {
  const allProducts = await getLiveProducts();
  const womenProducts = allProducts.filter((p) => p.gender === "women");

  return (
    <PageShell
      eyebrow="For Her"
      title="Women's Edit"
      copy="Luminous floral bouquets, velvet accords, couture makeup, and everyday glow essentials."
    >
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
        {womenProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </PageShell>
  );
}
