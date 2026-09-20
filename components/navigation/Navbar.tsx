"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Search,
  ShoppingBag,
  UserRound,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCommerce } from "@/lib/commerce/context";

export function Navbar() {
  const { cartCount } = useCommerce();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/shop");
    }
    setOpen(false);
  };

  return (
    <>
      <div className="bg-ink py-2 text-center text-[9px] font-medium uppercase tracking-[0.14em] text-primary-foreground">
        Complimentary shipping on orders above Rs. 5,000
      </div>
      <header className="sticky top-0 z-50 border-b border-primary-foreground/10 bg-ink/95 text-primary-foreground backdrop-blur-md">
        <div className="page-shell flex h-18 items-center justify-between gap-4">
          <Link href="/" className="font-display text-2xl tracking-wide">
            NOVIXA
          </Link>
          <nav className="hidden items-center gap-7 text-[11px] uppercase tracking-[0.15em] md:flex">
            <Link href="/" className="transition-colors hover:text-champagne">
              Home
            </Link>
            <Link href="/shop" className="transition-colors hover:text-champagne">
              Shop
            </Link>
            <Link href="/men" className="transition-colors hover:text-champagne">
              Men
            </Link>
            <Link href="/women" className="transition-colors hover:text-champagne">
              Women
            </Link>
            <Link href="/bundles" className="transition-colors hover:text-champagne">
              Bundles
            </Link>
          </nav>
          <div className="flex items-center gap-1">
            <form
              onSubmit={submit}
              className="hidden items-center border-b border-primary-foreground/30 px-2 sm:flex"
            >
              <Search size={15} className="text-primary-foreground/60" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search products"
                className="w-24 bg-transparent px-2 py-2 text-xs outline-none placeholder:text-primary-foreground/50 focus:w-36 transition-all"
              />
            </form>
            <Link href="/account" className="hidden sm:inline-flex">
              <Button variant="ghost" size="icon" aria-label="Account" className="text-primary-foreground hover:bg-white/10">
                <UserRound size={18} />
              </Button>
            </Link>
            <Link href="/wishlist">
              <Button variant="ghost" size="icon" aria-label="Wishlist" className="text-primary-foreground hover:bg-white/10">
                <Heart size={18} />
              </Button>
            </Link>
            <Link href="/cart">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Shopping bag with ${cartCount} items`}
                className="relative text-primary-foreground hover:bg-white/10"
              >
                <ShoppingBag size={18} />
                {cartCount > 0 && (
                  <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-blush px-1 text-[9px] font-semibold text-foreground">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label={open ? "Close menu" : "Open menu"}
              className="md:hidden text-primary-foreground hover:bg-white/10"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>
        {open && (
          <nav className="page-shell flex flex-col border-t border-primary-foreground/10 py-4 text-sm md:hidden">
            <Link href="/shop" onClick={() => setOpen(false)} className="py-2.5 uppercase tracking-wider text-xs hover:text-champagne">
              Shop all
            </Link>
            <Link href="/men" onClick={() => setOpen(false)} className="py-2.5 uppercase tracking-wider text-xs hover:text-champagne">
              Men
            </Link>
            <Link href="/women" onClick={() => setOpen(false)} className="py-2.5 uppercase tracking-wider text-xs hover:text-champagne">
              Women
            </Link>
            <Link href="/bundles" onClick={() => setOpen(false)} className="py-2.5 uppercase tracking-wider text-xs hover:text-champagne">
              Bundles
            </Link>
            <Link href="/account" onClick={() => setOpen(false)} className="py-2.5 uppercase tracking-wider text-xs hover:text-champagne">
              Account
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}

export default Navbar;
