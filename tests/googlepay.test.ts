import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { publicPaymentConfig } from "../lib/payments/public-config";
import {
  resolveGooglePayConfig,
  googlePayErrorDetails,
  googlePayCustomerMessage,
  authorizeGooglePayOrder,
  assertGooglePayOrderCapturable,
  type PayPalGooglePayConfig,
  type PayPalGooglePayHelper,
} from "../lib/payments/googlepay";
import {
  loadWalletScript,
  validatePayPalGooglePayScript,
  withWalletTimeout,
} from "../lib/payments/wallet-script";

const settings = {
  environment: "PRODUCTION",
  merchantId: "BCR2DN6D5L703ZKP",
  paypalMode: "live",
  origin: "https://www.novixaretail.com",
  clientId: "test-public-client-id",
};
const sdkConfig = (): PayPalGooglePayConfig => ({
  merchantInfo: { merchantId: "sdk-merchant-id", merchantName: "NOVIXA UK" },
  allowedPaymentMethods: [
    {
      type: "CARD",
      parameters: {
        allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
        allowedCardNetworks: ["VISA"],
      },
      tokenizationSpecification: {
        type: "PAYMENT_GATEWAY",
        parameters: { gateway: "paypalppcp", gatewayMerchantId: "paypal-seller" },
      },
    },
  ],
});

describe("Google Pay production configuration", () => {
  it("uses PayPal's merchant identity and gateway together despite a different Console ID", () => {
    const config = sdkConfig();
    const resolved = resolveGooglePayConfig(config, settings);
    assert.equal(resolved.merchantInfo.merchantId, config.merchantInfo.merchantId);
    assert.equal(resolved.diagnostics.merchantIdSource, "paypal-sdk");
    assert.equal(resolved.diagnostics.configuredMerchantId, settings.merchantId);
    assert.deepEqual(resolved.merchantInfo, config.merchantInfo);
    assert.equal(resolved.allowedPaymentMethods, config.allowedPaymentMethods);
    assert.equal(resolved.diagnostics.sdkMerchantId, "sdk-merchant-id");
    assert.equal(resolved.diagnostics.origin, settings.origin);
    assert.equal(resolved.diagnostics.gateways[0].gatewayMerchantId, "paypal-seller");
    assert.equal("merchantOrigin" in resolved.merchantInfo, false);
  });
  it("can use the SDK merchant ID if no explicit Google merchant ID is set", () => {
    const resolved = resolveGooglePayConfig(sdkConfig(), { ...settings, merchantId: "" });
    assert.equal(resolved.merchantInfo.merchantId, "sdk-merchant-id");
    assert.equal(resolved.diagnostics.merchantIdSource, "paypal-sdk");
  });
  it("uses the configured Google ID only when the SDK returns no merchant ID", () => {
    const config = sdkConfig();
    delete config.merchantInfo.merchantId;
    const resolved = resolveGooglePayConfig(config, settings);
    assert.equal(resolved.merchantInfo.merchantId, settings.merchantId);
    assert.equal(resolved.diagnostics.merchantIdSource, "environment-fallback");
  });
  it("preserves merchant fields supplied by the SDK without altering the provider response", () => {
    const config = sdkConfig();
    config.merchantInfo.merchantOrigin = "www.novixaretail.com";
    const before = JSON.stringify(config);
    const resolved = resolveGooglePayConfig(config, settings);
    assert.equal(resolved.merchantInfo.merchantOrigin, config.merchantInfo.merchantOrigin);
    assert.equal(JSON.stringify(config), before);
  });
  it("does not invent a merchant ID when production configuration is incomplete", () => {
    const config = sdkConfig();
    config.merchantInfo = {};
    assert.throws(
      () => resolveGooglePayConfig(config, { ...settings, merchantId: "" }),
      /merchant ID is required/,
    );
  });
  it("rejects invalid environment values and mismatched sandbox/live settings", () => {
    for (const environment of ["", "production", "INVALID"]) {
      assert.throws(
        () => resolveGooglePayConfig(sdkConfig(), { ...settings, environment }),
        /must be TEST or PRODUCTION/,
      );
    }
    assert.throws(
      () => resolveGooglePayConfig(sdkConfig(), { ...settings, paypalMode: "sandbox" }),
      /do not match/,
    );
    assert.throws(
      () => resolveGooglePayConfig(sdkConfig(), { ...settings, environment: "TEST" }),
      /do not match/,
    );
  });
  it("omits live merchant identity for sandbox requests", () => {
    const config = resolveGooglePayConfig(sdkConfig(), {
      ...settings,
      environment: "TEST",
      paypalMode: "sandbox",
    });
    assert.equal(config.merchantInfo.merchantId, undefined);
  });
  it("rejects missing client IDs, insecure production origins, and ineligible accounts", () => {
    assert.throws(
      () => resolveGooglePayConfig(sdkConfig(), { ...settings, clientId: " " }),
      /client ID/,
    );
    assert.throws(
      () => resolveGooglePayConfig(sdkConfig(), { ...settings, origin: "http://example.com" }),
      /HTTPS/,
    );
    assert.throws(
      () => resolveGooglePayConfig({ ...sdkConfig(), isEligible: false }, settings),
      /not eligible/,
    );
  });
  it("fails closed when PayPal returns no usable gateway instead of using hardcoded fallback data", () => {
    assert.throws(
      () => resolveGooglePayConfig({ ...sdkConfig(), allowedPaymentMethods: [] }, settings),
      /gateway configuration/,
    );
    const config = sdkConfig();
    delete config.allowedPaymentMethods[0].tokenizationSpecification;
    assert.throws(() => resolveGooglePayConfig(config, settings), /gateway configuration/);
  });
});

