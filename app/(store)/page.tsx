"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Gem,
  Sparkles,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/products/ProductCard";
import { products as catalogue } from "@/lib/products/catalogue";

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

export default function HomePage() {
  const [subscribed, setSubscribed] = useState(false);

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
              size="lg"
              className="mt-8 rounded-none bg-white text-ink hover:bg-champagne px-7 text-[10px] font-semibold tracking-[0.14em]"
              asChild
            >
              <Link href="/shop" className="inline-flex items-center gap-2">
                SHOP NOW <ArrowRight size={14} />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="shop" className="page-shell py-18 md:py-24">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-4xl md:text-5xl">Shop by Category</h2>
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
          {catalogue.slice(0, 4).map((product) => (
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
                Featured collections
              </p>
              <h2 className="font-display text-4xl md:text-5xl">
                Timeless Beauty
                <br />
                <em className="text-blush">in Every Detail</em>
              </h2>
            </div>
            <Link href="/shop" className="hidden items-center gap-2 text-[10px] uppercase tracking-wider text-champagne md:flex">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {collections.map((item) => (
              <Link
                href={item.href}
                key={item.title}
                className="group overflow-hidden border border-primary-foreground/15"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="editorial-image h-full w-full object-cover group-hover:scale-[1.035]"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-2xl">{item.title}</h3>
                  <p className="mt-1 text-xs text-primary-foreground/60">{item.copy}</p>
                  <ArrowLink light />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose NOVIXA */}
      <section className="page-shell py-20">
        <h2 className="font-display text-center text-4xl">Why Choose NOVIXA?</h2>
        <div className="mt-12 grid grid-cols-2 gap-y-10 md:grid-cols-4">
          {[
            [Gem, "Premium Quality", "Only the finest botanicals & oils"],
            [Sparkles, "Curated Selection", "Trendy, authentic & timeless"],
            [ShieldCheck, "Accessible Luxury", "Direct-to-consumer value"],
            [UsersRound, "Trusted by Thousands", "Real reviews & signature lovers"],
          ].map(([Icon, title, copy], index) => {
            const BenefitIcon = Icon as typeof Gem;
            return (
              <div
                key={String(title)}
                className={`flex flex-col items-center px-4 text-center ${
                  index ? "md:border-l md:border-border" : ""
                }`}
              >
                <BenefitIcon strokeWidth={1.2} className="text-rosewood" size={28} />
                <h3 className="mt-4 font-display text-lg font-medium">{String(title)}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground">{String(copy)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Customer Reviews */}
      <section className="bg-ink py-20 text-primary-foreground">
        <div className="page-shell grid items-center gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-champagne">
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
          <div className="w-full max-w-lg">
            <h2 className="font-display text-4xl md:text-5xl">Get Exclusive Offers</h2>
            <p className="mt-3 text-sm text-primary-foreground/70">
              Be the first to know about new arrivals, special discounts and beauty tips.
            </p>
            <form
              className="mt-7 flex"
              onSubmit={(event) => {
                event.preventDefault();
                setSubscribed(true);
              }}
            >
              <input
                aria-label="Email address"
                required
                type="email"
                placeholder="Enter your email address"
                className="min-w-0 flex-1 border border-primary-foreground/30 bg-ink/60 px-4 text-xs outline-none placeholder:text-primary-foreground/45 focus:border-champagne"
              />
              <Button
                type="submit"
                className="rounded-none bg-champagne text-ink hover:bg-white px-6 text-[9px] font-semibold tracking-[0.14em]"
              >
                SUBSCRIBE
              </Button>
            </form>
            {subscribed && (
              <p className="mt-3 text-xs text-champagne">Welcome to the NOVIXA list.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
