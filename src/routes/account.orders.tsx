import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell, EmptyState } from "@/components/storefront";
export const Route = createFileRoute("/account/orders")({ component: Orders });
function Orders() {
  return (
    <PageShell eyebrow="Account" title="Orders">
      <div className="mt-10">
        <EmptyState
          title="No orders yet"
          copy="Your completed NOVIXA orders will appear here."
          action="/shop"
        />
      </div>
      <Link to="/account" className="mt-5 inline-block text-xs underline">
        Back to account
      </Link>
    </PageShell>
  );
}