describe("Runtime public payment configuration", () => {
  const live = { PAYPAL_CLIENT_ID: "live-public-client", PAYPAL_MODE: "live" };
  it("derives production settings from the runtime server when build-time public values are absent", () => {
    assert.deepEqual(publicPaymentConfig(live), {
      paypalClientId: "live-public-client",
      paypalMode: "live",
      googlePayEnvironment: "PRODUCTION",
      googlePayMerchantId: "",
    });
    assert.equal(
      publicPaymentConfig({ PAYPAL_CLIENT_ID: "sandbox-client", PAYPAL_MODE: "sandbox" })
        .googlePayEnvironment,
      "TEST",
    );
  });
  it("rejects mismatched server/browser client IDs and environments", () => {
    assert.throws(
      () => publicPaymentConfig({ ...live, NEXT_PUBLIC_PAYPAL_CLIENT_ID: "other-account" }),
      /client IDs do not match/,
    );
    assert.throws(
      () => publicPaymentConfig({ ...live, NEXT_PUBLIC_PAYPAL_MODE: "sandbox" }),
      /environments do not match/,
    );
    assert.throws(
      () => publicPaymentConfig({ ...live, NEXT_PUBLIC_GOOGLE_PAY_ENV: "TEST" }),
      /environments do not match/,
    );
  });
  it("rejects missing or invalid server configuration rather than silently selecting sandbox", () => {
    assert.throws(() => publicPaymentConfig({ PAYPAL_MODE: "live" }), /client ID is missing/);
    for (const PAYPAL_MODE of [undefined, "", "production"])
      assert.throws(() => publicPaymentConfig({ ...live, PAYPAL_MODE }), /must be live or sandbox/);
  });
  it("returns only public fields, never provider secrets or unrelated runtime data", () => {
    const env = {
      ...live,
      PAYPAL_CLIENT_SECRET: "private-secret",
      AUTH_SECRET: "auth-private",
      GOOGLE_PAY_MERCHANT_ID: "BCR2DN6D5L703ZKP",
      DATABASE_URL: "private-database",
    };
    const config = publicPaymentConfig(env);
    assert.equal(config.googlePayMerchantId, env.GOOGLE_PAY_MERCHANT_ID);
    assert.deepEqual(Object.keys(config).sort(), [
      "googlePayEnvironment",
      "googlePayMerchantId",
      "paypalClientId",
      "paypalMode",
    ]);
    assert.doesNotMatch(JSON.stringify(config), /private-secret|auth-private|private-database/);
  });
  it("reads changed runtime configuration without carrying over a previous account", () => {
    assert.equal(publicPaymentConfig(live).paypalClientId, "live-public-client");
    assert.equal(
      publicPaymentConfig({ ...live, PAYPAL_CLIENT_ID: "new-public-client" }).paypalClientId,
      "new-public-client",
    );
  });
});

