"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Check, Copy, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type WelcomeOffer = {
  code: string;
  discount: string;
  terms: string;
};

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [welcomeOffer, setWelcomeOffer] = useState<WelcomeOffer | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to subscribe. Please try again.");
      }

      setWelcomeOffer(data.welcomeOffer || {
        code: "WELCOME10",
        discount: "10% off",
        terms: "Valid on orders above £40",
      });
      setEmail("");
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!welcomeOffer) return;
    navigator.clipboard.writeText(welcomeOffer.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full max-w-lg">
      <div className="flex items-center gap-2 text-champagne">
        <Sparkles size={16} />
        <span className="text-[10px] uppercase font-semibold tracking-[0.25em]">
          Exclusive Privilege
        </span>
      </div>
      <h2 className="mt-2 font-display text-4xl md:text-5xl text-primary-foreground">
        Join the Inner Circle
      </h2>
      <p className="mt-3 text-sm text-primary-foreground/75 leading-relaxed">
        Be the first to experience private formulation releases, limited edition accords, and receive 10% off your inaugural ritual.
      </p>

      {welcomeOffer ? (
        <div className="mt-6 border border-champagne/40 bg-ink/80 p-5 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 text-champagne">
            <Check size={16} />
            <p className="text-xs font-semibold uppercase tracking-wider">
              Private Offer Unlocked
            </p>
          </div>
          <p className="mt-1 text-xs text-primary-foreground/80">
            Welcome to NOVIXA. Use your personal invitation voucher at checkout:
          </p>

          <div className="mt-3 flex items-center justify-between border border-dashed border-champagne/50 bg-black/40 px-3.5 py-2.5">
            <div>
              <span className="font-mono text-base font-bold tracking-widest text-champagne">
                {welcomeOffer.code}
              </span>
              <span className="ml-2 text-[10px] uppercase tracking-wider text-primary-foreground/60">
                ({welcomeOffer.discount})
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-champagne hover:text-white transition-colors"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between text-[10px] text-primary-foreground/60">
            <span>{welcomeOffer.terms}</span>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1 font-semibold text-champagne hover:underline"
            >
              Shop Catalogue <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      ) : (
        <form className="mt-7 flex flex-col sm:flex-row gap-2 sm:gap-0" onSubmit={handleSubmit}>
          <input
            aria-label="Email address"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="min-w-0 flex-1 border border-primary-foreground/30 bg-ink/60 px-4 py-3 text-xs outline-none placeholder:text-primary-foreground/45 focus:border-champagne text-primary-foreground transition-colors"
          />
          <Button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="rounded-none bg-champagne text-ink hover:bg-white px-7 py-3 text-[10px] font-semibold tracking-[0.14em] uppercase disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Unlocking…
              </span>
            ) : (
              "SUBSCRIBE"
            )}
          </Button>
        </form>
      )}

      {errorMessage && (
        <p className="mt-2.5 text-xs text-[#e87a6b]">{errorMessage}</p>
      )}
    </div>
  );
}
