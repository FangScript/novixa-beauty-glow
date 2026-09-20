import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/storefront";
export const Route = createFileRoute("/account")({ component: Account });
function Account() {
  return (
    <PageShell
      eyebrow="Your NOVIXA"
      title="Account"
      copy="Your orders, saved details, and beauty preferences in one place."
    >
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Orders", "/account/orders", "Track your purchases"],
          ["Addresses", "/account/addresses", "Manage delivery details"],
          ["Profile", "/account/profile", "Update your information"],
          ["Wishlist", "/wishlist", "Your saved edit"],
        ].map(([title, href, copy]) => (
          <Link
            key={title}
            to={href as never}
            className="border border-border p-6 transition-colors hover:border-rosewood"
          >
            <h2 className="text-2xl">{title}</h2>
            <p className="mt-2 text-xs text-muted-foreground">{copy}</p>
          </Link>
        ))}
      </div>
      <div className="mt-10 border border-border p-6">
        <h2 className="text-2xl">Development account</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Authentication is not connected yet. This account area is ready for a secure provider and
          server-side session when the backend is added.
        </p>
      </div>
    </PageShell>
  );
}
