import { Link, useNavigate } from "@tanstack/react-router";
import {
  Heart,
  Search,
  ShoppingBag,
  UserRound,
  Menu,
  Star,
  ArrowRight,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice, type Product, useCommerce } from "@/lib/commerce";

export function StoreHeader() {
  const { cartCount } = useCommerce();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/shop", search: { q: query } });
    setOpen(false);
  };
  return (
    <>
      <div className="bg-ink py-2 text-center text-[9px] font-medium uppercase tracking-[0.14em] text-primary-foreground">
        Complimentary shipping on orders above Rs. 5,000
      </div>
      <header className="sticky top-0 z-50 border-b border-primary-foreground/10 bg-ink/95 text-primary-foreground backdrop-blur-md">
        <div className="page-shell flex h-18 items-center justify-between gap-4">
          <Link to="/" className="font-display text-2xl">
            NOVIXA
          </Link>
          <nav className="hidden items-center gap-7 text-[11px] md:flex">
            <Link to="/">Home</Link>
            <Link to="/shop">Shop</Link>
            <Link to="/men">Men</Link>
            <Link to="/women">Women</Link>
            <Link to="/bundles">Bundles</Link>
          </nav>
          <div className="flex items-center gap-1">
            <form
              onSubmit={submit}
              className="hidden items-center border-b border-primary-foreground/30 px-2 sm:flex"
            >
              <Search size={15} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search products"
                className="w-24 bg-transparent px-2 py-2 text-xs outline-none placeholder:text-primary-foreground/50"
              />
            </form>
            <Link to="/account" className="hidden sm:inline-flex">
              <Button variant="ghost" size="icon" aria-label="Account">
                <UserRound />
              </Button>
            </Link>
            <Link to="/wishlist">
              <Button variant="ghost" size="icon" aria-label="Wishlist">
                <Heart />
              </Button>
            </Link>
            <Link to="/cart">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Shopping bag with ${cartCount} items`}
                className="relative"
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
              className="md:hidden"
              onClick={() => setOpen(!open)}
            >
              <Menu />
            </Button>
          </div>
        </div>
        {open && (
          <nav className="page-shell flex flex-col border-t border-primary-foreground/10 py-3 text-sm md:hidden">
            <Link to="/shop" onClick={() => setOpen(false)} className="py-2">
              Shop all
            </Link>
            <Link to="/men" onClick={() => setOpen(false)} className="py-2">
              Men
            </Link>
            <Link to="/women" onClick={() => setOpen(false)} className="py-2">
              Women
            </Link>
            <Link to="/bundles" onClick={() => setOpen(false)} className="py-2">
              Bundles
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}
export function StoreFooter() {
  return (
    <footer className="mt-20 border-t border-primary-foreground/10 bg-ink py-12 text-primary-foreground">
      <div className="page-shell grid gap-8 md:grid-cols-3">
        <div>
          <p className="font-display text-3xl">NOVIXA</p>
          <p className="mt-3 text-xs text-primary-foreground/60">
            More than beauty. It's a lifestyle.
          </p>
        </div>
        <div>
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em]">Explore</p>
          <div className="mt-4 flex flex-col gap-2 text-xs text-primary-foreground/60">
            <Link to="/shop">Shop all</Link>
            <Link to="/men">Men</Link>
            <Link to="/women">Women</Link>
            <Link to="/bundles">Bundles</Link>
          </div>
        </div>
        <div>
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em]">
            Customer care
          </p>
          <p className="mt-4 text-xs leading-6 text-primary-foreground/60">
            Shipping, returns, and thoughtful support for every order. hello@novixa.co
          </p>
        </div>
      </div>
      <div className="page-shell mt-10 border-t border-primary-foreground/10 pt-5 text-[9px] text-primary-foreground/45">
        © 2026 NOVIXA. All rights reserved.
      </div>
    </footer>
  );
}
export function PageShell({
  children,
  eyebrow,
  title,
  copy,
}: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  copy?: string;
}) {
  return (
    <>
      <StoreHeader />
      <main className="page-shell min-h-[65vh] py-12 md:py-16">
        {eyebrow && (
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-rosewood">
            {eyebrow}
          </p>
        )}
        <h1 className="text-5xl md:text-6xl">{title}</h1>
        {copy && <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">{copy}</p>}
        {children}
      </main>
      <StoreFooter />
    </>
  );
}
export function ProductCard({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, isWishlisted } = useCommerce();
  return (
    <article className="group relative">
      <Link to="/products/$slug" params={{ slug: product.slug }}>
        <div className="relative aspect-square overflow-hidden bg-blush">
          <img
            src={product.images[0]}
            alt={product.name}
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
        {product.salePrice ? (
          <>
            <span className="text-rosewood">{formatPrice(product.salePrice)}</span>{" "}
            <del className="ml-1 text-xs font-normal text-muted-foreground">
              {formatPrice(product.price)}
            </del>
          </>
        ) : (
          formatPrice(product.price)
        )}
      </p>
      <div
        className="my-3 flex items-center gap-1 text-champagne"
        aria-label={`${product.rating} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} size={11} fill="currentColor" />
        ))}
        <span className="ml-1 text-[10px] text-muted-foreground">({product.reviewCount})</span>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 rounded-none text-[9px] tracking-[0.12em]"
          disabled={!product.stock}
          onClick={() => addToCart(product.id)}
        >
          {product.stock ? "ADD TO CART" : "OUT OF STOCK"}
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
  );
}
export function QuantityControl({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center border border-border">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Decrease quantity"
        onClick={() => onChange(quantity - 1)}
      >
        <Minus size={14} />
      </Button>
      <span className="w-8 text-center text-sm">{quantity}</span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Increase quantity"
        onClick={() => onChange(quantity + 1)}
      >
        <Plus size={14} />
      </Button>
    </div>
  );
}
export function EmptyState({
  title,
  copy,
  action = "/shop",
}: {
  title: string;
  copy: string;
  action?: "/shop" | "/";
}) {
  return (
    <div className="border border-border py-20 text-center">
      <h2 className="text-3xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">{copy}</p>
      <Button asChild className="mt-6 rounded-none text-[10px] tracking-[0.14em]">
        <Link to={action}>
          CONTINUE SHOPPING <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
export function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" aria-label="Remove item" onClick={onClick}>
      <X size={16} />
    </Button>
  );
}
