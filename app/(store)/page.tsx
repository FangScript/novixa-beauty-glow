export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Gem, Sparkles, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/products/ProductCard";
import { getLiveProducts } from "@/lib/products/get-products";
import { NewsletterForm } from "@/components/storefront/NewsletterForm";
import type { Product } from "@/lib/products/catalogue";

const categories = [
  {
    title: "Perfumes",
    copy: "Scents that tell your story.",
    image: "/images/category-perfume.jpg",
    href: "/shop?category=perfume",
  },
  {
    title: "Makeup Bundles",
    copy: "Everything you need, in one bundle.",
    image: "/images/category-makeup.jpg",
    href: "/bundles",
  },
  {
    title: "Makeup Accessories",
    copy: "Small tools. Big difference.",
    image: "/images/category-accessories.jpg",
    href: "/shop?category=accessories",
  },
];

const collections = [
  {
    title: "Floral Perfumes",
    copy: "Fresh. Feminine. Unforgettable.",
    image: "/images/category-perfume.jpg",
    href: "/women",
  },
  {
    title: "Matte Makeup Bundle",
    copy: "Long-lasting. Flawless. You.",
    image: "/images/category-makeup.jpg",
    href: "/bundles",
  },
  {
    title: "Beauty Accessories",
    copy: "Tools for a better you.",
    image: "/images/category-accessories.jpg",
    href: "/shop?category=accessories",
  },
];

