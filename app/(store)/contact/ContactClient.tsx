"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Phone, MapPin, Clock, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomerAuth } from "@/lib/auth/customer-context";

const SUBJECTS = [
  "Fragrance Consultation & Scent Matching",
  "Order Status & Shipping Inquiry",
  "Returns & Exchanges",
  "Custom Gifting & Corporate Orders",
  "Product Ingredients & Skin Sensitivity",
  "General Concierge Inquiry",
];

export function ContactClient() {
  const { user } = useCustomerAuth();
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get("subject");

  const [subject, setSubject] = useState(
    initialSubject && initialSubject.toLowerCase().includes("return")
      ? "Returns & Exchanges"
      : SUBJECTS[0],
  );
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (user) {
      if (!name) setName(user.name || "");
      if (!email) setEmail(user.email || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus({ type: "error", message: "Please complete all required fields." });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          subject,
          orderNumber: orderNumber.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to transmit message.");
      }

      setStatus({
        type: "success",
        message: data.message || "Your inquiry has been received. Our concierge will respond within 24 hours.",
      });

      setMessage("");
      setOrderNumber("");
    } catch (err: any) {
      setStatus({
        type: "error",
        message: err.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
      {/* Inquiry Form */}
      <div className="border border-border bg-white/50 p-6 md:p-10 shadow-xs">
        <h2 className="font-display text-2xl md:text-3xl text-foreground">
          Send a Concierge Inquiry
        </h2>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          Please share your inquiry details below. Our fragrance concierges review and respond to every patron message personally.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* Subject Dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
              Inquiry Subject *
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-2 h-11 w-full border border-border bg-white/70 px-3 text-sm outline-none focus:border-rosewood transition-colors"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Name & Email */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
                Your Full Name *
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Ayesha Kapoor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-11 w-full border border-border bg-white/70 px-3 text-sm outline-none focus:border-rosewood transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
                Email Address *
              </label>
              <input
                required
                type="email"
                placeholder="e.g. ayesha@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-11 w-full border border-border bg-white/70 px-3 text-sm outline-none focus:border-rosewood transition-colors"
              />
            </div>
          </div>

          {/* Phone & Order Number */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2 h-11 w-full border border-border bg-white/70 px-3 text-sm outline-none focus:border-rosewood transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
                Order ID (If Applicable)
              </label>
              <input
                type="text"
                placeholder="e.g. NVX-2026-8492"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="mt-2 h-11 w-full border border-border bg-white/70 px-3 text-sm font-mono uppercase outline-none focus:border-rosewood transition-colors"
              />
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
              Your Message *
            </label>
            <textarea
              required
              rows={5}
              placeholder="How can our atelier assist you today? Feel free to ask about scent notes, longevity, pairing sets, or specific delivery timelines..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-2 w-full border border-border bg-white/70 p-3 text-sm outline-none focus:border-rosewood transition-colors leading-relaxed"
            />
          </div>

          {/* Feedback Status Alert */}
          {status && (
            <div
              className={`flex items-start gap-2 border px-4 py-3 text-xs ${
                status.type === "success"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-[#c9765d] bg-[#fbf0ec] text-[#8f2d18]"
              }`}
            >
              {status.type === "success" ? (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
              )}
              <span>{status.message}</span>
            </div>
          )}

          {/* Submit CTA */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-none bg-ink text-white hover:bg-black px-8 py-6 text-[10px] font-semibold tracking-[0.14em] uppercase"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" /> TRANSMITTING…
                </span>
              ) : (
                "TRANSMIT INQUIRY"
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Concierge Channels & Flagship Information */}
      <div className="space-y-6">
        <div className="border border-border bg-white/40 p-6 md:p-8">
          <div className="flex items-center gap-2 text-rosewood">
            <Sparkles size={16} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">Direct Channels</p>
          </div>
          <h3 className="mt-2 font-display text-2xl text-foreground">Private Concierge Service</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Our atelier specialists are at your service for personal scent matching, corporate gifting curation, and bespoke formulations.
          </p>

          <div className="mt-6 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rosewood/10 text-rosewood">
                <Mail size={14} />
              </div>
              <div>
                <p className="font-semibold text-foreground">Email Concierge</p>
                <a
                  href="mailto:concierge@novixa.co.uk"
                  className="text-rosewood hover:underline font-mono text-[11px]"
                >
                  concierge@novixa.co.uk
                </a>
                <p className="text-[10px] text-muted-foreground mt-0.5">Response within 24 hours</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rosewood/10 text-rosewood">
                <Phone size={14} />
              </div>
              <div>
                <p className="font-semibold text-foreground">Mayfair Concierge Desk</p>
                <p className="font-mono text-foreground text-[11px]">+44 (0) 20 7946 0192</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">London Head Atelier</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rosewood/10 text-rosewood">
                <Clock size={14} />
              </div>
              <div>
                <p className="font-semibold text-foreground">Atelier Service Hours</p>
                <p className="text-muted-foreground text-[11px]">Monday through Friday</p>
                <p className="text-[10px] text-muted-foreground">9:00 AM – 5:30 PM GMT</p>
              </div>
            </div>
          </div>
        </div>

        {/* Flagship Boutiques */}
        <div className="border border-border bg-white/40 p-6 md:p-8">
          <div className="flex items-center gap-2 text-rosewood">
            <MapPin size={16} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">British Ateliers</p>
          </div>
          <h3 className="mt-2 font-display text-2xl text-foreground">Bespoke Salons</h3>

          <div className="mt-4 space-y-3.5 text-xs text-muted-foreground divide-y divide-border">
            <div className="pt-2 first:pt-0">
              <p className="font-semibold text-foreground">Mayfair Flagship Atelier</p>
              <p className="mt-0.5">24 Mount Street, Mayfair, London W1K 2TE</p>
            </div>
            <div className="pt-3.5">
              <p className="font-semibold text-foreground">Edinburgh Fragrance Salon</p>
              <p className="mt-0.5">78 George Street, Edinburgh EH2 2PQ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
