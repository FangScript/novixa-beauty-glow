import type { Metadata } from "next";
import Link from "next/link";
import { Scale, ShoppingBag, Truck, RotateCcw, AlertCircle, ShieldAlert } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";

const baseUrl = "https://www.novixaretail.com";

export const metadata: Metadata = {
  title: "Terms & Conditions | UK Consumer Rights & Sales Terms | NOVIXA",
  description:
    "Read the official Terms and Conditions of Sale for NOVIXA UK. Governed by the laws of England and Wales and the UK Consumer Rights Act 2015.",
  alternates: {
    canonical: `${baseUrl}/terms`,
    languages: {
      "en-GB": `${baseUrl}/terms`,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: `${baseUrl}/terms`,
    siteName: "NOVIXA UK",
    title: "Terms & Conditions of Sale | NOVIXA UK",
    description: "Legal terms, consumer rights, and purchase conditions for NOVIXA in the UK.",
  },
};

export default function TermsPage() {
  const sections = [
    {
      icon: Scale,
      title: "1. Agreement & Company Details",
      content: (
        <>
          <p>
            These Terms and Conditions govern your use of the website <strong>novixaretail.com</strong> and
            any purchases made from <strong>NOVIXA Retail Ltd</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;),
            operating from our Mayfair atelier, London, United Kingdom.
          </p>
          <p className="mt-2">
            By browsing our website or placing an order, you agree to be bound by these terms, our{" "}
            <Link href="/privacy" className="text-champagne hover:underline">
              Privacy Policy
            </Link>, and our{" "}
            <Link href="/returns" className="text-champagne hover:underline">
              Returns Policy
            </Link>.
          </p>
        </>
      ),
    },
    {
      icon: ShoppingBag,
      title: "2. Orders & Contract Formation",
      content: (
        <>
          <p>
            All orders placed through our storefront are subject to acceptance and product availability.
            When you complete checkout, you will receive an automatic Order Confirmation email.
          </p>
          <p className="mt-2">
            A legally binding contract of sale is formed when we dispatch your parcel and issue your
            Royal Mail / courier dispatch notification with tracking details.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            All prices are quoted in <strong>British Pounds Sterling (£ / GBP)</strong> and include applicable UK Value Added Tax (VAT).
          </p>
        </>
      ),
    },
    {
      icon: Truck,
      title: "3. Delivery & Title Transfer",
      content: (
        <>
          <p>
            We deliver to addresses across England, Wales, Scotland, and Northern Ireland using Royal Mail Tracked and DPD services:
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-foreground/80">
            <li><strong>Complimentary Delivery:</strong> Applicable on all UK orders of £70 or greater.</li>
            <li><strong>Standard Logistics Fee:</strong> £4.95 for orders under £70.</li>
            <li><strong>Dispatch Cutoff:</strong> Orders placed before 2:00 PM GMT on business days are dispatched same-day.</li>
          </ul>
          <p className="mt-2 text-xs">
            Risk and ownership of the goods transfer to you upon physical delivery to your specified address.
          </p>
        </>
      ),
    },
    {
      icon: RotateCcw,
      title: "4. Cancellation Rights & Returns (UK Law)",
      content: (
        <>
          <p>
            Under the <strong>Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013</strong>,
            you have the statutory right to cancel your purchase within 14 days of receiving your goods.
          </p>
          <p className="mt-2">
            <strong>Hygiene & Safety Exclusion:</strong> In accordance with UK law, perfumes, skincare, and cosmetic items can only be returned for a full refund if they remain unopened, unused, in their original packaging with all hygiene seals intact.
          </p>
          <p className="mt-2 text-xs">
            For step-by-step instructions, visit our dedicated{" "}
            <Link href="/returns" className="text-champagne font-medium hover:underline">
              Returns & Exchanges Guide
            </Link>.
          </p>
        </>
      ),
    },
    {
      icon: AlertCircle,
      title: "5. Product Descriptions & Authenticity",
      content: (
        <>
          <p>
            Every NOVIXA creation is authentic, formulated with premium ingredients, and dermatologically tested. We make every reasonable effort to display accords, olfactory pyramids, shades, and dimensions accurately.
          </p>
          <p className="mt-2">
            In the unlikely event that an item received is damaged, defective, or incorrectly supplied, your statutory rights under the <strong>Consumer Rights Act 2015</strong> apply, and we will promptly supply a replacement or full refund.
          </p>
        </>
      ),
    },
    {
      icon: ShieldAlert,
      title: "6. Governing Law & Jurisdiction",
      content: (
        <>
          <p>
            These Terms and Conditions, and any disputes or claims arising out of or in connection with them,
            shall be governed by and construed in accordance with the <strong>laws of England and Wales</strong>.
          </p>
          <p className="mt-2">
            You agree that the courts of England and Wales shall have exclusive jurisdiction to settle any dispute or claim, provided that if you reside in Scotland or Northern Ireland, you may also bring proceedings in your local jurisdiction.
          </p>
        </>
      ),
    },
  ];

  return (
    <PageShell
      eyebrow="Legal & Commercial"
      title="Terms & Conditions"
      copy="Review the commercial conditions and consumer rights governing your purchases with NOVIXA UK. Transparent, fair, and backed by English law."
    >
      <div className="mx-auto max-w-4xl space-y-8 mt-6">
        <div className="rounded-xl border border-champagne/30 bg-champagne/5 p-5 text-xs text-foreground/80 leading-relaxed">
          <strong>Last Updated:</strong> September 2026 · Governed by the Consumer Rights Act 2015 & the laws of England and Wales.
        </div>

        <div className="space-y-6">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div
                key={idx}
                className="rounded-xl border border-border/50 bg-card p-6 shadow-sm transition-all hover:border-champagne/40"
              >
                <div className="flex items-center gap-3 border-b border-border/40 pb-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-champagne/10 text-champagne">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="font-display text-lg font-medium text-foreground">
                    {section.title}
                  </h2>
                </div>
                <div className="text-sm leading-relaxed text-foreground/80">
                  {section.content}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-xl border border-border/50 bg-card/60 p-6 text-center text-xs text-muted-foreground">
          <p>
            Need assistance with these terms or an existing order? Reach our Mayfair concierge at{" "}
            <a href="mailto:novixaretail@gmail.com" className="text-champagne font-medium hover:underline">
              novixaretail@gmail.com
            </a>{" "}
            or view our{" "}
            <Link href="/privacy" className="text-champagne font-medium hover:underline">
              Privacy Policy
            </Link>.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
