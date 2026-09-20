import { createFileRoute } from "@tanstack/react-router";
import { PageShell, EmptyState } from "@/components/storefront";
export const Route = createFileRoute("/account/addresses")({ component: Addresses });
function Addresses() {
  return (
    <PageShell eyebrow="Account" title="Addresses">
      <div className="mt-10">
        <EmptyState
          title="No saved addresses"
          copy="Add an address during checkout and it will be ready here next time."
          action="/shop"
        />
      </div>
    </PageShell>
  );
}
