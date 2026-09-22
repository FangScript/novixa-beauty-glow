import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Instagram,
  Menu,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  UserRound,
  ShieldCheck,
  Gem,
  UsersRound,
  Facebook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/novixa-hero.jpg";
import perfumeCategory from "@/assets/category-perfume.jpg";
import makeupCategory from "@/assets/category-makeup.jpg";
import accessoriesCategory from "@/assets/category-accessories.jpg";
import perfumeProduct from "@/assets/product-perfume.jpg";
import bundleProduct from "@/assets/product-bundle.jpg";
import brushesProduct from "@/assets/product-brushes.jpg";
import spongesProduct from "@/assets/product-sponges.jpg";
import editorialImage from "@/assets/novixa-editorial.jpg";
import { formatPrice, products as catalogue, useCommerce } from "@/lib/commerce";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "NOVIXA | Premium Perfume, Makeup & Beauty" },
      {
        name: "description",
        content: "Shop NOVIXA perfumes, curated makeup bundles and premium beauty accessories.",
      },
      { property: "og:title", content: "NOVIXA | Discover Your Signature Glow" },
      {
        property: "og:description",
        content: "Premium fragrance, makeup and beauty essentials for your signature look.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const categories = [
  { title: "Perfumes", copy: "Scents that tell your story.", image: perfumeCategory },
  { title: "Makeup Bundles", copy: "Everything you need, in one bundle.", image: makeupCategory },
  { title: "Makeup Accessories", copy: "Small tools. Big difference.", image: accessoriesCategory },
];

const collections = [
  { title: "Floral Perfumes", copy: "Fresh. Feminine. Unforgettable.", image: perfumeCategory },
  { title: "Matte Makeup Bundle", copy: "Long-lasting. Flawless. You.", image: makeupCategory },
  { title: "Beauty Accessories", copy: "Tools for a better you.", image: accessoriesCategory },
];

