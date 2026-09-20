import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";

export const metadata = {
  title: "My Account",
  description: "Manage orders, delivery addresses, and personal details.",
};

export default function AccountPage() {
  return (
    <PageShell
      eyebrow="Your NOVIXA"
      title="Account"
      copy="Your purchases, delivery destinations, and saved beauty preferences in one place."
    >
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Orders", "/account/orders", "Track and review your purchases"],
          ["Addresses", "/account/addresses", "Manage saved delivery destinations"],
          ["Profile", "/account/profile", "Update your personal details"],
          ["Wishlist", "/wishlist", "Your saved signature edit"],
        ].map(([title, href, copy]) => (
          <Link
            key={title}
            href={href}
            className="border border-border bg-white/40 p-6 transition-all hover:border-rosewood hover:bg-white/60"
          >
            <h2 className="font-display text-2xl tracking-tight text-foreground">{title}</h2>
            <p className="mt-2 text-xs text-muted-foreground">{copy}</p>
          </Link>
        ))}
      </div>

      <div className="mt-12 border border-border bg-white/40 p-7">
        <h2 className="font-display text-2xl">Member Account & Security</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Welcome to your member portal. Seamless order tracking, recurring subscriptions, and personalized fragrance recommendations are linked with your email address.
        </p>
      </div>
    </PageShell>
  );
}