function ArrowLink({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase ${
        light ? "text-primary-foreground" : "text-foreground"
      }`}
    >
      Shop now <ArrowRight size={13} />
    </span>
  );
}

export default async function HomePage() {
  const allProducts = await getLiveProducts();
  const bestSellerSkus = ["NVP-001", "NVB-001", "NVA-001", "NVA-002"];
  const matches = bestSellerSkus
    .map((sku) => allProducts.find((p) => p.sku === sku))
    .filter(Boolean) as Product[];

  const matchIds = new Set(matches.map((p) => p.id));
  const remaining = allProducts.filter((p) => !matchIds.has(p.id));
  const featuredProducts = matches.length >= 4 ? matches : [...matches, ...remaining].slice(0, 4);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section
        id="top"
        className="relative min-h-[600px] overflow-hidden bg-ink text-primary-foreground md:min-h-[690px]"
      >
        <img
          src="/images/novixa-hero.jpg"
          alt="Luxury perfume, lipstick and makeup brushes arranged with rose satin"
          className="absolute inset-0 h-full w-full object-cover object-[65%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--ink)_0%,color-mix(in_oklab,var(--ink)_88%,transparent)_34%,transparent_72%)]" />
        <div className="page-shell relative flex min-h-[600px] items-center py-20 md:min-h-[690px]">
          <div className="max-w-xl">
            <p className="mb-7 text-[10px] font-semibold uppercase tracking-[0.35em] text-champagne">
              Beauty&nbsp;&nbsp;•&nbsp;&nbsp;Fragrance&nbsp;&nbsp;•&nbsp;&nbsp;You
            </p>
            <h1 className="max-w-lg font-display text-6xl leading-[0.98] sm:text-7xl md:text-[84px]">
              Discover Your
              <br />
              Signature <em className="text-blush">Glow</em>
            </h1>
            <p className="mt-7 max-w-sm text-sm leading-6 text-primary-foreground/70">
              Premium perfumes, curated makeup bundles and must-have accessories — all in one place.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-9 rounded-none bg-champagne text-ink hover:bg-white hover:text-black font-medium tracking-[0.14em] text-[11px] px-8 py-6 uppercase transition-colors"
            >
              <Link href="/shop">
                Shop now <ArrowRight size={14} className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Category Highlights */}
      <section id="categories" className="page-shell py-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-rosewood">
              Curated categories
            </p>
            <h2 className="font-display text-4xl md:text-5xl">Shop By Category</h2>
          </div>
          <Link
            href="/shop"
            className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-rosewood sm:flex"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.title}
              href={category.href}
              className="group relative aspect-[4/3] overflow-hidden bg-muted"
            >
              <img
                src={category.image}
                alt={category.title}
                loading="lazy"
                className="editorial-image h-full w-full object-cover group-hover:scale-[1.035]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_oklab,var(--ink)_82%,transparent),transparent_62%)]" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-primary-foreground">
                <h3 className="font-display text-3xl">{category.title}</h3>
                <p className="mt-1 text-xs text-primary-foreground/75">{category.copy}</p>
                <ArrowLink light />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Best Sellers */}
      <section id="products" className="page-shell pb-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-rosewood">
              Featured products
            </p>
            <h2 className="font-display text-4xl md:text-5xl">Our Best Sellers</h2>
          </div>
          <Link
            href="/shop"
            className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-rosewood sm:flex"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Featured Collections */}
      <section id="collections" className="bg-ink py-20 text-primary-foreground">
        <div className="page-shell">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-champagne">
                Themed Edits
              </p>
              <h2 className="font-display text-4xl md:text-5xl">Featured Collections</h2>
            </div>
            <Link
              href="/shop"
              className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-champagne sm:flex"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {collections.map((collection) => (
              <Link
                key={collection.title}
                href={collection.href}
                className="group relative aspect-[4/3] overflow-hidden bg-muted"
              >
                <img
                  src={collection.image}
                  alt={collection.title}
                  loading="lazy"
                  className="editorial-image h-full w-full object-cover group-hover:scale-[1.035]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_oklab,var(--ink)_84%,transparent),transparent_60%)]" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-primary-foreground">
                  <h3 className="font-display text-3xl">{collection.title}</h3>
                  <p className="mt-1 text-xs text-primary-foreground/75">{collection.copy}</p>
                  <ArrowLink light />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose NOVIXA */}
      <section id="values" className="page-shell py-20">
        <div className="mb-12 text-center">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-rosewood">
            The NOVIXA Standard
          </p>
          <h2 className="font-display text-4xl md:text-5xl">Why Choose NOVIXA</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Sparkles,
              title: "Premium Quality",
              copy: "Only the best for you. Clean formulations and long-lasting notes.",
            },
            {
              icon: Gem,
              title: "Curated Selection",
              copy: "Trendy & timeless pieces crafted to complement everyday rituals.",
            },
            {
              icon: ShieldCheck,
              title: "Affordable Luxury",
              copy: "Beauty for everyone. Direct pricing without compromise on craftsmanship.",
            },
            {
              icon: UsersRound,
              title: "Trusted by Thousands",
              copy: "Real people. Real love. Thousands of verified 5-star experiences.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="border border-border bg-card/60 p-7 text-center transition-colors hover:border-rosewood/40 hover:bg-card"
            >
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-blush/30 text-rosewood">
                <item.icon size={20} />
              </div>
              <h3 className="font-display text-xl">{item.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Scent Concierge Quiz Promo */}
      <section className="page-shell pb-20">
        <div className="relative overflow-hidden border border-border bg-sand/30 dark:bg-card p-8 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rosewood/10 text-rosewood dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.25em]">
              <Sparkles size={12} className="text-amber-500" />
              <span>Interactive Scent Concierge</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl text-foreground">
              Not Sure Which Fragrance Fits Your Aura?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Take our 2-minute olfactive consultation. Answer 4 sensory questions to reveal your
              personalized signature fragrance and complementary evening pairing.
            </p>
          </div>
          <Button
            asChild
            className="shrink-0 rounded-none bg-ink text-white hover:bg-black px-8 py-6 text-[10px] font-semibold tracking-[0.16em] uppercase shadow-md"
          >
            <Link href="/scent-finder" className="flex items-center gap-2">
              <span>Begin Scent Quiz</span>
              <ArrowRight size={13} />
            </Link>
          </Button>
        </div>
      </section>

      {/* Customer Testimonial */}
      <section id="reviews" className="page-shell pb-20">
        <div className="relative overflow-hidden bg-ink p-10 text-primary-foreground md:p-16">
          <div className="mb-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-champagne">
              Testimonials
            </p>
            <h2 className="mt-2 font-display text-4xl">What Our Customers Say</h2>
          </div>
          <blockquote className="border border-primary-foreground/15 p-8 md:p-10">
            <p className="font-display text-xl leading-relaxed md:text-2xl">
              “Absolutely love the products! The perfume lasts all day and the makeup bundle is
              perfect. Highly recommend NOVIXA!”
            </p>
            <footer className="mt-5 text-[10px] uppercase tracking-[0.15em] text-champagne">
              — Ayesha K. · Verified Buyer
            </footer>
          </blockquote>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="relative min-h-[390px] overflow-hidden bg-ink text-primary-foreground">
        <img
          src="/images/novixa-editorial.jpg"
          alt="NOVIXA beauty editorial"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-left"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_20%,color-mix(in_oklab,var(--ink)_42%,transparent)_48%,var(--ink)_78%)]" />
        <div className="page-shell relative flex min-h-[390px] items-center justify-end py-16">
          <NewsletterForm />
        </div>
      </section>
    </main>
  );
}
