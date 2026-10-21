# Architecture and payment review

Review date: 2026-10-21. These are local source changes, not a deployed release.
This review concentrates on authentication, checkout, payment reconciliation,
customer data access, public submissions, and HTML output. It is not an assurance
that every route, dependency, infrastructure policy, or business workflow is secure.
The managed security scan tooling was unavailable; this is a manual source review
with automated regression tests, not a completed managed scan.

## Implemented boundaries

| Boundary          | Implementation                                            | Result                                                                                                                                        |
| ----------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity          | `lib/auth/session.ts`                                     | Database sessions and database roles authorize requests. User-editable external metadata cannot grant admin access.                           |
| Browser writes    | `middleware.ts`, `lib/security/request.ts`                | Reject cross-origin API writes; webhook authentication uses PayPal signatures. Canonical origin controls OAuth redirects.                     |
| API input         | `lib/security/api.ts`, `lib/commerce/order-input.ts`      | Shared streamed body limits, validation, sanitized failures, and per-process attempt limits on the reviewed public flows.                     |
| Price authority   | `lib/commerce/quote.ts`, `pricing.ts`                     | Provider order creation and store order finalization calculate prices, quantities, stock, discounts, and shipping from the database.          |
| Payment ownership | `lib/payments/checkout-intent.ts`                         | Signed HTTP-only checkout cookie binds a provider order to the cart, exact GBP total, and one-hour expiry.                                    |
| Capture           | `lib/payments/capture-provider.ts`, `capture-checkout.ts` | PayPal and Google Pay capture endpoints share approval, exact captured amount, currency, and retry checks. SDKs perform wallet authorization. |
| Reconciliation    | `app/api/payments/webhook/route.ts`                       | Native PayPal signature verification, event deduplication committed with processing, refund-to-capture lookup, and guarded state transitions. |
| Content           | `lib/security/html.ts`, `review-media.ts`                 | Escape customer text in emails and JSON-LD; review media must match owned upload paths.                                                       |

Supabase remains available for media storage. It is no longer a second independent
authentication authority. Existing Supabase-only sessions must sign in again using
direct Google OAuth or local password recovery. Verify transactional email before
releasing this change. New password recovery uses a hashed, single-use, 15-minute
token and invalidates existing sessions. Registering an existing passwordless user
cannot set that user's password without recovery. A verified Google sign-in revokes
credentials and sessions from an unverified registration before linking it.

Customer order history uses the authenticated database user ID. Entering an email
does not prove ownership of a guest order. Historical guest orders require a future
verified claim flow; they are deliberately not auto-attached by email substring.

## Vulnerabilities and correctness defects addressed

| Finding                                                                                   | Change                                                                                                                  |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Existing passwordless accounts could be claimed by registering a password                 | Refuse duplicate registration; require verified Google sign-in or emailed recovery.                                     |
| External metadata/admin email fallbacks could determine authorization                     | Database roles are the sole authority for administrator sessions.                                                       |
| Customer order access used email matching                                                 | Scope by authenticated user ID only.                                                                                    |
| OAuth callback could accept signed state without its browser cookie                       | Require both matching cookie and valid signed state, verified Google email, and a strong signing secret.                |
| Divergent payment/order calculations                                                      | Shared pricing in integer pence, duplicate cart aggregation, measured quantity rules, and atomic coupon usage checks.   |
| Browser payment references were insufficient proof of payment ownership                   | Require signed checkout capability plus provider lookup and exact completed capture verification.                       |
| Duplicate capture/refund requests                                                         | Stable provider request IDs; capture reads completed provider state after a lost response.                              |
| Webhook replay and stale events could corrupt payment state                               | Atomic event claims and state changes; late denied/reversal events cannot downgrade settled states indiscriminately.    |
| Refund IDs could be mistaken for capture IDs                                              | Resolve related capture IDs or PayPal refund `up` links.                                                                |
| Modified webhook JSON could break signature verification                                  | Preserve the original event JSON inside PayPal verification postbacks.                                                  |
| Refund success could be recorded while the provider was still pending                     | Require completed provider refund; synchronize order/payment records in one database transaction.                       |
| Concurrent cancellation/refund updates could restore inventory twice                      | Optimistic order update and stock adjustments commit together; cancelled-to-refunded does not restock again.            |
| Apple merchant validation accepted unsuitable targets and used ineffective mTLS transport | Exact gateway allowlist, actual HTTPS client certificate transport, time/response limits, and server-configured domain. |
| Client telemetry accepted arbitrary payment/customer objects                              | Bound and whitelist diagnostics, require checkout capability, exclude raw token/error payloads.                         |
| Customer content could break out of JSON-LD/email HTML                                    | Escape script delimiters and customer text.                                                                             |
| Anonymous review identity and unbounded public inputs                                     | Require customer session for review/upload, validate inputs, bound request bodies, rate-limit reviewed flows.           |
| Anonymous contact could modify an existing customer's phone                               | Existing profile data is not changed by contact submissions.                                                            |
| Newsletter subscription could reactivate/reconfigure an existing coupon                   | Preserve existing administrator coupon configuration.                                                                   |
| Email API failure could be reported as successful recovery delivery                       | Check Resend's returned error; delete unused recovery token on delivery failure/simulation.                             |

