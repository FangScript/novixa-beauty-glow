"use client";
import { useEffect, useState } from "react";
import type { CartItem } from "./context";
export interface CartQuote {
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}
export function useCheckoutQuote(
  items: CartItem[],
  shippingMethodId?: string,
  couponCode?: string,
  paused = false,
) {
  const key = JSON.stringify({
    items: items.map(({ productId, quantity }) => ({ productId, quantity })),
    shippingMethodId,
    couponCode,
  });
  const [result, setResult] = useState<{ key: string; quote?: CartQuote; error?: string }>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((r) => r + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
  useEffect(() => {
    if (paused || !JSON.parse(key).items.length) return;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    setResult(undefined);
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: key,
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to verify prices.");
        if (active) setResult({ key, quote: data });
      })
      .catch((error) => {
        if (active)
          setResult({
            key,
            error:
              error.name === "AbortError"
                ? "Price verification timed out. Please refresh."
                : error.message,
          });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [key, paused, revision]);
  const current = !paused && result?.key === key ? result : undefined;
  return { quote: current?.quote, quoteError: current?.error, quoteReady: Boolean(current?.quote) };
}
