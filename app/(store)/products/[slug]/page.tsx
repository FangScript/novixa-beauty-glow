export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLiveProductBySlug, getLiveProducts } from "@/lib/products/get-products";
import { ProductDetailClient } from "./ProductDetailClient";

const baseUrl = "https://www.novixaretail.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getLiveProductBySlug(slug);
  if (!product) return {};

  const productUrl = `${baseUrl}/products/${product.slug || slug}`;
  const priceFormatted = product.price ? `£${Number(product.price).toFixed(2)}` : "";
  const title = `${product.name} ${priceFormatted ? `(${priceFormatted})` : ""} | Luxury British Beauty | NOVIXA UK`;
  const description =
    product.description?.slice(0, 155) ||
    `Shop ${product.name} at NOVIXA UK. Handcrafted British luxury fragrance & beauty. Enjoy fast Royal Mail Tracked delivery across the UK.`;

  const primaryImage = product.images?.[0] || "/images/hero-perfume.jpg";
  const imageUrl = primaryImage.startsWith("http") ? primaryImage : `${baseUrl}${primaryImage}`;

  return {
    title,
    description,
    alternates: {
      canonical: productUrl,
      languages: {
        "en-GB": productUrl,
      },
    },
    openGraph: {
      type: "website",
      locale: "en_GB",
      url: productUrl,
      siteName: "NOVIXA UK",
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1000,
          height: 1000,
          alt: `${product.name} — Luxury British Fragrance by NOVIXA`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
      site: "@novixaretail",
      creator: "@novixaretail",
    },
    other: {
      "product:price:amount": String(product.price || 0),
      "product:price:currency": "GBP",
      "product:availability": (product.stock ?? 1) > 0 ? "in stock" : "out of stock",
      "product:brand": "NOVIXA",
      "product:condition": "new",
      "geo.region": "GB",
    },
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

  const productUrl = `${baseUrl}/products/${product.slug || slug}`;
  const primaryImage = product.images?.[0] || "/images/hero-perfume.jpg";
  const imageUrl = primaryImage.startsWith("http") ? primaryImage : `${baseUrl}${primaryImage}`;

  const allImages = (product.images || []).map((img: string) =>
    img.startsWith("http") ? img : `${baseUrl}${img}`,
  );

  const categoryName = product.category
    ? product.category.charAt(0).toUpperCase() + product.category.slice(1)
    : "Fragrance";

  // Google UK Schema.org Product & BreadcrumbList structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${productUrl}/#product`,
        name: product.name,
        image: allImages.length > 0 ? allImages : [imageUrl],
        description:
          product.description || `Handcrafted ${product.name} by NOVIXA British luxury atelier.`,
        sku: product.id,
        mpn: `NOV-${product.id.slice(0, 8).toUpperCase()}`,
        brand: {
          "@type": "Brand",
          name: "NOVIXA",
        },
        category: categoryName,
        offers: {
          "@type": "Offer",
          url: productUrl,
          priceCurrency: "GBP",
          price: Number(product.price || 0).toFixed(2),
          priceValidUntil: "2027-12-31",
          itemCondition: "https://schema.org/NewCondition",
          availability:
            (product.stock ?? 1) > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          seller: {
            "@type": "Organization",
            name: "NOVIXA UK",
          },
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingRate: {
              "@type": "MonetaryAmount",
              value: Number(product.price || 0) >= 70 ? "0.00" : "4.95",
              currency: "GBP",
            },
            shippingDestination: {
              "@type": "DefinedRegion",
              addressCountry: "GB",
            },
            deliveryTime: {
              "@type": "ShippingDeliveryTime",
              handlingTime: {
                "@type": "QuantitativeValue",
                minValue: 0,
                maxValue: 1,
                unitCode: "DAY",
              },
              transitTime: {
                "@type": "QuantitativeValue",
                minValue: 1,
                maxValue: 2,
                unitCode: "DAY",
              },
            },
          },
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "GB",
            returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
            merchantReturnDays: 30,
            returnMethod: "https://schema.org/ReturnByMail",
            returnFees: "https://schema.org/FreeReturn",
          },
        },
        ...(Number(product.reviewCount || 0) > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: Number(product.rating || 5).toFixed(1),
                reviewCount: Number(product.reviewCount),
                bestRating: "5",
                worstRating: "1",
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${productUrl}/#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: baseUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: categoryName,
            item: `${baseUrl}/shop?category=${encodeURIComponent(product.category || "perfume")}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: product.name,
            item: productUrl,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient product={product} relatedProducts={related} />
    </>
  );
}
