"use client";
import { useEffect, useState, useCallback } from "react";
export type ShippingOption = {
  id: string;
  name: string;
  price: number;
  timeframe: string;
  description?: string | null;
  isDefault: boolean;
};
const key = "novixa_shipping_method_id";
const eventName = "novixa-shipping-change";
export function useShipping() {
  const [shippingMethods, setMethods] = useState<ShippingOption[]>([]);
  const [selectedId, setId] = useState("");
  const [isLoadingShipping, setLoading] = useState(true);
  const [shippingError, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const retryShipping = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    const sync = (event?: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === "string") {
        setId(event.detail);
        return;
      }
      try {
        setId(localStorage.getItem(key) || "");
      } catch {}
    };
    sync();
    window.addEventListener(eventName, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(eventName, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch("/api/shipping-methods", { cache: "no-store", signal: AbortSignal.timeout(15000) })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success || !data.methods?.length)
          throw new Error("Delivery options are unavailable. Please retry.");
        if (active) setMethods(data.methods);
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  const selectedShippingMethod =
    shippingMethods.find((m) => m.id === selectedId) ||
    shippingMethods.find((m) => m.isDefault) ||
    shippingMethods[0];
  const setSelectedShippingMethod = (method: ShippingOption) => {
    setId(method.id);
    try {
      localStorage.setItem(key, method.id);
    } catch {}
    window.dispatchEvent(new CustomEvent(eventName, { detail: method.id }));
  };
  return {
    shippingMethods,
    selectedShippingMethod,
    setSelectedShippingMethod,
    isLoadingShipping,
    shippingError,
    retryShipping,
  };
}
