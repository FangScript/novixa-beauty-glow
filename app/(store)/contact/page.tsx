import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { ContactClient } from "./ContactClient";

export const metadata = {
  title: "Concierge & Fragrance Consultation",
  description:
    "Connect with the NOVIXA private concierge for fragrance consultations, order inquiries, and custom luxury gifting.",
};

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Customer Care"
      title="Concierge & Inquiries"
      copy="Whether discovering a new signature accord or requesting order assistance, our dedicated fragrance concierge is here to guide you."
    >
      <Suspense
        fallback={
          <div className="py-20 text-center text-xs text-muted-foreground">
            Loading concierge desk…
          </div>
        }
      >
        <ContactClient />
      </Suspense>
    </PageShell>
  );
}
