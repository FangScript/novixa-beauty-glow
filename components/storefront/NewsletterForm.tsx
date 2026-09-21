"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function NewsletterForm() {
  const [subscribed, setSubscribed] = useState(false);

  return (
    <div className="w-full max-w-lg">
      <h2 className="font-display text-4xl md:text-5xl">Get Exclusive Offers</h2>
      <p className="mt-3 text-sm text-primary-foreground/70">
        Be the first to know about new arrivals, special discounts and beauty tips.
      </p>
      <form
        className="mt-7 flex"
        onSubmit={(event) => {
          event.preventDefault();
          setSubscribed(true);
        }}
      >
        <input
          aria-label="Email address"
          required
          type="email"
          placeholder="Enter your email address"
          className="min-w-0 flex-1 border border-primary-foreground/30 bg-ink/60 px-4 text-xs outline-none placeholder:text-primary-foreground/45 focus:border-champagne"
        />
        <Button
          type="submit"
          className="rounded-none bg-champagne text-ink hover:bg-white px-6 text-[9px] font-semibold tracking-[0.14em]"
        >
          SUBSCRIBE
        </Button>
      </form>
      {subscribed && (
        <p className="mt-3 text-xs text-champagne">Welcome to the NOVIXA list.</p>
      )}
    </div>
  );
}
