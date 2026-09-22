import Link from "next/link";
import { RotateCcw, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, QrCode } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "UK Returns & Exchanges Policy",
  description:
    "Review our 14-day hassle-free British return and exchange guarantee on luxury fragrances and beauty formulations.",
};

export default function ReturnsPage() {
  const steps = [
    {
      step: "01",
      title: "Initiate Your Request",
      description:
        "Notify our Mayfair concierge within 14 calendar days of delivery via email (concierge@novixa.co.uk) or directly through our inquiry form with your order reference.",
    },
    {
      step: "02",
      title: "Prepaid Royal Mail QR Code",
      description:
        "Receive a complimentary prepaid Royal Mail Tracked return label or mobile QR code. Simply show the QR code at any local Post Office or Royal Mail Delivery Office—no printer required.",
    },
    {
      step: "03",
      title: "Atelier Verification",
      description:
        "Upon arrival at our UK atelier, our quality team inspects the tamper-evident seal, cellophane, and presentation packaging within 24 hours.",
    },
    {
      step: "04",
      title: "Immediate Refund or Exchange",
      description:
        "Approved returns receive an immediate refund to your original payment card (or Klarna/Clearpay account) within 2–4 working days.",
    },
  ];

  return (
    <PageShell
      eyebrow="Customer Care"
      title="14-Day Returns & Exchanges"
      copy="We take immense pride in the artisanal quality of our formulations. If you are not completely enchanted by your purchase, our Mayfair concierge is here to assist."
    >
      {/* 14-Day Guarantee Banner */}
      <div className="border border-border bg-sand/30 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rosewood/10 text-rosewood">
            <RotateCcw size={22} />
          </div>
          <div>
            <h2 className="font-display text-2xl text-foreground">14-Day British Atelier Return Guarantee</h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-xl">
              Fully compliant with the UK Consumer Rights Act 2015. Unopened, sealed fragrances and beauty rituals in their original presentation boxes are eligible for complimentary return or exchange within 14 days of delivery.
            </p>
          </div>
        </div>
        <Button asChild className="rounded-none bg-ink text-white hover:bg-black text-[10px] tracking-wider py-5 px-6 shrink-0 self-start md:self-auto">
          <Link href="/contact?subject=Returns">
            INITIATE RETURN
          </Link>
        </Button>
      </div>

      {/* 4-Step Process Grid */}
      <div className="mt-14">
        <div className="border-b border-border pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rosewood">
            Seamless British Procedure
          </p>
          <h2 className="mt-1 font-display text-2xl md:text-3xl text-foreground">
            How UK Returns Work
          </h2>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item) => (
            <div
              key={item.step}
              className="border border-border bg-white/50 p-6 relative transition-all hover:bg-white/80 shadow-xs"
            >
              <span className="font-display text-4xl text-rosewood/25 absolute right-4 top-4 font-bold">
                {item.step}
              </span>
              <h3 className="mt-4 font-display text-xl text-foreground pr-8">{item.title}</h3>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Eligibility Guidelines & FAQ */}
      <div className="mt-14 grid gap-8 lg:grid-cols-2">
        <div className="border border-border bg-white/40 p-6 md:p-8">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 size={18} />
            <h3 className="font-display text-2xl text-foreground">Eligible for Return</h3>
          </div>
          <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold">✓</span>
              <span>Unopened fragrances with original cellophane seal and wax crest intact.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold">✓</span>
              <span>Cosmetics, lip glazes, and skincare with unbroken tamper-proof security stickers.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold">✓</span>
              <span>Items received in damaged, leaked, or compromised transit condition.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-700 font-bold">✓</span>
              <span>Incorrect formulation dispatch verified against order confirmation receipt.</span>
            </li>
          </ul>
        </div>

        <div className="border border-border bg-white/40 p-6 md:p-8">
          <div className="flex items-center gap-2 text-[#8f2d18]">
            <AlertTriangle size={18} />
            <h3 className="font-display text-2xl text-foreground">Non-Returnable Conditions</h3>
          </div>
          <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-[#8f2d18] font-bold">✕</span>
              <span>Items where cellophane, tamper seals, or bottle atomizer sprays have been unsealed or pumped.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8f2d18] font-bold">✕</span>
              <span>Bespoke monogrammed editions or custom engraving orders.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8f2d18] font-bold">✕</span>
              <span>Requests submitted after 14 calendar days from documented Royal Mail delivery.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#8f2d18] font-bold">✕</span>
              <span>Promotional discovery vials or gifts separated from parent bundles.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Transit Damage Guarantee */}
      <div className="mt-12 border border-border bg-sand/20 p-6 md:p-8">
        <div className="flex items-center gap-2 text-rosewood">
          <ShieldCheck size={20} />
          <h3 className="font-display text-2xl text-foreground">Damaged in Transit?</h3>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground max-w-3xl">
          In the rare circumstance that your parcel arrives compromised during Royal Mail transit, photograph the damaged outer carton and formulation bottle within 48 hours. Our Mayfair concierge will dispatch an expedited complimentary replacement parcel the same day.
        </p>
      </div>

      {/* Action Footer */}
      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
        <div>
          <p className="text-xs font-medium text-foreground">Need advice on fragrance notes or exchanges?</p>
          <p className="text-xs text-muted-foreground">Our olfactive concierge is available Monday to Friday, 9:00 AM to 5:30 PM GMT.</p>
        </div>
        <div className="flex gap-3">
          <Button asChild className="rounded-none bg-ink text-white hover:bg-black text-[10px] tracking-wider py-5 px-6">
            <Link href="/contact?subject=Returns">
              START A RETURN
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-none text-[10px] tracking-wider py-5 px-6">
            <Link href="/contact" className="inline-flex items-center gap-1.5">
              CONCIERGE HELP <ArrowRight size={13} />
            </Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
