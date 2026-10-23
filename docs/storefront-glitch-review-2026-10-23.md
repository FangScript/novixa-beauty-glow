# NOVIXA storefront glitch review

Reviewed: 23 October 2026. Source baseline: commit `2fa8395` (working tree clean before this review).

## Scope and confidence

Reviewed the supplied shopping-bag screenshot, public page text for home, shop, men, women, bundles, a product detail, shipping, returns, contact, login, terms and privacy; and source paths for navigation, cart, checkout, wishlist, customer profile, addresses, order history, newsletter and payments. Public retrieval is not an interactive browser test and some retrieved pages were crawled last week. No interactive browser tool was available. Account actions, responsive rendering and wallet authorization were not exercised. No orders, charges or customer messages were created. This report changes no application behavior.

The screenshot shows a valid possible calculation (89.99 merchandise + free standard delivery = 89.99), but an inconsistent option label. The source grants free standard delivery at 70 or more, while the option displays its undiscounted database rate. The screenshot does not establish a failed calculation.

## Findings

### 1. High: delivery option and charged delivery disagree

- Evidence: screenshot; `components/cart/CartDrawer.tsx`, `app/(store)/cart/page.tsx`, `app/(store)/checkout/page.tsx` render `method.price`; `lib/commerce/pricing.ts` applies the free-standard-delivery rule to the quote.
- Reproduction: add the 89.99 product and choose standard delivery. The option shows a charge while the summary shows zero.
- Fix: render each option's effective charge and explicitly explain eligibility, e.g. "Free - order qualifies for standard delivery". Keep express pricing separate.
- Acceptance: below, exactly at, and above 70; sale products, bundle pricing, and coupons; option/summary/provider totals agree.

### 2. High: public shipping policy disagrees with checkout configuration

- Evidence: screenshot advertises 0.20 standard and 0.30 express; https://www.novixaretail.com/shipping and /terms advertise 4.95 standard below 70. Source defaults are 4.95/7.95, but database rows override them.
- Consequence: changing defaults in code does not correct existing live shipping records. The intended business rates must be established before changing them.
- Fix: publish consistent rates and timelines from one managed source. Screenshot says 3-5 days standard while the policy describes different tracked-delivery timelines.
- Acceptance: compare admin settings, delivery options, summary, shipping policy and terms for the same destination and basket. Live database rates were not directly retrieved in this review.

### 3. High: shipping preference is not shared between open components

- Evidence: Navbar keeps CartDrawer mounted. Drawer, cart page and checkout each read localStorage on mount and own separate selected-method state; none subscribes to other components' selection changes.
- Reproduction: choose express in the full cart or checkout, then open the existing drawer. It can retain standard and show another total. Same-window localStorage writes do not automatically update those React states.
- Fix: shared shipping selection state; synchronize other tabs deliberately; use the same selected ID for all quotes.

### 4. High: profile editor writes to the retired authentication system

- Evidence: `app/(store)/account/profile/page.tsx` calls `supabase.auth.updateUser`, while `lib/auth/customer-context.tsx` authenticates through `/api/auth/customer/*` and local database sessions.
- Consequence: a customer authenticated through the current system may get a missing Supabase session error; an old Supabase session would still not update the authoritative local user record.
- Fix: authenticated local profile-update endpoint plus auth-context refresh. Test email/password and direct Google accounts.

### 5. High: order history falls back to unrelated/stale local records

- Evidence: `app/(store)/account/orders/page.tsx` does not check `res.ok`. Empty/error results can fall back to the unscoped `novixa_recent_orders` browser key. Checkout writes order records there.
- Reproduction: on a shared browser with cached orders, sign into an account with no orders or simulate an API failure. Cached records may appear as that account's history.
- Fix: scope history to the authenticated account; distinguish server errors from an empty list; do not use global localStorage orders as authoritative history.
- This source-confirmed data isolation problem was not exercised with real customer accounts.