describe("Google Pay diagnostics", () => {
  it("recognizes Google's statusMessage-only merchant errors without claiming approval is pending", () => {
    const error = {
      statusCode: "MERCHANT_ACCOUNT_ERROR",
      statusMessage: "Merchant trouble [OR_BIBED_11]",
    };
    assert.equal(googlePayErrorDetails(error).statusMessage, error.statusMessage);
    assert.equal(googlePayErrorDetails(error).merchantError, true);
    assert.match(googlePayCustomerMessage(error), /GOOGLE_PAY_MERCHANT/);
    assert.doesNotMatch(googlePayCustomerMessage(error), /undergoing verification/);
  });
  it("does not include arbitrary wallet or customer payloads in diagnostics", () => {
    const error = {
      statusCode: "DEVELOPER_ERROR",
      statusMessage: "Invalid merchant configuration",
      paymentMethodData: { token: "wallet-secret" },
      email: "private@example.com",
      secret: "private-key",
    };
    const diagnostic = JSON.stringify(googlePayErrorDetails(error));
    for (const sensitive of ["wallet-secret", "private@example.com", "private-key"]) {
      assert.equal(diagnostic.includes(sensitive), false);
    }
  });
  it("redacts contact/token values in error strings and handles cancellation/null errors", () => {
    const details = googlePayErrorDetails({ message: "private@example.com token=wallet-secret" });
    assert.doesNotMatch(details.message || "", /private@example.com|wallet-secret/);
    assert.equal(googlePayErrorDetails({ statusCode: "CANCELED" }).cancelled, true);
    assert.equal(googlePayErrorDetails(null).merchantError, false);
  });
});

describe("Google Pay authorization before capture", () => {
  function helper(status = "APPROVED"): PayPalGooglePayHelper {
    return {
      config: async () => sdkConfig(),
      confirmOrder: async () => ({ status }),
      initiatePayerAction: async () => ({ liabilityShift: "POSSIBLE" }),
    };
  }
  it("captures exactly once only after PayPal approves", async () => {
    const calls: string[] = [];
    const sdk = helper();
    sdk.confirmOrder = async () => {
      calls.push("confirm");
      return { status: "APPROVED" };
    };
    await authorizeGooglePayOrder(sdk, "ORDER-ID", {}, async () => {
      calls.push("capture");
    });
    assert.deepEqual(calls, ["confirm", "capture"]);
  });
  it("propagates confirmation failure and never calls capture", async () => {
    const sdk = helper();
    sdk.confirmOrder = async () => {
      throw new Error("Confirmation declined");
    };
    let captured = false;
    await assert.rejects(
      authorizeGooglePayOrder(sdk, "ORDER-ID", {}, async () => {
        captured = true;
      }),
      /Confirmation declined/,
    );
    assert.equal(captured, false);
  });
  it("rejects non-approved confirmation states", async () => {
    for (const status of ["CREATED", "PENDING", "VOIDED"]) {
      await assert.rejects(
        authorizeGooglePayOrder(helper(status), "ORDER-ID", {}, async () =>
          assert.fail("must not capture"),
        ),
        /not approved/,
      );
    }
  });
  it("waits for additional authentication before capture", async () => {
    const calls: string[] = [];
    const sdk = helper("PAYER_ACTION_REQUIRED");
    sdk.initiatePayerAction = async () => {
      calls.push("3ds");
      return { liabilityShift: "YES" };
    };
    await authorizeGooglePayOrder(sdk, "ORDER-ID", {}, async () => {
      calls.push("capture");
    });
    assert.deepEqual(calls, ["3ds", "capture"]);
  });
  it("never captures after failed or cancelled additional authentication", async () => {
    const sdk = helper("PAYER_ACTION_REQUIRED");
    sdk.initiatePayerAction = async () => ({ liabilityShift: "NO" });
    await assert.rejects(
      authorizeGooglePayOrder(sdk, "ORDER-ID", {}, async () => assert.fail("must not capture")),
      /not successful/,
    );
    sdk.initiatePayerAction = async () => {
      throw new Error("Cancelled challenge");
    };
    await assert.rejects(
      authorizeGooglePayOrder(sdk, "ORDER-ID", {}, async () => assert.fail("must not capture")),
      /Cancelled/,
    );
  });
});

