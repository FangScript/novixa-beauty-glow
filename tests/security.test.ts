import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  priceCart,
  normalizeCart,
  moneyInPence,
  type PricedProduct,
  type PricedCoupon,
} from "../lib/commerce/pricing";
import {
  createCheckoutIntent,
  verifyCheckoutIntent,
  assertIntentQuote,
  assertProviderAmount,
} from "../lib/payments/checkout-intent";
import { isAllowedMutation, canonicalAppOrigin } from "../lib/security/request";
import { isDatabaseAdmin, customerOrderScope } from "../lib/security/identity";
import { escapeHtml, serializeJsonLd } from "../lib/security/html";
import { createSignedState, verifySignedState, getBaseAppUrl } from "../lib/auth/google-oauth";
import { createHmac } from "node:crypto";
import { orderInput } from "../lib/commerce/order-input";
import { settleProviderOrder } from "../lib/payments/capture-provider";
import { newRecoveryToken, recoveryTokenId } from "../lib/auth/recovery-token";
import { readJson, loginSchema, limitAttempts, ApiError } from "../lib/security/api";
import { validateAppleSessionTarget } from "../lib/payments/apple-validation";
import {
  paymentEventDecision,
  shouldRestock,
  eventCaptureId,
} from "../lib/commerce/payment-events";
import { isReviewMedia } from "../lib/security/review-media";
import { webhookVerificationBody } from "../lib/payments/webhook-payload";

const product: PricedProduct = {
  id: "p1",
  sku: "SKU1",
  name: "Perfume",
  price: 19.99,
  status: "ACTIVE",
  stock: 10,
  isMeasured: false,
};
const items = [{ productId: "p1", quantity: 2 }];
const shipping = { id: "s1", name: "Normal Delivery", price: 4.95, active: true };
const coupon: PricedCoupon = {
  id: "c1",
  active: true,
  type: "PERCENTAGE",
  value: 15,
  minimumOrder: 0,
  usageCount: 0,
  usageLimit: 10,
};

describe("Order request boundaries", () => {
  it("accepts owned review uploads but rejects arbitrary remote URLs and traversal", () => {
    assert.equal(isReviewMedia("/uploads/reviews/review-123-abc12345.jpg"), true);
    assert.equal(
      isReviewMedia(
        "https://storage.example.com/storage/v1/object/public/products/reviews/review-123-abc12345.jpg",
        "https://storage.example.com",
      ),
      true,
    );
    assert.equal(
      isReviewMedia("https://evil.example/review-123-abc12345.jpg", "https://storage.example.com"),
      false,
    );
    assert.equal(isReviewMedia("/uploads/reviews/../../secret.jpg"), false);
    assert.equal(isReviewMedia("data:image/png;base64,abc"), false);
  });
  it("rejects malformed contact types and removes client card data and wallet tokens", () => {
    const parsed = orderInput.parse({
      items,
      couponCode: null,
      paymentMethod: "CARD",
      paymentDetails: {
        paypalOrderId: "ABC123456789",
        number: "4111111111111111",
        token: "secret",
      },
    });
    assert.deepEqual(parsed.paymentDetails, { paypalOrderId: "ABC123456789" });
    assert.throws(() => orderInput.parse({ ...parsed, customer: { email: [] } }));
    assert.throws(() => orderInput.parse({ ...parsed, paymentMethod: "COD" }));
  });
  it("accepts signed OAuth destinations containing periods", () => {
    const previous = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "test-secret-at-least-thirty-two-characters";
    try {
      assert.equal(
        verifySignedState(createSignedState("/account/orders?ref=a.b")).next,
        "/account/orders?ref=a.b",
      );
    } finally {
      if (previous === undefined) delete process.env.AUTH_SECRET;
      else process.env.AUTH_SECRET = previous;
    }
  });
});

