import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const fontDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-display",
});

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

export const viewport: Viewport = {
  themeColor: "#0c0a09",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const baseUrl = "https://www.novixaretail.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "NOVIXA | Luxury Perfume, Makeup & Skincare UK",
    template: "%s | NOVIXA UK",
  },
  description:
    "Discover NOVIXA British luxury beauty. Handcrafted artisan perfumes, couture makeup bundles, and restorative skincare. Complimentary UK Royal Mail Tracked delivery on orders over £70.",
  keywords: [
    "luxury perfume UK",
    "designer fragrances London",
    "cruelty free makeup UK",
    "luxury skincare United Kingdom",
    "British beauty brand",
    "artisan perfume Mayfair",
    "makeup bundles UK",
    "niche perfume shop London",
    "eau de parfum UK",
    "botanical skincare UK",
    "organic cosmetics UK",
    "next day delivery perfume UK",
  ],
  authors: [{ name: "NOVIXA Atelier", url: baseUrl }],
  creator: "NOVIXA UK",
  publisher: "NOVIXA Retail Ltd",
  applicationName: "NOVIXA",
  formatDetection: {
    telephone: true,
    date: false,
    address: true,
    email: true,
    url: true,
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: baseUrl,
    siteName: "NOVIXA UK",
    title: "NOVIXA | Luxury British Fragrance, Makeup & Skincare",
    description:
      "Handcrafted atelier fragrances, couture makeup sets, and radiant skincare. Fast UK delivery direct from London.",
    images: [
      {
        url: `${baseUrl}/images/hero-perfume.jpg`,
        width: 1200,
        height: 630,
        alt: "NOVIXA British Luxury Beauty & Fine Fragrance",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NOVIXA UK | Luxury British Fragrances & Beauty",
    description:
      "Atelier perfumes, couture makeup, and botanic skincare. Complimentary UK shipping over £70.",
    site: "@novixaretail",
    creator: "@novixaretail",
    images: [`${baseUrl}/images/hero-perfume.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  other: {
    "geo.region": "GB",
    "geo.placename": "London, United Kingdom",
    "geo.position": "51.5074;-0.1278",
    ICBM: "51.5074, -0.1278",
    "content-language": "en-GB",
  },
  verification: {
    google:
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
      process.env.GOOGLE_SITE_VERIFICATION ||
      "googlee0fc743357390d7b",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
};

// Global Schema.org JSON-LD structured data for Google UK Knowledge Graph
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: "NOVIXA",
      alternateName: ["NOVIXA UK", "NOVIXA Retail Ltd"],
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        "@id": `${baseUrl}/#logo`,
        url: `${baseUrl}/favicon.ico`,
        caption: "NOVIXA British Luxury Beauty",
      },
      description:
        "British luxury fragrance, cosmetic atelier, and premium skincare retailer based in the United Kingdom.",
      address: {
        "@type": "PostalAddress",
        addressLocality: "London",
        addressRegion: "Greater London",
        addressCountry: "GB",
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "novixaretail@gmail.com",
        availableLanguage: ["en-GB", "English"],
        areaServed: ["GB", "United Kingdom"],
      },
      sameAs: [
        "https://www.instagram.com/novixaretail",
        "https://www.facebook.com/novixaretail",
        "https://www.tiktok.com/@novixaretail",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${baseUrl}/#website`,
      url: baseUrl,
      name: "NOVIXA UK",
      publisher: {
        "@id": `${baseUrl}/#organization`,
      },
      inLanguage: "en-GB",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${baseUrl}/shop?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "OnlineStore",
      "@id": `${baseUrl}/#store`,
      name: "NOVIXA Online Store",
      url: baseUrl,
      currenciesAccepted: "GBP",
      paymentAccepted: "Credit Card, Debit Card, PayPal",
      priceRange: "££",
      parentOrganization: {
        "@id": `${baseUrl}/#organization`,
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
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${fontDisplay.variable} ${fontSans.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="antialiased bg-background text-foreground min-h-screen">
        {children}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
