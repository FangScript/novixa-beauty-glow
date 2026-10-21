# Google Pay checkout verification

The screenshots show an Active Google website integration and Active Google Pay in
PayPal. These changes fix SDK initialization/authorization defects and make the
actual deployed request observable. They cannot establish whether Google accepts
the production merchant without a post-deployment check.

## Merchant identity and runtime configuration

PayPal's documented integration passes `paypal.Googlepay().config().merchantInfo`
and `allowedPaymentMethods` together to Google. Checkout now preserves that SDK
merchant identity instead of replacing it with a different Google Console ID.
An explicitly configured Google merchant ID is a fallback only when the SDK omits
its merchant ID. A difference between the two IDs is not, by itself, a reason to
override PayPal's response.

Google Pay now reads `/api/payments/config` before SDK initialization. This endpoint
is dynamic and uncached, returns only public SDK settings, and checks the runtime
server/browser PayPal client IDs and modes for consistency. It never returns a
PayPal secret, auth secret, database URL, or wallet token. If Google environment is
unspecified, it derives PRODUCTION from server live mode and TEST from sandbox.
Initialization completes before the button is enabled; the click still opens the
payment sheet without a preliminary network wait.

The cPanel build workflow previously omitted public Google Pay variables and the
public PayPal mode. Those build inputs are now wired, too. Runtime configuration
prevents Google Pay from depending solely on those embedded values.

## Server and build configuration

- Set `NEXT_PUBLIC_PAYPAL_CLIENT_ID` to the public client ID for the same PayPal
  application/account used by the server's `PAYPAL_CLIENT_ID` and secret.
- Pair `NEXT_PUBLIC_GOOGLE_PAY_ENV=PRODUCTION` with
  `NEXT_PUBLIC_PAYPAL_MODE=live` and server `PAYPAL_MODE=live`.
- For sandbox, use `TEST`, `sandbox`, and `sandbox` respectively.
- If a fallback Google merchant ID is needed, use `GOOGLE_PAY_MERCHANT_ID` or
  `NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID` for the Google Console ID
  (`BCR2DN6D5L703ZKP` in the supplied integration). Never use the PayPal seller ID.
  This does not override a merchant ID supplied by PayPal's SDK.
- Use `https://www.novixaretail.com/checkout` for the approved production origin.
- Deploy the updated application once to install this fix. Afterwards, Google Pay
  uses runtime payment settings after a server restart and fresh checkout load.
  Other client components still use build-time `NEXT_PUBLIC_*` values, so rebuild
  after changing those settings. Check Docker build arguments in the chosen pipeline.

## Post-deployment check

1. Open checkout in a fresh browser tab, with browser developer Console open.
2. Select Google Pay. Find `[NOVIXA Google Pay] configuration`.
3. Compare `environment`, `origin`, `merchantId`, `sdkMerchantId`,
   `configuredMerchantId`, `merchantIdSource`, `paypalClientId`, and `gateways` with the intended accounts.
   Google and PayPal merchant IDs are different identifiers. The SDK merchant ID
   may differ; `merchantIdSource` should be `paypal-sdk` when the SDK supplies one.
4. If initialization fails, inspect `[NOVIXA Google Pay] initialization failed`.
   Missing SDK components, mismatched client/currency, environment mismatch,
   ineligibility, and timeouts now stop before a payment button is enabled.
5. With valid checkout details, open the payment sheet. Before authorization, the
   console records `[NOVIXA Google Pay] payment-sheet request` using the same
   resolved configuration supplied to Google. No SDK configuration fetch happens
   between the click and opening the sheet.
6. On failure, inspect `[NOVIXA Google Pay] checkout failed`. `stage`, `statusCode`,
   `statusMessage`, and `message` distinguish Google sheet rejection from PayPal
   authorization/capture or store order finalization failure.

Diagnostics contain public integration identifiers and selected error fields, not
payment payloads, wallet tokens, or customer contact records. Do not copy complete
network requests or wallet payloads into bug reports.

If `OR_BIBED_11` remains after deployment with SDK-provided merchant information in
PRODUCTION, give PayPal technical support the timestamp, public client ID,
SDK merchant ID/gateway details, error fields, and domain. Google support can check
Google-side registration using the actual request identity. Do not assume approval
is pending or resubmit blindly.

This removes verified source/deployment defects. It does not prove that either was
the production error's root cause: the live checkout could not be reached during
this change, and a local fix cannot change Google's account registration records.

Reference: [PayPal direct merchant Google Pay integration](https://developer.paypal.com/v5/google-pay/integrate/).

## Local verification

`npm test` compiles tests with the installed TypeScript dependency and runs Node's
test runner without downloading `tsx`. Google Pay tests cover configuration,
script races/failures/timeouts, errors, confirmation failures, 3DS, and capture
status/currency guards. All provider responses in local tests are mocked; they do
not prove live merchant acceptance or transfer money.

Keep live payment authorization as a separate user-controlled check. If capture
or finalization is uncertain, check the provider transaction before retrying.
