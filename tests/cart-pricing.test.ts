import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { expandBundles, type CheckoutBundle } from "../lib/commerce/bundles";
import { normalizeCart, priceCart, type PricedProduct } from "../lib/commerce/pricing";
import { resolveApplePayConfig } from "../lib/payments/applepay";
import { validatePayPalGooglePayScript } from "../lib/payments/wallet-script";
const a: PricedProduct = {
  id: "a",
  name: "A",
  sku: "A",
  status: "ACTIVE",
  price: 40,
  salePrice: 30,
  stock: 10,
  isMeasured: false,
};
const b: PricedProduct = { ...a, id: "b", name: "B", price: 20, salePrice: null };
const bundle: CheckoutBundle = {
  id: "kit",
  name: "Kit",
  slug: "kit",
  status: "ACTIVE",
  price: 35,
  items: [
    { productId: "a", quantity: 1, product: a },
    { productId: "b", quantity: 1, product: b },
  ],
};
const shipping = { name: "Normal Delivery", price: 4.95, active: true };
function quote(lines: unknown, bundles = [bundle], products = [a, b]) {
  const expanded = expandBundles(normalizeCart(lines), bundles);
  return priceCart(expanded.items, products, null, shipping, Date.now(), expanded.adjustmentPence);
}
describe("bundle and cart pricing", () => {
  it("charges the advertised bundle price instead of the component prices", () => {
    const result = quote([{ productId: "bundle:kit", quantity: 1 }]);
    assert.equal(result.merchandiseSubtotal, 35);
    assert.equal(result.total, 39.95);
    assert.equal(result.discount, 15);
    assert.equal(result.lineItems.length, 2);
  });
  it("aggregates bundle and standalone demand for stock validation", () => {
    assert.throws(
      () =>
        quote([
          { productId: "bundle:kit", quantity: 6 },
          { productId: "a", quantity: 5 },
        ]),
      /stock/,
    );
  });
  it("applies free standard shipping to the actual bundle price", () => {
    assert.equal(quote([{ productId: "bundle:kit", quantity: 2 }]).shipping, 0);
    assert.equal(quote([{ productId: "bundle:kit", quantity: 1 }]).shipping, 4.95);
  });
  it("does not apply standard free shipping to express delivery", () => {
    assert.equal(
      priceCart([{ productId: "a", quantity: 3 }], [a], null, {
        ...shipping,
        name: "Express Delivery",
        price: 7.95,
      }).shipping,
      7.95,
    );
  });
  it("applies coupons after bundle pricing", () => {
    const x = expandBundles([{ productId: "bundle:kit", quantity: 1 }], [bundle]);
    const result = priceCart(
      x.items,
      [a, b],
      {
        id: "coupon",
        type: "PERCENTAGE",
        value: 10,
        minimumOrder: 0,
        active: true,
        usageLimit: null,
        usageCount: 0,
      },
      shipping,
      Date.now(),
      x.adjustmentPence,
    );
    assert.equal(result.couponDiscount, 3.5);
    assert.equal(result.total, 36.45);
  });
  it("preserves penny totals when bundles share fractional components", () => {
    const measured = { ...a, price: 0.03, salePrice: null, isMeasured: true };
    const one = {
      ...bundle,
      id: "one",
      price: 0.01,
      items: [{ productId: "a", quantity: 0.5, product: measured }],
    };
    const two = { ...one, id: "two" };
    const result = quote(
      [
        { productId: "bundle:one", quantity: 1 },
        { productId: "bundle:two", quantity: 1 },
      ],
      [one, two],
      [measured],
    );
    assert.equal(result.merchandiseSubtotal, 0.02);
  });
  it("rejects inactive, missing, empty and fractional bundles", () => {
    for (const bundles of [[], [{ ...bundle, status: "DRAFT" }], [{ ...bundle, items: [] }]])
      assert.throws(() => quote([{ productId: "bundle:kit", quantity: 1 }], bundles), /available/);
    assert.throws(() => quote([{ productId: "bundle:kit", quantity: 0.5 }]), /whole-number/);
  });
  it("rejects unavailable components", () => {
    assert.throws(
      () =>
        quote(
          [{ productId: "bundle:kit", quantity: 1 }],
          [bundle],
          [{ ...a, status: "ARCHIVED" }, b],
        ),
      /available/,
    );
  });
  it("ignores injected browser prices and uses current sale prices", () => {
    assert.equal(quote([{ productId: "a", quantity: 1, price: 0.01 }]).merchandiseSubtotal, 30);
  });
  it("preserves bundle prices even above individually discounted components", () => {
    assert.equal(
      quote([{ productId: "bundle:kit", quantity: 1 }], [{ ...bundle, price: 60 }]).total,
      64.95,
    );
  });
});
describe("Apple Pay merchant initialization", () => {
  it("rejects ineligible and incomplete merchant configurations", () => {
    assert.throws(() => resolveApplePayConfig({ isEligible: false }), /not enabled/);
    assert.throws(
      () => resolveApplePayConfig({ isEligible: true, countryCode: "GB" }),
      /incomplete/,
    );
  });
  it("uses the merchant country, networks and capabilities supplied by PayPal", () => {
    const settings = {
      countryCode: "GB",
      merchantCapabilities: ["supports3DS"],
      supportedNetworks: ["visa"],
    };
    assert.deepEqual(resolveApplePayConfig({ isEligible: true, ...settings }), settings);
  });
  it("rejects a stale client ID and SDK missing Apple Pay", () => {
    assert.throws(
      () =>
        validatePayPalGooglePayScript(
          "https://www.paypal.com/sdk/js?client-id=old&currency=GBP&components=applepay",
          "new",
          "GBP",
          "applepay",
        ),
      /does not match/,
    );
    assert.throws(
      () =>
        validatePayPalGooglePayScript(
          "https://www.paypal.com/sdk/js?client-id=new&currency=GBP&components=buttons",
          "new",
          "GBP",
          "applepay",
        ),
      /applepay/,
    );
    assert.doesNotThrow(() =>
      validatePayPalGooglePayScript(
        "https://www.paypal.com/sdk/js?client-id=new&currency=GBP&components=buttons,googlepay,applepay",
        "new",
        "GBP",
        "applepay",
      ),
    );
  });
});