describe("Provider capture orchestration", () => {
  const approved = {
    status: "APPROVED",
    purchase_units: [{ amount: { value: "50.00", currency_code: "GBP" } }],
  };
  const completed = {
    status: "COMPLETED",
    purchase_units: [
      {
        payments: {
          captures: [
            {
              id: "CAPTURE",
              status: "COMPLETED",
              amount: { value: "50.00", currency_code: "GBP" },
            },
          ],
        },
      },
    ],
  };
  it("captures an approved exact-value order once", async () => {
    let captures = 0;
    const result = await settleProviderOrder("ORDER", 5000, {
      getOrder: async () => approved,
      captureOrder: async () => {
        captures++;
        return completed;
      },
      pause: async () => {},
    });
    assert.equal(result.capture.id, "CAPTURE");
    assert.equal(captures, 1);
  });
  it("never captures an unapproved or incorrectly priced order", async () => {
    let captures = 0,
      reads = 0;
    const provider = {
      getOrder: async () => {
        reads++;
        return { ...approved, status: "CREATED" };
      },
      captureOrder: async () => {
        captures++;
        return completed;
      },
      pause: async () => {},
    };
    await assert.rejects(settleProviderOrder("ORDER", 5000, provider));
    assert.equal(reads, 5);
    assert.equal(captures, 0);
    await assert.rejects(
      settleProviderOrder("ORDER", 1, { ...provider, getOrder: async () => approved }),
    );
    assert.equal(captures, 0);
  });
  it("returns an already captured order without another capture", async () => {
    await settleProviderOrder("ORDER", 5000, {
      getOrder: async () => completed,
      captureOrder: async () => {
        throw new Error("must not capture");
      },
      pause: async () => {},
    });
  });
  it("reconciles a lost capture response with the provider", async () => {
    let reads = 0,
      captures = 0;
    await settleProviderOrder("ORDER", 5000, {
      getOrder: async () => (++reads === 1 ? approved : completed),
      captureOrder: async () => {
        captures++;
        throw new Error("response lost");
      },
      pause: async () => {},
    });
    assert.equal(reads, 2);
    assert.equal(captures, 1);
  });
  it("rejects a pending or underpaid capture result", async () => {
    await assert.rejects(
      settleProviderOrder("ORDER", 5000, {
        getOrder: async () => approved,
        captureOrder: async () => ({ ...completed, status: "PENDING" }),
        pause: async () => {},
      }),
    );
    await assert.rejects(
      settleProviderOrder("ORDER", 5001, {
        getOrder: async () => completed,
        captureOrder: async () => completed,
        pause: async () => {},
      }),
    );
  });
});

describe("Shared authoritative checkout pricing", () => {
  it("calculates line prices, discount, and shipping in pence", () => {
    const quote = priceCart(items, [product], coupon, shipping);
    assert.equal(quote.subtotal, 39.98);
    assert.equal(quote.discount, 6);
    assert.equal(quote.totalPence, 3893);
    assert.equal(quote.total, 38.93);
  });
  it("aggregates duplicate cart lines before checking stock", () => {
    const merged = normalizeCart([
      { productId: "p1", quantity: 6 },
      { productId: "p1", quantity: 5 },
    ]);
    assert.throws(() => priceCart(merged, [product], null, shipping), /stock/);
  });
  it("rejects negative, nonnumeric, infinite, excessive, or overspecified quantities", () => {
    for (const quantity of [-1, 0, NaN, Infinity, "2", 100, 0.001])
      assert.throws(() => normalizeCart([{ productId: "p1", quantity }]));
  });
  it("allows fractional quantities only for measured products", () => {
    const fractional = normalizeCart([{ productId: "p1", quantity: 0.5 }]);
    assert.throws(() => priceCart(fractional, [product], null, shipping), /whole-number/);
    assert.equal(
      priceCart(fractional, [{ ...product, isMeasured: true }], null, shipping).subtotal,
      10,
    );
  });
  it("rejects inactive products and invalid prices", () => {
    assert.throws(() => priceCart(items, [{ ...product, status: "DRAFT" }], null, shipping));
    for (const value of [-1, Infinity, NaN, "not-money"]) assert.throws(() => moneyInPence(value));
  });
  it("enforces coupon start, expiry, zero limits, and percentage bounds", () => {
    for (const invalid of [
      { startsAt: new Date(2000) },
      { expiresAt: new Date(999) },
      { usageLimit: 0 },
      { usageCount: 10 },
      { value: -1 },
      { value: 101 },
      { active: false },
    ])
      assert.throws(() => priceCart(items, [product], { ...coupon, ...invalid }, shipping, 1000));
  });
  it("grants free standard shipping above the threshold without making express free", () => {
    const cart = [{ productId: "p1", quantity: 4 }];
    assert.equal(priceCart(cart, [product], null, shipping).shipping, 0);
    assert.equal(
      priceCart(cart, [product], null, { ...shipping, name: "Express Delivery", price: 7.95 })
        .shipping,
      7.95,
    );
  });
});

