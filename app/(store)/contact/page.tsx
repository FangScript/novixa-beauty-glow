import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { ContactClient } from "./ContactClient";

const baseUrl = "https://www.novixaretail.com";

export const metadata = {
  title: "Contact Our London Concierge & Customer Care | NOVIXA UK",
  description:
    "Connect with the NOVIXA private concierge in London for bespoke fragrance consultations, UK order tracking, and custom luxury gifting.",
  alternates: {
    canonical: `${baseUrl}/contact`,
    languages: {
      "en-GB": `${baseUrl}/contact`,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: `${baseUrl}/contact`,
    siteName: "NOVIXA UK",
    title: "Contact NOVIXA London Concierge",
    description: "Personalized fragrance consultations and UK client support.",
  },
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
