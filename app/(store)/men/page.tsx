export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ProductCard } from "@/components/products/ProductCard";
import { getLiveProducts } from "@/lib/products/get-products";

const baseUrl = "https://www.novixaretail.com";

export const metadata: Metadata = {
  title: "Men's Luxury Cologne, Eau De Parfum & Grooming UK",
  description:
    "Discover sophisticated men's fragrances, woody and amber accords, and refined grooming rituals by NOVIXA UK. Fast UK Royal Mail tracked dispatch.",
  alternates: {
    canonical: `${baseUrl}/men`,
    languages: {
      "en-GB": `${baseUrl}/men`,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: `${baseUrl}/men`,
    siteName: "NOVIXA UK",
    title: "Men's Fragrances & Grooming Collection | NOVIXA UK",
    description:
      "Confident fragrances, refined accords, and considered grooming essentials for him.",
    images: [
      {
        url: `${baseUrl}/images/hero-perfume.jpg`,
        width: 1200,
        height: 630,
        alt: "NOVIXA Men's Luxury Fragrances UK",
      },
    ],
  },
};

export default async function MenPage() {
  const allProducts = await getLiveProducts();
  const menProducts = allProducts.filter((p) => p.gender === "men");

  return (
    <PageShell
      eyebrow="For Him"
      title="Men's Edit"
      copy="Confident fragrances, refined accords, and considered grooming essentials for every ritual."
    >
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
        {menProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </PageShell>
  );
}