describe("Signed browser-bound checkout capabilities", () => {
  const original = process.env.AUTH_SECRET;
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-only-strong-secret-for-signing-1234567890";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = original;
  });
  it("requires a strong secret rather than using a public default", () => {
    delete process.env.AUTH_SECRET;
    assert.throws(() => createSignedState(), /AUTH_SECRET/);
    assert.throws(() => createCheckoutIntent("ORDER123456", items, 44.93), /AUTH_SECRET/);
  });
  it("accepts its own signed checkout and rejects token tampering, different orders, and expiration", () => {
    const token = createCheckoutIntent("ORDER123456", items, 44.93, 1000);
    const intent = verifyCheckoutIntent(token, "ORDER123456", 2000);
    assertIntentQuote(intent, items, 44.93);
    assert.throws(() => verifyCheckoutIntent(undefined, "ORDER123456"));
    assert.throws(() => verifyCheckoutIntent(token + "0", "ORDER123456", 2000));
    assert.throws(() => verifyCheckoutIntent(token, "OTHER123456", 2000));
    assert.throws(() => verifyCheckoutIntent(token, "ORDER123456", 4000000));
  });
  it("binds payment authorization to exact cart contents and pence", () => {
    const intent = verifyCheckoutIntent(
      createCheckoutIntent("ORDER123456", items, 44.93),
      "ORDER123456",
    );
    assert.throws(() => assertIntentQuote(intent, [{ productId: "other", quantity: 2 }], 44.93));
    assert.throws(() => assertIntentQuote(intent, items, 44.92));
  });
  it("checks captured amount/status rather than trusting an order total or browser capture ID", () => {
    const provider = {
      status: "COMPLETED",
      purchase_units: [
        {
          amount: { value: "44.93", currency_code: "GBP" },
          payments: {
            captures: [
              {
                id: "CAPTURE",
                status: "COMPLETED",
                amount: { value: "0.01", currency_code: "GBP" },
              },
            ],
          },
        },
      ],
    };
    assertProviderAmount(provider, 4493);
    assert.throws(() => assertProviderAmount(provider, 4493, true), /mismatch/);
    provider.purchase_units[0].payments.captures[0].amount.value = "44.93";
    assert.equal(assertProviderAmount(provider, 4493, true)?.id, "CAPTURE");
    provider.purchase_units[0].payments.captures[0].status = "PENDING";
    assert.throws(() => assertProviderAmount(provider, 4493, true), /not complete/);
  });
  it("validates OAuth signatures and rejects future/expired states", () => {
    assert.equal(verifySignedState(createSignedState("/checkout")).valid, true);
    assert.equal(verifySignedState("forged.state").valid, false);
    for (const timestamp of [Date.now() + 60000, Date.now() - 16 * 60000]) {
      const payload = "nonce:" + timestamp + ":%2Faccount";
      // Use the actual OAuth HMAC key to distinguish expiry checks from bad signatures.
      const signature = createHmac("sha256", process.env.AUTH_SECRET!)
        .update(payload)
        .digest("hex");
      assert.equal(verifySignedState(payload + "." + signature).valid, false);
    }
  });
});

