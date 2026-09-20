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
              Men
            </Link>
            <Link href="/women" className="hover:text-white transition-colors">
              Women
            </Link>
            <Link href="/bundles" className="hover:text-white transition-colors">
              Bundles
            </Link>
            <Link href="/admin/login" className="hover:text-white transition-colors pt-2 text-[10px] text-primary-foreground/40">
              Admin Portal
            </Link>
          </div>
        </div>
        <div>
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-champagne">
            Customer Care
          </p>
          <p className="mt-4 text-xs leading-6 text-primary-foreground/60">
            Complimentary shipping on orders above Rs. 5,000. For custom orders, fragrance consultations, or inquiries:
          </p>
          <p className="mt-2 text-xs font-medium text-primary-foreground/80">hello@novixa.co</p>
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
