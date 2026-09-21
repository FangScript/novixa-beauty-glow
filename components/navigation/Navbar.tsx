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
  LogOut,
  Package,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCommerce } from "@/lib/commerce/context";
import { useCustomerAuth } from "@/lib/auth/customer-context";

export function Navbar() {
  const { cartCount } = useCommerce();
  const { user, logout } = useCustomerAuth();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/shop");
    }
    setOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setAccountOpen(false);
    await logout();
    router.push("/");
  };

  const initials = user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : null;

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
            <Link href="/" className="transition-colors hover:text-champagne">Home</Link>
            <Link href="/shop" className="transition-colors hover:text-champagne">Shop</Link>
            <Link href="/men" className="transition-colors hover:text-champagne">Men</Link>
            <Link href="/women" className="transition-colors hover:text-champagne">Women</Link>
            <Link href="/bundles" className="transition-colors hover:text-champagne">Bundles</Link>
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

            {/* Account / User button */}
            <div className="relative hidden sm:block" ref={dropdownRef}>
              {user ? (
                <>
                  <button
                    id="navbar-account-btn"
                    onClick={() => setAccountOpen(!accountOpen)}
                    aria-label="Account menu"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-rosewood/20 text-[11px] font-semibold text-champagne hover:bg-rosewood/30 transition-colors"
                  >
                    {initials}
                  </button>
                  {accountOpen && (
                    <div className="absolute right-0 top-11 z-50 w-48 border border-primary-foreground/10 bg-ink shadow-xl">
                      <div className="border-b border-primary-foreground/10 px-4 py-3">
                        <p className="text-xs font-medium text-primary-foreground truncate">{user.name}</p>
                        <p className="text-[10px] text-primary-foreground/50 truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/account/orders"
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground transition-colors"
                      >
                        <Package size={13} /> My Orders
                      </Link>
                      <Link
                        href="/account"
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-primary-foreground/80 hover:bg-white/10 hover:text-primary-foreground transition-colors"
                      >
                        <UserRound size={13} /> My Account
                      </Link>
                      <button
                        id="navbar-signout"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 border-t border-primary-foreground/10 px-4 py-2.5 text-xs text-primary-foreground/60 hover:bg-white/10 hover:text-primary-foreground transition-colors"
                      >
                        <LogOut size={13} /> Sign Out
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Link href="/login">
                  <Button variant="ghost" size="icon" aria-label="Sign in" className="text-primary-foreground hover:bg-white/10">
                    <UserRound size={18} />
                  </Button>
                </Link>
              )}
            </div>

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
            <Link href="/shop" onClick={() => setOpen(false)} className="py-2.5 uppercase tracking-wider text-xs hover:text-champagne">Shop all</Link>
            <Link href="/men" onClick={() => setOpen(false)} className="py-2.5 uppercase tracking-wider text-xs hover:text-champagne">Men</Link>
            <Link href="/women" onClick={() => setOpen(false)} className="py-2.5 uppercase tracking-wider text-xs hover:text-champagne">Women</Link>
            <Link href="/bundles" onClick={() => setOpen(false)} className="py-2.5 uppercase tracking-wider text-xs hover:text-champagne">Bundles</Link>
            {user ? (
              <>
                <Link href="/account" onClick={() => setOpen(false)} className="py-2.5 uppercase tracking-wider text-xs hover:text-champagne">
                  My Account ({user.name.split(" ")[0]})
                </Link>
                <button
                  onClick={() => { setOpen(false); handleLogout(); }}
                  className="py-2.5 text-left uppercase tracking-wider text-xs text-primary-foreground/60 hover:text-champagne"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="py-2.5 uppercase tracking-wider text-xs hover:text-champagne">
                Sign In
              </Link>
            )}
          </nav>
        )}
      </header>
    </>
  );
}

export default Navbar;