describe("Identity, request, and content boundaries", () => {
  it("scopes customer orders by user ID with no email substring or guest email claim", () => {
    assert.deepEqual(customerOrderScope("customer-1"), { userId: "customer-1" });
    assert.equal(isDatabaseAdmin({ role: "CUSTOMER" }), false);
    assert.equal(isDatabaseAdmin(null), false);
    assert.equal(isDatabaseAdmin({ role: "ADMIN" }), true);
  });
  it("rejects cross-origin/sibling-domain writes but permits same-origin and signature-authenticated machine requests", () => {
    const request = (headers: HeadersInit) =>
      new Request("https://www.novixaretail.com/api/cart", { method: "POST", headers });
    assert.equal(isAllowedMutation(request({ origin: "https://evil.example" })), false);
    assert.equal(isAllowedMutation(request({ origin: "https://shop.novixaretail.com" })), false);
    assert.equal(isAllowedMutation(request({ "sec-fetch-site": "cross-site" })), false);
    assert.equal(isAllowedMutation(request({ origin: "https://www.novixaretail.com" })), true);
    assert.equal(isAllowedMutation(request({})), true);
  });
  it("does not derive OAuth redirects from forwarded-host headers", () => {
    const original = process.env.APP_URL;
    process.env.APP_URL = "https://www.novixaretail.com";
    try {
      assert.equal(
        getBaseAppUrl(
          new Request("https://internal.example", {
            headers: { "x-forwarded-host": "evil.example" },
          }),
        ),
        "https://www.novixaretail.com",
      );
    } finally {
      if (original === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = original;
    }
    assert.throws(() =>
      canonicalAppOrigin("https://good.example", "https://user:pass@evil.example"),
    );
  });
  it("prevents closing a JSON-LD script and escapes email HTML", () => {
    const hostile = '</script><script>alert("xss")</script>';
    assert.equal(serializeJsonLd({ name: hostile }).includes("<"), false);
    assert.deepEqual(JSON.parse(serializeJsonLd({ name: hostile })), { name: hostile });
    assert.equal(escapeHtml('<a href="x">&'), "&lt;a href=&quot;x&quot;&gt;&amp;");
  });
  it("uses random recovery tokens that cannot serve as login-session IDs", () => {
    const first = newRecoveryToken(),
      second = newRecoveryToken();
    assert.notEqual(first.token, second.token);
    assert.equal(first.id, recoveryTokenId(first.token));
    assert.match(first.id, /^password-reset:[a-f0-9]{64}$/);
    assert.throws(() => recoveryTokenId("invalid"));
  });
  it("validates credentials and counts the actual streamed JSON body size", async () => {
    const request = (body: string) =>
      new Request("https://www.novixaretail.com/api/auth/login", { method: "POST", body });
    const good = await readJson(
      request(JSON.stringify({ email: " Test@Example.com ", password: "password" })),
      loginSchema,
    );
    assert.equal(good.email, "test@example.com");
    await assert.rejects(readJson(request("{bad}"), loginSchema), /Invalid JSON/);
    await assert.rejects(
      readJson(request(JSON.stringify({ email: [], password: "a" })), loginSchema),
      /Invalid request/,
    );
    await assert.rejects(
      readJson(request("x".repeat(100)), z.unknown(), 10),
      (error: unknown) => error instanceof ApiError && error.status === 413,
    );
  });
  it("bounds credential attempts and resets the fixed window", () => {
    const key = "test-account-rate-limit";
    limitAttempts(key, 2, 1000);
    limitAttempts(key, 2, 1000);
    assert.throws(
      () => limitAttempts(key, 2, 1000),
      (error: unknown) => error instanceof ApiError && error.status === 429,
    );
    assert.doesNotThrow(() => limitAttempts(key, 2, 62000));
  });
  it("only allows HTTPS Apple merchant validation on documented gateway hosts/paths", () => {
    assert.equal(
      validateAppleSessionTarget("https://apple-pay-gateway.apple.com/paymentservices/startSession")
        .hostname,
      "apple-pay-gateway.apple.com",
    );
    for (const url of [
      "http://apple-pay-gateway.apple.com/paymentservices/startSession",
      "https://apple-pay-gateway.apple.com.evil.example/paymentservices/startSession",
      "https://127.0.0.1/paymentservices/startSession",
      "https://apple-pay-gateway.apple.com:8443/paymentservices/startSession",
      "https://apple-pay-gateway.apple.com/other",
      "https://user:pass@apple-pay-gateway.apple.com/paymentservices/startSession",
    ])
      assert.throws(() => validateAppleSessionTarget(url));
  });
});

describe("Webhook lifecycle and inventory rules", () => {
  it("preserves the original event bytes in PayPal signature postback verification", () => {
    const raw = '{ "summary": "payment",\n "id" : "WH-123", "resource" : {"id":"CAPTURE12345"} }';
    const body = webhookVerificationBody({ webhook_id: "APPWEBHOOK" }, raw);
    assert.ok(body.includes('"webhook_event":' + raw));
    assert.deepEqual(JSON.parse(body).webhook_event, JSON.parse(raw));
    assert.throws(() => webhookVerificationBody({}, "[]"));
    assert.throws(() => webhookVerificationBody({}, "{} , {}"));
  });
  it("maps refund up-links to capture IDs without confusing a refund ID with a capture", () => {
    const resource = {
      id: "REFUND123456",
      links: [{ rel: "up", href: "https://api-m.paypal.com/v2/payments/captures/CAPTURE12345" }],
    };
    assert.equal(eventCaptureId("PAYMENT.CAPTURE.REFUNDED", resource), "CAPTURE12345");
    assert.equal(eventCaptureId("PAYMENT.CAPTURE.REFUNDED", { id: "REFUND123456" }), null);
    assert.equal(
      eventCaptureId("PAYMENT.CAPTURE.REFUNDED", {
        links: [{ rel: "up", href: "https://evil.example/v2/payments/captures/CAPTURE12345" }],
      }),
      null,
    );
  });
  it("does not downgrade a completed refund on a late reversal", () => {
    assert.equal(
      paymentEventDecision("PAYMENT.CAPTURE.REVERSED", {
        paymentStatus: "REFUNDED",
        status: "REFUNDED",
        total: 50,
      }).action,
      "ignore",
    );
  });
  const paid = { status: "SHIPPED", paymentStatus: "PAID", total: 50 };
  it("ignores unrelated/stale events instead of downgrading a paid order", () => {
    assert.equal(paymentEventDecision("CUSTOMER.DISPUTE.CREATED", paid).action, "ignore");
    assert.equal(paymentEventDecision("PAYMENT.CAPTURE.DENIED", paid).action, "ignore");
    assert.equal(
      paymentEventDecision("PAYMENT.CAPTURE.COMPLETED", { ...paid, paymentStatus: "REFUNDED" })
        .action,
      "ignore",
    );
  });
  it("checks event money and preserves fulfillment status on completion", () => {
    assert.throws(() =>
      paymentEventDecision("PAYMENT.CAPTURE.COMPLETED", paid, {
        value: "0.01",
        currency_code: "GBP",
      }),
    );
    const result = paymentEventDecision("PAYMENT.CAPTURE.COMPLETED", paid, {
      value: "50",
      currency_code: "GBP",
    });
    assert.equal(result.action === "update" && result.status, "SHIPPED");
  });
  it("records partial refunds for reconciliation instead of falsely declaring full refunds", () => {
    assert.equal(
      paymentEventDecision("PAYMENT.CAPTURE.REFUNDED", paid, { value: "10", currency_code: "GBP" })
        .action,
      "partial-refund",
    );
    const result = paymentEventDecision("PAYMENT.CAPTURE.REFUNDED", paid, {
      value: "50",
      currency_code: "GBP",
    });
    assert.equal(result.action === "update" && result.paymentStatus, "REFUNDED");
  });
  it("does not restock twice when a cancelled order is later refunded", () => {
    assert.equal(shouldRestock("CONFIRMED", "CANCELLED"), true);
    assert.equal(shouldRestock("CANCELLED", "REFUNDED"), false);
    assert.equal(shouldRestock("REFUNDED", "REFUNDED"), false);
    assert.equal(shouldRestock("SHIPPED", "REFUNDED"), false);
    assert.equal(shouldRestock("DELIVERED", "CANCELLED"), false);
    assert.equal(shouldRestock("RETURNED", "REFUNDED"), true);
  });
});