describe("Server capture guard", () => {
  it("accepts the capture API response when currency exists only on the capture", () => {
    assert.doesNotThrow(() =>
      assertGooglePayOrderCapturable({
        status: "COMPLETED",
        purchase_units: [
          { payments: { captures: [{ status: "COMPLETED", amount: { currency_code: "GBP" } }] } },
        ],
      }),
    );
  });
  it("rejects unapproved orders before capture", () => {
    for (const status of ["CREATED", "PAYER_ACTION_REQUIRED", "VOIDED", "PENDING"]) {
      assert.throws(() => assertGooglePayOrderCapturable({ status }), /approved before capture/);
    }
  });
  it("requires GBP even for the already-completed retry path", () => {
    for (const status of ["APPROVED", "COMPLETED"]) {
      assert.throws(
        () =>
          assertGooglePayOrderCapturable({
            status,
            purchase_units: [{ amount: { currency_code: "USD" } }],
          }),
        /currency must be GBP/,
      );
    }
  });
  it("accepts approved GBP orders and completed GBP captures", () => {
    assert.doesNotThrow(() =>
      assertGooglePayOrderCapturable({
        status: "APPROVED",
        purchase_units: [{ amount: { currency_code: "GBP" } }],
      }),
    );
    assert.doesNotThrow(() =>
      assertGooglePayOrderCapturable({
        status: "COMPLETED",
        purchase_units: [
          {
            amount: { currency_code: "GBP" },
            payments: { captures: [{ status: "COMPLETED", amount: { currency_code: "GBP" } }] },
          },
        ],
      }),
    );
  });
  it("does not report pending or missing captures as successful payments", () => {
    assert.throws(
      () =>
        assertGooglePayOrderCapturable({
          status: "COMPLETED",
          purchase_units: [{ amount: { currency_code: "GBP" } }],
        }),
      /not complete/,
    );
    assert.throws(
      () =>
        assertGooglePayOrderCapturable({
          status: "COMPLETED",
          purchase_units: [
            {
              amount: { currency_code: "GBP" },
              payments: { captures: [{ status: "PENDING", amount: { currency_code: "GBP" } }] },
            },
          ],
        }),
      /not complete/,
    );
  });
});

describe("Wallet SDK loader", () => {
  it("bounds stalled configuration/readiness calls and preserves provider failures", async () => {
    await assert.rejects(
      withWalletTimeout(new Promise(() => {}), "Readiness timed out", 10),
      /Readiness timed out/,
    );
    assert.equal(await withWalletTimeout(Promise.resolve("ready"), "timeout"), "ready");
    await assert.rejects(
      withWalletTimeout(Promise.reject(new Error("Merchant declined")), "timeout"),
      /Merchant declined/,
    );
  });
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  afterEach(() => {
    if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
    else Reflect.deleteProperty(globalThis, "document");
  });
  class Script extends EventTarget {
    src = "";
    async = false;
  }
  function installDocument(scripts: Script[] = []) {
    const document = {
      scripts,
      createElement: () => new Script(),
      head: { appendChild: (script: Script) => scripts.push(script) },
    };
    Object.defineProperty(globalThis, "document", { value: document, configurable: true });
    return document;
  }
  const src =
    "https://www.paypal.com/sdk/js?client-id=public-id&currency=GBP&components=buttons,googlepay,applepay";
  it("reuses an existing in-flight script and waits for its load event", async () => {
    const script = new Script();
    script.src = src;
    const document = installDocument([script]);
    let ready = false;
    const pending = loadWalletScript({ src, isReady: () => ready });
    ready = true;
    script.dispatchEvent(new Event("load"));
    await pending;
    assert.equal(document.scripts.length, 1);
  });
  it("handles an already-loaded SDK even when the load event was missed", async () => {
    const script = new Script();
    script.src = src;
    installDocument([script]);
    await loadWalletScript({ src, isReady: () => true });
  });
  it("concurrent initializations create only one script", async () => {
    const document = installDocument();
    let ready = false;
    const first = loadWalletScript({ src, isReady: () => ready });
    const second = loadWalletScript({ src, isReady: () => ready });
    assert.equal(document.scripts.length, 1);
    ready = true;
    document.scripts[0].dispatchEvent(new Event("load"));
    await Promise.all([first, second]);
  });
  it("reports SDK loading errors instead of leaving initialization spinning", async () => {
    const document = installDocument();
    const pending = loadWalletScript({ src, isReady: () => false });
    document.scripts[0].dispatchEvent(new Event("error"));
    await assert.rejects(pending, /failed to load/);
  });
  it("times out when the SDK never becomes ready", async () => {
    installDocument();
    await assert.rejects(
      loadWalletScript({ src, isReady: () => false, timeoutMs: 10 }),
      /timed out/,
    );
  });
  it("rejects a loaded SDK for a different account/currency or missing Google Pay", async () => {
    assert.throws(
      () => validatePayPalGooglePayScript(src, "other-client", "GBP"),
      /does not match/,
    );
    assert.throws(() => validatePayPalGooglePayScript(src, "public-id", "USD"), /does not match/);
    assert.throws(
      () =>
        validatePayPalGooglePayScript(
          src.replace("buttons,googlepay,applepay", "buttons"),
          "public-id",
          "GBP",
        ),
      /googlepay component/,
    );
    assert.doesNotThrow(() => validatePayPalGooglePayScript(src, "public-id", "GBP"));
    const script = new Script();
    script.src = src;
    installDocument([script]);
    await assert.rejects(
      loadWalletScript({
        src,
        isReady: () => true,
        validateExisting: (url) => validatePayPalGooglePayScript(url, "other-client", "GBP"),
      }),
      /does not match/,
    );
  });
});
