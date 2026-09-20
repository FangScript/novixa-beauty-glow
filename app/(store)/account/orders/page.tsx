import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Order History",
};

export default function AccountOrdersPage() {
  return (
    <PageShell eyebrow="Account" title="Orders">
      <div className="mt-8">
        <EmptyState
          title="No orders yet"
          copy="Your completed NOVIXA orders will appear here along with live tracking and receipts."
          action="/shop"
          actionLabel="EXPLORE FRAGRANCES"
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
