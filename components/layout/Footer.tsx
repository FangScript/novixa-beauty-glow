import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-primary-foreground/10 bg-ink py-16 text-primary-foreground">
      <div className="page-shell grid gap-10 md:grid-cols-3">
        <div>
          <p className="font-display text-3xl">NOVIXA</p>
          <p className="mt-3 text-xs leading-relaxed text-primary-foreground/60">
            More than beauty. It's a lifestyle. Crafted with luxury notes and premium botanicals.
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-widest text-champagne/80 font-mono">
            Atelier Mayfair, London · Edinburgh
          </p>
        </div>
        <div>
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-champagne">
            Explore
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-xs text-primary-foreground/60">
            <Link href="/shop" className="hover:text-white transition-colors">
              Shop all
            </Link>
            <Link href="/men" className="hover:text-white transition-colors">
              Men's Edit
            </Link>
            <Link href="/women" className="hover:text-white transition-colors">
              Women's Edit
            </Link>
            <Link href="/bundles" className="hover:text-white transition-colors">
              Curated Bundles
            </Link>
            <Link
              href="/admin/login"
              className="hover:text-white transition-colors pt-2 text-[10px] text-primary-foreground/40"
            >
              Admin Portal
            </Link>
          </div>
        </div>
        <div>
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-champagne">
            Customer Care
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-xs text-primary-foreground/60">
            <Link href="/shipping" className="hover:text-white transition-colors">
              Shipping & Delivery Policy
            </Link>
            <Link href="/returns" className="hover:text-white transition-colors">
              14-Day Returns & Exchanges
            </Link>
            <Link href="/contact" className="hover:text-white transition-colors">
              Concierge & Consultations
            </Link>
            <Link href="/account/orders" className="hover:text-white transition-colors">
              Track Order Status
            </Link>
          </div>
          <p className="mt-4 text-[11px] text-primary-foreground/60">
            Concierge:{" "}
            <a href="mailto:concierge@novixa.co.uk" className="text-champagne hover:underline">
              concierge@novixa.co.uk
            </a>
          </p>
        </div>
      </div>
      <div className="page-shell mt-12 border-t border-primary-foreground/10 pt-6 text-[10px] uppercase tracking-wider text-primary-foreground/45 flex flex-col sm:flex-row justify-between items-center gap-3">
        <p>© 2026 NOVIXA. All rights reserved.</p>
        <p>Luxury Perfumes & Beauty Essentials</p>
      </div>
    </footer>
  );
}

export default Footer;
