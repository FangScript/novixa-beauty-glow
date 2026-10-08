import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, Eye, FileText, UserCheck, HelpCircle } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";

const baseUrl = "https://www.novixaretail.com";

export const metadata: Metadata = {
  title: "Privacy Policy | UK GDPR & Data Protection | NOVIXA",
  description:
    "Read the official NOVIXA UK Privacy Policy. Learn how we protect your personal data in accordance with the UK GDPR and Data Protection Act 2018.",
  alternates: {
    canonical: `${baseUrl}/privacy`,
    languages: {
      "en-GB": `${baseUrl}/privacy`,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: `${baseUrl}/privacy`,
    siteName: "NOVIXA UK",
    title: "Privacy Policy | UK GDPR Compliance | NOVIXA",
    description:
      "Transparency, security, and integrity in handling your personal data across the United Kingdom.",
  },
};

export default function PrivacyPage() {
  const sections = [
    {
      icon: ShieldCheck,
      title: "1. Who We Are (Data Controller)",
      content: (
        <>
          <p>
            NOVIXA Retail Ltd (&ldquo;NOVIXA&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
            &ldquo;our&rdquo;) is a luxury fragrance and beauty retailer registered in the United
            Kingdom, operating from our atelier in Mayfair, London.
          </p>
          <p className="mt-2">
            For the purposes of the <strong>UK General Data Protection Regulation (UK GDPR)</strong>{" "}
            and the <strong>Data Protection Act 2018</strong>, NOVIXA Retail Ltd is the data
            controller responsible for your personal information.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Inquiries:{" "}
            <a href="mailto:novixaretail@gmail.com" className="text-champagne hover:underline">
              novixaretail@gmail.com
            </a>{" "}
            · London, United Kingdom.
          </p>
        </>
      ),
    },
    {
      icon: Eye,
      title: "2. Personal Data We Collect",
      content: (
        <>
          <p>
            We only collect information necessary to fulfill your luxury beauty orders and elevate
            your shopping experience:
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-foreground/80">
            <li>
              <strong>Identity & Contact Data:</strong> Full name, billing address, delivery
              address, email, telephone number.
            </li>
            <li>
              <strong>Transaction & Order Data:</strong> Items purchased, payment confirmation
              tokens, order history, invoice records. (We do not store full credit card numbers;
              transactions are processed by certified PCI-DSS providers).
            </li>
            <li>
              <strong>Technical & Browsing Data:</strong> IP address, browser type, device
              information, and anonymised analytics collected via strictly necessary and analytical
              cookies.
            </li>
            <li>
              <strong>Account & Profile Data:</strong> Saved addresses, wishlist selections, scent
              finder preferences, and customer reviews.
            </li>
          </ul>
        </>
      ),
    },
    {
      icon: Lock,
      title: "3. Lawful Basis for Processing (UK GDPR)",
      content: (
        <>
          <p>
            Under Article 6 of the UK GDPR, we rely on the following legal grounds to process your
            data:
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-foreground/80">
            <li>
              <strong>Performance of a Contract:</strong> Processing and dispatching your orders via
              Royal Mail/DPD, notifying you of shipment tracking, and managing customer support.
            </li>
            <li>
              <strong>Legal Obligation:</strong> Maintaining accounting, VAT, and fiscal records
              mandated by HM Revenue & Customs (HMRC).
            </li>
            <li>
              <strong>Legitimate Interests:</strong> Preventing fraud, enhancing storefront
              security, analyzing performance, and offering relevant beauty recommendations.
            </li>
            <li>
              <strong>Consent:</strong> Sending promotional newsletters and SMS alerts, which you
              can opt out of at any moment.
            </li>
          </ul>
        </>
      ),
    },
    {
      icon: FileText,
      title: "4. Sharing & Disclosure of Information",
      content: (
        <>
          <p>
            We respect your privacy. We never sell, rent, or trade your personal data to third
            parties. We only share information with vetted partners essential for our operations:
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-foreground/80">
            <li>
              <strong>Logistics & Couriers:</strong> Royal Mail, DPD UK, and Hermes for tracked
              parcel delivery.
            </li>
            <li>
              <strong>Payment Gateways:</strong> PayPal, certified card processing networks (PCI-DSS
              compliant).
            </li>
            <li>
              <strong>Cloud Infrastructure:</strong> Secure UK and EU cloud servers with end-to-end
              SSL/TLS encryption.
            </li>
          </ul>
        </>
      ),
    },
    {
      icon: UserCheck,
      title: "5. Your Rights Under UK Data Protection Law",
      content: (
        <>
          <p>
            As a resident of the United Kingdom, you are entitled to comprehensive rights under the
            UK GDPR:
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-foreground/80">
            <li>
              <strong>Right of Access:</strong> Request a copy of the personal data we hold about
              you.
            </li>
            <li>
              <strong>Right to Rectification:</strong> Request correction of incomplete or
              inaccurate data.
            </li>
            <li>
              <strong>Right to Erasure (&ldquo;Right to be Forgotten&rdquo;):</strong> Ask us to
              delete your personal information where no legal override exists.
            </li>
            <li>
              <strong>Right to Object & Restrict Processing:</strong> Object to direct marketing or
              request temporary data freezing.
            </li>
            <li>
              <strong>Right to Data Portability:</strong> Obtain your data in a structured,
              machine-readable format.
            </li>
          </ul>
          <p className="mt-3 text-xs">
            To exercise any of these rights, email our Data Desk at{" "}
            <a
              href="mailto:novixaretail@gmail.com"
              className="text-champagne font-medium hover:underline"
            >
              novixaretail@gmail.com
            </a>
            . We will respond within 30 days without fee.
          </p>
        </>
      ),
    },
    {
      icon: HelpCircle,
      title: "6. Regulatory Authority (ICO Complaints)",
      content: (
        <>
          <p>
            If you believe your data has been handled improperly, we encourage you to contact us
            first so we can resolve the matter immediately.
          </p>
          <p className="mt-2">
            You also have the statutory right to lodge a complaint directly with the UK supervisory
            authority:
          </p>
          <div className="mt-3 rounded-lg border border-border/40 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <strong>Information Commissioner&apos;s Office (ICO)</strong>
            <br />
            Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF
            <br />
            Helpline: 0303 123 1113 · Website:{" "}
            <a
              href="https://ico.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-champagne hover:underline"
            >
              ico.org.uk
            </a>
          </div>
        </>
      ),
    },
  ];

  return (
    <PageShell
      eyebrow="Legal & Transparency"
      title="Privacy Policy"
      copy="Your privacy and data sovereignty are paramount. Learn how NOVIXA protects, manages, and respects your personal information under the UK GDPR."
    >
      <div className="mx-auto max-w-4xl space-y-8 mt-6">
        <div className="rounded-xl border border-champagne/30 bg-champagne/5 p-5 text-xs text-foreground/80 leading-relaxed">
          <strong>Effective Date:</strong> September 2026 · Compliant with the UK Data Protection
          Act 2018 & UK GDPR.
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
                <div className="text-sm leading-relaxed text-foreground/80">{section.content}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-xl border border-border/50 bg-card/60 p-6 text-center text-xs text-muted-foreground">
          <p>
            Have questions regarding our privacy practices? Contact our concierge at{" "}
            <a
              href="mailto:novixaretail@gmail.com"
              className="text-champagne font-medium hover:underline"
            >
              novixaretail@gmail.com
            </a>{" "}
            or view our{" "}
            <Link href="/terms" className="text-champagne font-medium hover:underline">
              Terms & Conditions
            </Link>
            .
          </p>
        </div>
      </div>
    </PageShell>
  );
}