function ArrowLink({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase ${light ? "text-primary-foreground" : "text-foreground"}`}
    >
      Shop now <ArrowRight size={13} />
    </span>
  );
}

function Index() {
  const { cartCount, addToCart, toggleWishlist, isWishlisted } = useCommerce();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const toggleFavorite = (name: string) =>
    setFavorites((items) =>
      items.includes(name) ? items.filter((item) => item !== name) : [...items, name],
    );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="bg-ink py-2 text-center text-[9px] font-medium uppercase text-primary-foreground">
        Complimentary UK Royal Mail delivery on orders above £70
      </div>
      <header className="sticky top-0 z-50 border-b border-primary-foreground/10 bg-ink/95 text-primary-foreground backdrop-blur-md">
        <div className="page-shell flex h-18 items-center justify-between">
          <Link to="/" className="font-display text-2xl">
            NOVIXA
          </Link>
          <nav className="hidden items-center gap-8 text-[11px] md:flex">
            <Link
              to="/"
              className="border-b border-transparent py-2 hover:border-champagne hover:text-champagne"
            >
              Home
            </Link>
            <Link
              to="/shop"
              className="border-b border-transparent py-2 hover:border-champagne hover:text-champagne"
            >
              Shop
            </Link>
            <Link
              to="/men"
              className="border-b border-transparent py-2 hover:border-champagne hover:text-champagne"
            >
              Men
            </Link>
            <Link
              to="/women"
              className="border-b border-transparent py-2 hover:border-champagne hover:text-champagne"
            >
              Women
            </Link>
            <Link
              to="/bundles"
              className="border-b border-transparent py-2 hover:border-champagne hover:text-champagne"
            >
              Bundles
            </Link>
          </nav>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              className="hover:bg-primary-foreground/10"
              asChild
            >
              <Link to="/shop">
                <Search />
              </Link>
            </Button>
            <Link to="/account" className="hidden sm:inline-flex">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Account"
                className="hover:bg-primary-foreground/10"
              >
                <UserRound />
              </Button>
            </Link>
            <Link to="/cart">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Shopping bag with ${cartCount} items`}
                className="relative hover:bg-primary-foreground/10"
              >
                <ShoppingBag />
                <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-blush px-1 text-[9px] text-foreground">
                  {cartCount}
                </span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              className="hover:bg-primary-foreground/10 md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu />
            </Button>
          </div>
        </div>
        {menuOpen && (
          <nav className="page-shell flex flex-col border-t border-primary-foreground/10 py-4 text-sm md:hidden">
            <Link to="/shop" onClick={() => setMenuOpen(false)} className="py-3">
              Shop
            </Link>
            <Link to="/men" onClick={() => setMenuOpen(false)} className="py-3">
              Men
            </Link>
            <Link to="/women" onClick={() => setMenuOpen(false)} className="py-3">
              Women
            </Link>
            <Link to="/bundles" onClick={() => setMenuOpen(false)} className="py-3">
              Bundles
            </Link>
          </nav>
        )}
      </header>

      <section
        id="top"
        className="relative min-h-[600px] overflow-hidden bg-ink text-primary-foreground md:min-h-[690px]"
      >
        <img
          src={heroImage}
          alt="Luxury perfume, lipstick and makeup brushes arranged with rose satin"
          width={1920}
          height={900}
          className="absolute inset-0 h-full w-full object-cover object-[65%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--ink)_0%,color-mix(in_oklab,var(--ink)_88%,transparent)_34%,transparent_72%)]" />
        <div className="page-shell relative flex min-h-[600px] items-center py-20 md:min-h-[690px]">
          <div className="max-w-xl">
            <p className="mb-7 text-[10px] font-semibold uppercase tracking-[0.35em] text-champagne">
              Beauty&nbsp;&nbsp;•&nbsp;&nbsp;Fragrance&nbsp;&nbsp;•&nbsp;&nbsp;You
            </p>
            <h1 className="max-w-lg text-6xl leading-[0.98] sm:text-7xl md:text-[84px]">
              Discover Your
              <br />
              Signature <em className="text-blush">Glow</em>
            </h1>
            <p className="mt-7 max-w-sm text-sm leading-6 text-primary-foreground/70">
              Premium perfumes, curated makeup bundles and must-have accessories — all in one place.
            </p>
            <Button
              variant="luxuryLight"
              size="lg"
              className="mt-8 px-7 text-[10px] font-semibold tracking-[0.12em]"
              asChild
            >
              <Link to="/shop">
                SHOP NOW <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="shop" className="page-shell py-18 md:py-24">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-4xl md:text-5xl">Shop by Category</h2>
          <Link
            to="/shop"
            className="hidden items-center gap-2 text-[10px] font-semibold uppercase sm:flex"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.title}
              to="/shop"
              className="group relative aspect-[4/3] overflow-hidden bg-muted"
            >
              <img
                src={category.image}
                alt={category.title}
                width={900}
                height={680}
                loading="lazy"
                className="editorial-image h-full w-full object-cover group-hover:scale-[1.035]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_oklab,var(--ink)_82%,transparent),transparent_62%)]" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-primary-foreground">
                <h3 className="text-3xl">{category.title}</h3>
                <p className="mt-1 text-xs text-primary-foreground/75">{category.copy}</p>
                <ArrowLink light />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="products" className="page-shell pb-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-rosewood">
              Featured products
            </p>
            <h2 className="text-4xl md:text-5xl">Our Best Sellers</h2>
          </div>
          <Link
            to="/shop"
            className="hidden items-center gap-2 text-[10px] font-semibold uppercase sm:flex"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {catalogue.slice(0, 4).map((product) => (
            <article key={product.id} className="group relative">
              <Link to="/products/$slug" params={{ slug: product.slug }}>
                <div className="relative aspect-square overflow-hidden bg-blush">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    width={700}
                    height={700}
                    loading="lazy"
                    className="editorial-image h-full w-full object-cover group-hover:scale-[1.03]"
                  />
                  {product.badge && (
                    <span className="absolute left-3 top-3 bg-background px-2 py-1 text-[8px] font-semibold tracking-[0.1em]">
                      {product.badge}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 min-h-10 text-lg leading-5">{product.name}</h3>
              </Link>
              <p className="mt-2 text-sm font-semibold">
                {formatPrice(product.salePrice ?? product.price)}
              </p>
              <div className="my-3 flex items-center gap-1" aria-label="5 out of 5 stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={11} fill="currentColor" />
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-none text-[9px] tracking-[0.12em]"
                  onClick={() => addToCart(product.id)}
                >
                  ADD TO CART
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Toggle wishlist"
                  onClick={() => toggleWishlist(product.id)}
                  className={isWishlisted(product.id) ? "text-rosewood" : ""}
                >
                  <Heart fill={isWishlisted(product.id) ? "currentColor" : "none"} />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="collections" className="bg-ink py-20 text-primary-foreground">
        <div className="page-shell">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-champagne">
                Featured collections
              </p>
              <h2 className="text-4xl md:text-5xl">
                Timeless Beauty
                <br />
                <em className="text-blush">in Every Detail</em>
              </h2>
            </div>
            <Link to="/shop" className="hidden items-center gap-2 text-[10px] uppercase md:flex">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {collections.map((item) => (
              <Link
                to="/shop"
                key={item.title}
                className="group overflow-hidden border border-primary-foreground/15"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    width={900}
                    height={680}
                    loading="lazy"
                    className="editorial-image h-full w-full object-cover group-hover:scale-[1.035]"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-2xl">{item.title}</h3>
                  <p className="mt-1 text-xs text-primary-foreground/60">{item.copy}</p>
                  <ArrowLink light />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell py-16">
        <h2 className="text-center text-3xl">Why Choose NOVIXA?</h2>
        <div className="mt-10 grid grid-cols-2 gap-y-10 md:grid-cols-4">
          {[
            [Gem, "Premium Quality", "Only the best for you"],
            [Sparkles, "Curated Selection", "Trendy & timeless."],
            [ShieldCheck, "Affordable Luxury", "Beauty for everyone."],
            [UsersRound, "Trusted by Thousands", "Real people. Real love."],
          ].map(([Icon, title, copy], index) => {
            const BenefitIcon = Icon as typeof Gem;
            return (
              <div
                key={String(title)}
                className={`flex flex-col items-center px-4 text-center ${index ? "md:border-l md:border-border" : ""}`}
              >
                <BenefitIcon strokeWidth={1.2} />
                <h3 className="mt-4 font-sans text-sm font-semibold">{String(title)}</h3>
                <p className="mt-1 text-[10px] text-muted-foreground">{String(copy)}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-ink py-16 text-primary-foreground">
        <div className="page-shell grid items-center gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="text-4xl">What Our Customers Say</h2>
            <div className="mt-6 flex gap-2">
              <Button size="icon" variant="ghost" aria-label="Previous review">
                <ArrowLeft />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Next review">
                <ArrowRight />
              </Button>
            </div>
          </div>
          <blockquote className="border border-primary-foreground/15 p-7 md:p-9">
            <div className="mb-4 flex gap-1 text-champagne">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} size={13} fill="currentColor" />
              ))}
            </div>
            <p className="font-display text-xl leading-relaxed md:text-2xl">
              “Absolutely love the products! The perfume lasts all day and the makeup bundle is
              perfect. Highly recommend NOVIXA!”
            </p>
            <footer className="mt-5 text-[10px] uppercase tracking-[0.15em] text-primary-foreground/60">
              — Ayesha K.
            </footer>
          </blockquote>
        </div>
      </section>

      <section className="relative min-h-[390px] overflow-hidden bg-ink text-primary-foreground">
        <img
          src={editorialImage}
          alt="NOVIXA beauty editorial"
          width={1920}
          height={720}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-left"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_20%,color-mix(in_oklab,var(--ink)_42%,transparent)_48%,var(--ink)_78%)]" />
        <div className="page-shell relative flex min-h-[390px] items-center justify-end py-16">
          <div className="w-full max-w-lg">
            <h2 className="text-4xl md:text-5xl">Get Exclusive Offers</h2>
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
                variant="luxuryLight"
                className="rounded-none px-6 text-[9px] tracking-[0.12em]"
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

      <footer className="border-t border-primary-foreground/10 bg-ink py-14 text-primary-foreground">
        <div className="page-shell grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-3xl">NOVIXA</p>
            <p className="mt-3 text-xs text-primary-foreground/60">
              More than beauty. It's a lifestyle.
            </p>
            <div className="mt-6 flex gap-2">
              <Button variant="ghost" size="icon" aria-label="Instagram">
                <Instagram />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Facebook">
                <Facebook />
              </Button>
            </div>
          </div>
          <div>
            <h3 className="font-sans text-xs font-semibold uppercase">Quick Links</h3>
            <div className="mt-4 flex flex-col gap-2 text-xs text-primary-foreground/60">
              {["Home", "Shop", "Perfumes", "Makeup Bundles", "Accessories"].map((item) => (
                <Link to="/shop" key={item} className="hover:text-champagne">
                  {item}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-sans text-xs font-semibold uppercase">Customer Care</h3>
            <div className="mt-4 flex flex-col gap-2 text-xs text-primary-foreground/60">
              {["Shipping Policy", "Returns & Refunds", "Contact Us"].map((item) => (
                <a
                  href={`mailto:hello@novixa.co?subject=${encodeURIComponent(item)}`}
                  key={item}
                  className="hover:text-champagne"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-sans text-xs font-semibold uppercase">Newsletter</h3>
            <p className="mt-4 text-xs text-primary-foreground/60">
              Get the latest updates and exclusive offers.
            </p>
            <div className="mt-4 flex border-b border-primary-foreground/30">
              <input
                aria-label="Newsletter email"
                type="email"
                placeholder="Enter your email"
                className="min-w-0 flex-1 bg-transparent py-2 text-xs outline-none"
              />
              <Button variant="ghost" size="icon" aria-label="Submit email">
                <ArrowRight />
              </Button>
            </div>
          </div>
        </div>
        <div className="page-shell mt-12 flex flex-col justify-between gap-3 border-t border-primary-foreground/10 pt-6 text-[9px] text-primary-foreground/45 sm:flex-row">
          <span>© 2026 NOVIXA. All rights reserved.</span>
          <span>Privacy Policy&nbsp;&nbsp;&nbsp;&nbsp; Terms & Conditions</span>
        </div>
      </footer>
    </main>
  );
}