### 6. High: international address choices do not match the shipping quote contract

- Evidence: AddressSelector offers multiple countries, while `getCheckoutQuote` accepts items/coupon/shipping-method only and does not price or reject destinations. Checkout describes UK delivery. PayPal's `resolveCountryCode` defaults unmapped country names to GB.
- Consequence: non-UK customers can receive a UK shipping quote; unmapped country names may be sent as GB.
- Fix: enforce supported delivery destinations and use ISO country codes end to end. If international delivery is supported, include destination in quote validation and rates.

### 7. High: Apple Pay can imply an order exists when saving it failed

- Evidence: `components/checkout/NativeApplePayButton.tsx` captures payment and completes the native sheet before `onSuccess` saves the store order. Its fallback error says "Order registered but confirmation delayed" after order persistence throws.
- Consequence: captured payment can exist without a saved order; the message makes a stronger claim than the code can establish.
- Fix: durable checkout/payment reconciliation and accurate recovery messaging including a payment reference. Prevent blind repeat payment.
- This is the previously identified capture-before-order problem; earlier initialization fixes do not resolve it.

### 8. Medium: wishlist retains stale catalogue products and prices

- Evidence: `app/(store)/wishlist/page.tsx` seeds a map using static `getProduct`, then merges API results. Missing, unpublished, deleted or failed-to-fetch items are not removed from that map.
- Reproduction: save a catalogue item, change/unpublish it, then fail or empty the live products response. Old data can remain visible.
- Fix: live results must replace fallback data for purchasable items; show unavailable/error states and permit removal.

### 9. Medium: sale price differs from page title and structured data

- Evidence: `app/(store)/products/[slug]/page.tsx` uses `product.price` in title, social price metadata, offer JSON-LD and shipping eligibility. ProductDetailClient displays `salePrice ?? price`.
- Reproduction: open a discounted product. Visible current price differs from the generated title/offer metadata. Search engines may choose either value; a specific search-result display was not tested.
- Fix: shared effective-price calculation; use current shipping rules in metadata as well.

### 10. Medium: shop search can retain old URL filters

- Evidence: `components/navigation/Navbar.tsx` navigates to `/shop?q=...`; ShopClient copies search parameters and initial products into useState only once.
- Reproduction: while already on the shop route, submit a different navbar search, or navigate between category query strings without unmounting ShopClient. URL and displayed state can disagree.
- Fix: derive filters from URL state or synchronize changes; refresh product props deliberately.

### 11. Medium: quantity input can disagree with the actual amount

- Evidence: QuantityControl rounds all values and parses integers even though it exposes a step property. ProductDetailClient does not pass stock as max and clamps the value only in the parent callback.
- Reproduction: if stock is 5 and the current quantity is 5, type 9 and blur. The control can display 9 while the parent's quantity remains 5, so its synchronization effect does not run. Add-to-bag sends 5.
- Fix: pass stock bounds, use controlled normalized values and either support measured quantities consistently or remove unsupported fractional controls.

### 12. Medium: errors are presented as empty results

- Evidence: getLiveProducts returns [] after DB failure; ShopClient interprets that as no products found. The full cart has no hydration/error branch before its empty state. Account addresses logs fetch failures without a visible error state.
- Consequence: an outage can look like an empty catalogue, empty bag or missing saved addresses.
- Fix: distinct loading, empty, unavailable and retry states. Do not erase recoverable selections when a request fails.

### 13. Medium: cart dialog lacks keyboard focus management

- Evidence: CartDrawer declares `role="dialog"` and `aria-modal`, handles Escape and body scroll, but does not move focus into the drawer, trap it or restore it to the opener.
- Consequence: keyboard users can continue tabbing through obscured background content.
- Fix: use the existing accessible dialog/sheet primitive or implement equivalent focus behavior. Test keyboard and screen-reader navigation.

### 14. Medium: stale local carts can be re-imported after server clearing