The inventory guard does not replace a returns workflow: refunds and physical
returns are different business events. Webhook refunds do not restock automatically.
Administrator refunds/cancellations restore stock only before shipping or after an
explicit `RETURNED` status; shipped/delivered goods are not automatically restocked.
Partial physical returns still require a future per-item returns workflow.

## Outstanding payment and release risks

1. **Capture-to-order gap — high priority.** Money can be captured before the store
   order transaction commits. A stock race, expired coupon, database outage, or closed
   tab can leave a captured payment without a saved order. Webhooks currently return
   a retryable error for an unknown order; they cannot reconstruct its missing cart.
   Unique capture IDs prevent duplicate saved payments, but do not close this gap.
   Finalization retries also reprice/recheck stock and can fail after prior success.
2. **Migration history is behind the Prisma schema — release blocker.** The checked-in
   migrations do not establish all schema fields/models currently used, including
   newer identity, shipping, newsletter, webhook, and money changes. Reconcile the
   actual database against a clean migration baseline before a new deployment.
   Never guess the units of legacy integer money or run a blind production `db push`.
3. **Partial refunds require reconciliation.** Events are retained with
   `PARTIAL_REFUND_REVIEW_REQUIRED`; cumulative partial refunds are not a complete
   ledger. Full provider refund and local database update are also separate operations.
4. **Google Pay `OR_BIBED_11` remains unverified live.** The supplied consoles show
   Active integrations. The actual deployed merchant ID/gateway request must still
   be compared with the approved merchant, origin, and live account. Passing mocked
   tests is not evidence that Google accepts the deployed merchant request.
5. **Production configuration needs checking.** Set a random `AUTH_SECRET` of at
   least 32 characters, canonical HTTPS `APP_URL`, matching public/server PayPal
   client IDs and modes, Google merchant ID, and `PAYPAL_WEBHOOK_ID` for the same app.
   Public variables require a rebuild. Check real database shipping rates; earlier
   live observations showed GBP 0.20/0.30, while source defaults are 4.95/7.95.
6. **One active checkout capability per browser.** A new payment replaces its cookie.
   Concurrent tabs or payments older than one hour can fail finalization. A durable
   checkout record is required for multi-tab and delayed recovery.
7. **Operational security remains.** Add distributed ingress rate limits, upload
   storage policies/quotas, durable production media storage, verified email delivery,
   security monitoring, and a reconciliation worker. In-memory limits do not protect
   across multiple instances. Some older CRUD endpoints still need stricter schemas
   and body limits; this change is not an exhaustive endpoint rewrite.

## Next architecture step

After migration reconciliation, implement these durable records together:

- `CheckoutAttempt`: user/guest capability hash, immutable quoted cart/address,
  provider order ID, total in pence, currency, expiry, status, and unique capture ID.
- `InventoryReservation`: attempt/product/quantity, expiry, and consumed/released state.
  Reserve inventory and limited coupon capacity transactionally before capture.
- `PaymentEvent` / `Refund`: unique provider IDs, amount/currency, verified event,
  processing state, cumulative refunded amount, and provider response references.
- `Outbox`: transactional order/email/reconciliation jobs with retry and deduplication.

Create the attempt and reservations first, authorize with the provider, capture
idempotently, then commit the order and consume reservations. A worker must reconcile
interrupted captures by provider order ID and recover finalization or issue a tracked
refund. Never hold a database transaction open during provider network requests.
Model returns and restocking separately from financial refunds.

## Verification and rollout

- `npm test`: 98 tests passed covering configuration, authorization, pricing, ownership, input,
  capture orchestration, recovery token, media, and webhook regression tests. Provider
  responses are mocked; there are no real charges or test emails.
- `npm run lint`: repository lint check.
- `node node_modules/typescript/bin/tsc --noEmit`: TypeScript check.
- `npm run build`: locally blocked by `EPERM` creating
  `.next/types/app/api/admin`. A successful clean CI/staging build is still required.
- `npm audit --omit=dev --json`: blocked by DNS failure reaching `registry.npmjs.org`.
  Dependency vulnerability status is unknown; rerun in a network-enabled environment.

Before release: reconcile migrations on a disposable database, complete a clean
build, run sandbox success/cancellation/3DS/retry/refund scenarios against a staging
database, verify actual signed webhook delivery, verify email recovery, and then
check the production Google Pay request using `googlepay-diagnostics.md`.
No live database migration, deployment, payment, or refund was performed here.

Provider references: [PayPal webhook verification](https://developer.paypal.com/api/rest/webhooks/rest/),
[PayPal refund resource](https://developer.paypal.com/api/payments/v2/refunds-get).
