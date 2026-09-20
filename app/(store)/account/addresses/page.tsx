import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Delivery Addresses",
};

export default function AccountAddressesPage() {
  return (
    <PageShell eyebrow="Account" title="Addresses">
      <div className="mt-8">
        <EmptyState
          title="No saved addresses"
          copy="Add a delivery address during your next checkout and it will be stored here securely for quick re-orders."
          action="/shop"
          actionLabel="START SHOPPING"
        />
      </div>
      <div className="mt-8">
        <Button asChild variant="ghost" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <Link href="/account" className="inline-flex items-center gap-2">
            <ArrowLeft size={14} /> Back to account
          </Link>
        </Button>
      </div>
    </PageShell>
  );
}
