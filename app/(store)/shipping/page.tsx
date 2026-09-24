import Link from "next/link";
import { Truck, ShieldCheck, Clock, Gift, ArrowRight } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "UK Shipping & Delivery Policy",
  description:
    "Learn about NOVIXA luxury British packaging standards, Royal Mail Tracked delivery timelines, and complimentary shipping across the United Kingdom.",
};

export default function ShippingPage() {
  const highlights = [
    {
      icon: Truck,
      title: "Complimentary UK Delivery",
      description:
        "Enjoy complimentary Royal Mail Tracked delivery on all UK orders exceeding £70. For orders under £70, a flat standard logistics fee of £4.95 applies.",
    },
    {
      icon: Clock,
      title: "Next-Day & 48-Hour Timelines",
      description:
        "Orders placed before 2:00 PM GMT are packaged and dispatched same-day. Royal Mail Tracked 24 delivers next working day; Tracked 48 delivers within 2–3 working days.",
    },
    {
      icon: Gift,
      title: "Atelier Eco-Luxury Packaging",
      description:
        "Every fragrance and cosmetic creation is encased in recyclable FSC British paperboard, sealed with our signature wax crest, and delivered in discreet protective parcels.",
    },
    {
      icon: ShieldCheck,
      title: "100% Insured British Transit",
      description:
        "All shipments are fully insured against transit loss or damage. If your parcel arrives compromised, our Mayfair concierge will dispatch an immediate replacement.",
    },
  ];

  const timelines = [
    {
      region: "Mainland England & Wales (London, Manchester, Birmingham, Leeds, Bristol)",
      time: "1 – 2 Working Days (Tracked 24)",
    },
    { region: "Scotland (Edinburgh, Glasgow & Central Belt)", time: "1 – 2 Working Days" },
    { region: "Northern Ireland (Belfast & Regional Districts)", time: "2 – 3 Working Days" },
    {
      region: "Scottish Highlands & Islands, Channel Islands, Isle of Man",
      time: "2 – 4 Working Days",
    },
  ];

  return (
    <PageShell
      eyebrow="Customer Care"
      title="UK Shipping & Delivery"
      copy="Every NOVIXA creation is bottled, inspected, and dispatched with British artisanal precision from our ateliers in Mayfair and Edinburgh."
    >
      {/* 4 Feature Highlights */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="border border-border bg-white/50 p-6 transition-all hover:bg-white/80 shadow-xs"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rosewood/10 text-rosewood">
                <Icon size={20} />
              </div>
              <h3 className="mt-4 font-display text-xl text-foreground">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Transit Schedule Table */}
      <div className="mt-14 border border-border bg-white/40 p-6 md:p-8">
        <div className="border-b border-border pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rosewood">
            British Logistics Matrix
          </p>
          <h2 className="mt-1 font-display text-2xl md:text-3xl text-foreground">
            Estimated Delivery Timelines (Royal Mail & DPD)
          </h2>
        </div>

        <div className="mt-6 divide-y divide-border">
          {timelines.map((row) => (
            <div
              key={row.region}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3.5 text-xs gap-1.5"
            >
              <span className="font-medium text-foreground">{row.region}</span>
              <span className="font-mono text-rosewood font-semibold shrink-0">{row.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping Guidelines & FAQ */}
      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <div className="border border-border bg-white/40 p-6 md:p-8">
          <h3 className="font-display text-2xl text-foreground">Royal Mail & DPD Live Tracking</h3>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Upon carrier collection, an automated dispatch notification containing your 13-character
            Royal Mail or DPD tracking code is sent via email and SMS.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            DPD shipments include a precise 1-hour delivery window notification on the morning of
            arrival. You may also follow your parcel live in your{" "}
            <Link
              href="/account/orders"
              className="text-rosewood underline font-medium hover:text-black"
            >
              NOVIXA Order History
            </Link>{" "}
            with our visual order stepper.
          </p>
        </div>

        <div className="border border-border bg-white/40 p-6 md:p-8">
          <h3 className="font-display text-2xl text-foreground">VAT & Sustainable Despatch</h3>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            All prices on NOVIXA are fully inclusive of 20% United Kingdom VAT. There are no
            additional duties, cross-border customs fees, or unexpected carrier surcharges upon
            arrival.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Our presentation boxes utilize 100% biodegradable soy inks and recycled card inserts,
            upholding the highest standards of British environmental responsibility.
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
        <div>
          <p className="text-xs font-medium text-foreground">
            Need bespoke Saturday or morning courier delivery?
          </p>
          <p className="text-xs text-muted-foreground">
            Contact our Mayfair concierge desk for private expedited logistics.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            asChild
            className="rounded-none bg-ink text-white hover:bg-black text-[10px] tracking-wider py-5 px-6"
          >
            <Link href="/account/orders">TRACK MY PARCEL</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-none text-[10px] tracking-wider py-5 px-6"
          >
            <Link href="/contact" className="inline-flex items-center gap-1.5">
              CONCIERGE INQUIRY <ArrowRight size={13} />
            </Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
