export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Suspense } from "react";
import { getLiveProducts } from "@/lib/products/get-products";
import { ShopClient } from "@/components/shop/ShopClient";

const baseUrl = "https://www.novixaretail.com";

export const metadata: Metadata = {
  title: "Shop Luxury Perfumes, Cosmetics & Beauty Sets UK",
  description:
    "Explore the complete NOVIXA luxury beauty collection in the UK. Artisan eau de parfum, couture cosmetics, and skincare bundles. Free UK tracked delivery over £70.",
  alternates: {
    canonical: `${baseUrl}/shop`,
    languages: {
      "en-GB": `${baseUrl}/shop`,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: `${baseUrl}/shop`,
    siteName: "NOVIXA UK",
    title: "Shop Luxury Fragrances & Cosmetics | NOVIXA UK",
    description:
      "Browse hand-crafted atelier perfumes, cruelty-free cosmetics, and beauty sets. Fast UK delivery.",
    images: [
      {
        url: `${baseUrl}/images/hero-perfume.jpg`,
        width: 1200,
        height: 630,
        alt: "NOVIXA British Luxury Beauty Store",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop Luxury British Perfumes & Beauty | NOVIXA UK",
    description:
      "Handcrafted fragrances and couture makeup. Complimentary Royal Mail tracked delivery on orders over £70.",
  },
};

export default async function ShopPage() {
  const products = await getLiveProducts();

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "NOVIXA Luxury Beauty & Fragrance Collection UK",
    url: `${baseUrl}/shop`,
    description:
      "Browse the complete NOVIXA collection of artisan perfumes, couture cosmetics, and skincare bundles in the United Kingdom.",
    inLanguage: "en-GB",
    isPartOf: {
      "@type": "WebSite",
      url: baseUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <Suspense
        fallback={<div className="page-shell py-20 text-center text-sm">Loading catalogue…</div>}
      >
        <ShopClient initialProducts={products} />
      </Suspense>
    </>
  );
}
