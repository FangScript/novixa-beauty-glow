"use client";
import { useShipping } from "@/lib/commerce/use-shipping";
import { formatPrice } from "@/lib/products/catalogue";
export function ShippingRates() {
  const { shippingMethods, isLoadingShipping, shippingError, retryShipping } = useShipping();
  if (isLoadingShipping) return <p role="status">Loading current delivery rates...</p>;
  if (shippingError)
    return (
      <p role="alert">
        {shippingError}{" "}
        <button type="button" onClick={retryShipping} className="underline">
          Retry
        </button>
      </p>
    );
  return (
    <div className="space-y-2 text-sm">
      <p>
        Standard delivery is free for UK orders of £70 or more, based on merchandise value after
        bundle pricing and before coupons. Express delivery is charged separately.
      </p>
      <ul>
        {shippingMethods.map((m) => (
          <li key={m.id}>
            <strong>
              {m.name}: {formatPrice(m.price)}
            </strong>{" "}
            — {m.timeframe}
            {/normal|standard/i.test(m.name) ? " (free at £70 or more)" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