- Evidence: CommerceProvider imports local regular items whenever the server returns an empty cart, without a completed-migration marker.
- Reproduction: keep an old cart in one browser/tab, clear the server cart elsewhere, then remount the old provider. It can recreate removed items.
- Fix: one-time guest migration with account/session scope and explicit conflict resolution. Empty server cart must be authoritative after migration.

### 15. Low: Featured and Top Rated sorting are identical

- Evidence: ShopClient handles low/high price separately, then sorts both remaining selections by rating.
- Fix: preserve a genuine featured order or remove the duplicate option.

### 16. Low: coupon Copy shows success before clipboard success

- Evidence: NewsletterForm calls `navigator.clipboard.writeText` without awaiting or catching it, then immediately displays Copied.
- Fix: show success only on resolved write; handle permission-denied/unavailable clipboard with selectable text.

## Visual observations requiring device testing

- The screenshot has a large blank middle area because the item list flexes between fixed header/footer. This is a layout choice, not by itself a functional defect.
- Drawer footer is not inside the scrolling item region and the fixed panel uses h-full rather than an explicitly tested dynamic viewport/safe-area layout. Test short mobile landscape screens, browser toolbars and the keyboard before claiming overflow is fixed or broken.
- Verify mobile navigation overlap, long names, error text wrapping and wallet button availability at 320/375/390px widths and desktop. These were not visually validated.
- Contact/login text retrieval showed client-loading content; that alone does not prove they are stuck in a real browser.

## Recommended repair sequence

1. Make shipping labels, selected method, policy and totals consistent.
2. Fix local profile updates, account order-history isolation and destination validation.
3. Correct wishlist/metadata prices, quantity controls and search state.
4. Add explicit loading/error/retry UI and accessible drawer focus behavior.
5. Resolve durable payment/order recovery; verify Apple Pay on a supported live device.
6. Run an interactive regression matrix: guest and authenticated users; desktop/mobile; below/at/above 70; sale and bundle items; standard/express; coupon add/remove; slow/failing requests; reload/back/forward; account switching; wallet cancellation and provider success with store-save failure in a non-production test environment.

No production rates or application code were changed during this review. Previously passing unit tests do not replace these user-flow checks.

## Implementation follow-up

Local fixes now cover the sixteen findings above. Standard-delivery option labels use the same threshold as server totals; policy pages load configured rates. The existing configured base rates were retained. Delivery selection synchronizes across mounted selectors. Profile and order history use local authenticated accounts, and checkout rejects unsupported destinations. Wishlist prices come from live products; sale metadata, URL filters, quantity limits, error/retry states, dialog focus and clipboard feedback were corrected. Empty server carts are authoritative; legacy local regular items are no longer automatically imported.

Checkout now persists a pending order before capture, reserves stock and coupon usage transactionally after provider approval, and finalizes the saved order after verified capture. Retries do not reserve twice. Verified completion webhooks can recover browser disconnects. The admin-only POST `/api/admin/payments/reconcile` accepts `{ "paypalOrderId": "PROVIDER_ORDER_ID" }` to verify a payment without creating a charge. Uncertain processing reservations are retained unless the provider definitively voids the order; do not release them based on elapsed time alone. This recovery endpoint is not a scheduled reconciliation worker.

Deployment notes: no schema migration was introduced. Refresh existing checkout tabs after deployment because old requests do not contain the new customer snapshot. Ensure the PayPal webhook is configured and reachable. Confirmation-email failure is logged; there is no durable email outbox. Real database concurrency, browser accessibility, Apple Pay and Google Pay on eligible live devices remain unverified. Do not infer production readiness from unit tests.

Validation: 120 unit tests passed and TypeScript passed. Production build was attempted but blocked by `ENOTFOUND fonts.googleapis.com` and `EPERM` creating `.next/server/app/api` in this environment. Changes are local and not deployed.
