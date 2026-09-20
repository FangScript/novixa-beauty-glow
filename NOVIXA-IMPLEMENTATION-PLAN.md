# NOVIXA E-commerce Implementation Plan

**Project:** NOVIXA Beauty Suite  
**Current application:** React, TypeScript, Vite, TanStack Router, TanStack Start, Tailwind CSS  
**Plan status:** Prepared for implementation  
**Author:** Manus AI

## 1. Executive summary

The NOVIXA project now has a polished customer-facing storefront foundation. The homepage has been preserved, the main catalogue routes are functional, product detail pages exist, and local cart and wishlist interactions work. Visual QA has also covered desktop, mobile, and narrow mobile layouts. The next stage is to convert this frontend foundation into a production-ready commerce application.

The work should proceed in dependency order. First, the product and domain model must become complete and consistent. Next, the application needs a backend-ready persistence layer and server-side business rules. Authentication, administration, orders, payments, and operational tooling should then be added on top of those foundations. The final stage should focus on hardening, observability, accessibility, performance, and release readiness.

The current project is **not a Next.js App Router project**. It is a Vite/TanStack Start application. This plan therefore assumes that the existing architecture will be extended rather than replaced. A framework migration should only be considered if a later product requirement requires a Next.js-only capability and the migration cost is explicitly accepted.

## 2. Current baseline

The current application includes a luxury editorial homepage, a shared product catalogue, typed product records, product cards, search, category filtering, price sorting, product detail pages, a persistent local cart, a persistent local wishlist, checkout form scaffolding, and account pages. The visual system uses Tailwind CSS with existing NOVIXA typography, colour tokens, image assets, and responsive breakpoints.

The current data source is an in-memory product catalogue. Cart and wishlist state are stored in browser `localStorage`. Checkout is deliberately development-safe: it validates the form but does not charge a customer or claim that payment succeeded. Account pages are UI foundations without real authentication. The application has no production database, API service layer, payment provider, admin dashboard, or server-side authorization yet.

The latest QA pass found and fixed a server-rendering issue on `/shop`, allowed the public sandbox host for preview testing, and replaced several homepage dead links. Production builds pass. Lint passes with existing non-blocking Fast Refresh warnings.

## 3. Target architecture

The target architecture should retain the current Vite/TanStack structure while introducing clear boundaries between UI, domain logic, persistence, and external services.

```text
src/
├── routes/                 # TanStack file routes and page composition
├── components/             # Reusable presentation and interaction components
├── lib/
│   ├── commerce/            # Products, bundles, pricing, catalogue queries
│   ├── cart/                # Cart calculations and cart service interfaces
│   ├── orders/              # Order domain logic and status transitions
│   ├── auth/                # Session and authorization abstractions
│   ├── payments/            # Payment provider boundary and webhook handling
│   ├── api/                 # Central client/server request functions
│   ├── db/                  # Prisma client and repository implementations
│   └── validation/          # Shared Zod schemas
├── actions/                 # Server actions or server-side mutations
├── hooks/                   # Client interaction hooks
├── types/                   # Shared domain types where they are not local
└── styles.css               # Existing design system and responsive styles

prisma/
└── schema.prisma            # PostgreSQL-ready schema

public/
└── ...                      # Public assets and static metadata
```

The UI must not calculate authoritative prices, discounts, inventory, tax, shipping, or payment status once the backend is connected. Those values must be returned by trusted server-side services. The browser may display calculated previews, but the server must recalculate them before an order is created.

## 4. Delivery phases

### Phase 0 — Project hygiene and decision lock

**Purpose.** Establish a stable baseline before adding persistence and external integrations.

The project should standardize the package manager and lockfile. The current repository now contains a generated `package-lock.json` after local verification, while the repository also includes Bun configuration. The team should choose either npm or Bun as the canonical workflow, update the README, and avoid committing multiple competing lockfiles.

The team should also decide whether the current TanStack Start architecture remains the long-term framework. The recommended decision is to keep it. The current application already builds, supports file-based routes, and has the required React and TypeScript foundation. A migration to Next.js would add risk without solving an immediate product problem.

**Deliverables.** A documented development command, one canonical lockfile, an environment variable policy, and a short architecture decision record.

**Acceptance criteria.** A fresh clone can install dependencies, start development, build production output, and run lint without undocumented steps.

### Phase 1 — Complete the product catalogue and domain model

**Purpose.** Make the catalogue complete enough to support real storefront, search, inventory, and admin workflows.

The initial catalogue should be expanded to the requested scope: six men’s perfumes, two men’s grooming kits, six women’s perfumes, six women’s makeup products, two women’s grooming kits, and three or four bundles. Each product must have a stable identifier, name, slug, description, pricing, gender classification, category, brand, SKU, image set, stock state, rating summary, and searchable tags. Type-specific attributes should remain optional and nested. Perfumes need fragrance families and notes. Makeup needs shade, finish, coverage, and skin type. Grooming products need ingredients and relevant skin or hair types.

Product images must use a consistent naming and storage convention. Every product needs an accessible primary image, useful alt text, and a fallback state when an image is missing. Sale prices must be validated as lower than the regular price. Stock values must be non-negative integers.

The catalogue query layer should support filtering by gender, category, price range, sale state, stock state, fragrance family, and searchable text. Sorting should support relevance or featured order, price ascending, price descending, rating, and newest. The UI should consume this layer rather than importing product arrays directly.

**Deliverables.** Complete product data, bundle definitions, shared product schemas, catalogue query functions, product validation, and consistent asset metadata.

**Acceptance criteria.** All requested initial catalogue counts are present. Every product can be opened by slug. Search and filters return the correct products. No page maintains a duplicate product list.

### Phase 2 — Database and persistence foundation

**Purpose.** Replace browser-only data with a PostgreSQL-ready persistence layer while retaining a safe development fallback.

Create a Prisma schema for users, roles, products, product images, categories, bundles, bundle items, inventory records, carts, cart items, wishlists, wishlist items, addresses, orders, order items, coupons, reviews, and payment records. Add timestamps, stable IDs, unique constraints, indexes for slugs and search fields, and status enums where appropriate.

Create a single database client boundary under `src/lib/db`. Repository functions should expose domain operations without leaking Prisma calls into UI components. The development environment should support seed data so a new database can be initialized consistently. The in-memory catalogue may remain as a fallback for local UI work, but the application must make the source of truth explicit.

**Deliverables.** `prisma/schema.prisma`, seed data, database client, repositories, migrations, environment example, and database setup documentation.

**Acceptance criteria.** A developer can create a local PostgreSQL database, run migrations, seed the requested catalogue, and load products through the repository layer. No secret or database credential is committed.

### Phase 3 — API and server mutation layer

**Purpose.** Centralize data access and move business rules to trusted server execution.

Create reusable API functions and server-side actions for products, categories, bundles, cart, wishlist, orders, reviews, coupons, and account data. Route components should call these functions instead of scattering raw `fetch` calls. The service boundary should be designed so a future API host or external service can replace the local implementation without changing page components.

Product responses should include only the fields needed by the client. Cart mutations must re-read product prices and stock from the server. Order creation must create a price snapshot in order items so historical orders do not change when catalogue prices change.

Validation should use shared Zod schemas for product IDs, slugs, quantities, addresses, coupon codes, review ratings, and checkout payloads. Errors should have stable categories such as validation failure, not found, stock conflict, unauthorized, forbidden, and external service failure.

**Deliverables.** Central API client, route handlers or server actions, Zod schemas, typed error model, and service tests.

**Acceptance criteria.** No customer-facing mutation trusts a client-provided price. Invalid quantities and unknown products are rejected. Service errors are rendered as user-readable states instead of uncaught exceptions.

### Phase 4 — Production cart and wishlist

**Purpose.** Upgrade the current local interactions into authenticated or guest-persistent commerce state.

The cart should support guest sessions and signed-in users. A guest cart should be associated with a secure session identifier and merged into the customer cart after login. Cart operations should include add, update, remove, clear, subtotal, discount, shipping, tax estimate, and total. The server must enforce stock limits and return conflicts when inventory changes.

The wishlist should support add, remove, toggle, contains, listing, and move-to-cart. The UI should keep the current product-card and product-page controls but replace local-only writes with the service layer. Optimistic UI may be used, provided failures roll back visibly.

Add a cart drawer or quick-cart interaction after the core cart API is stable. The full cart page remains the authoritative review screen before checkout.

**Deliverables.** Guest cart, signed-in cart, cart merge, wishlist persistence, server-side totals, cart drawer, loading states, and conflict handling.

**Acceptance criteria.** A customer can add a product, change quantity, remove it, leave and return, and proceed to checkout. Out-of-stock products cannot be added. Cart totals match server calculations.

### Phase 5 — Authentication and account security

**Purpose.** Introduce secure customer and administrator identity management.

Implement registration, login, logout, current-user lookup, email verification if supported by the chosen provider, forgot password, reset password, and session expiry. Passwords must never be stored in plaintext. Secrets must remain server-side. Session cookies should use secure settings in production.

Define `CUSTOMER` and `ADMIN` roles. Route visibility in the UI is not an authorization boundary. Every protected server operation must validate the session and role. Account pages should load real profile data, saved addresses, wishlist data, and order history after authentication is available.

The project should use an established authentication provider or a carefully reviewed server-side implementation. The choice must be recorded before implementation because it affects database tables, email delivery, and deployment configuration.

**Deliverables.** Auth provider integration, session abstraction, user records, role checks, protected account routes, login and registration screens, and password recovery states.

**Acceptance criteria.** An unauthenticated user cannot read another customer’s cart, orders, addresses, or profile. An authenticated customer cannot access admin operations. Session failure is handled without exposing sensitive details.

### Phase 6 — Customer account and order history

**Purpose.** Make the account area useful after authentication and order persistence exist.

Implement profile editing, email and phone display, saved addresses, default address selection, order list, order detail, item list, totals, payment status, shipping address snapshot, and tracking information. Use the requested order statuses: `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED`, and `REFUNDED`.

Order details must be immutable where historical accuracy matters. For example, the product name, SKU, price, and shipping address should be stored as snapshots on the order or order item rather than reconstructed from current product records.

**Deliverables.** Real account pages, order history, order detail route, address management, status display, and customer-facing empty/loading/error states.

**Acceptance criteria.** A customer can view only their own orders. Order totals and item prices remain historically accurate. Status and tracking information are clear on desktop and mobile.

### Phase 7 — Checkout, coupons, shipping, and payments

**Purpose.** Turn the current safe checkout scaffold into a real order workflow without pretending payment succeeded.

Complete the checkout sections for customer information, shipping address, delivery method, payment method, order summary, coupon code, and place order. Use a shared validation schema. The checkout state should explicitly represent idle, validating, submitting, success, and error conditions.

Coupons should support percentage discounts, fixed discounts, minimum order values, expiry dates, usage limits, and active status. The server must validate coupons and calculate the discount. The browser must not be authoritative.

Create a payment provider boundary with functions for creating a payment intent, confirming payment status, handling failures, and processing signed webhooks. The provider choice should be made before coding the integration. Until the provider is configured, the application must continue to show an explicit unconfigured state and must not create a paid order.

Shipping should support at least a free threshold and one paid delivery method initially. Tax and shipping rules should be centralized so they can later be replaced by a tax or logistics service.

**Deliverables.** Validated checkout, coupon service, shipping methods, payment adapter, webhook endpoint, order creation transaction, and clear unconfigured-payment behavior.

**Acceptance criteria.** A successful order is created only after server-side validation and confirmed payment, unless the environment is explicitly in a development mode that creates an unpaid test order. Failed payments do not create paid orders. Replaying a webhook does not duplicate an order.

### Phase 8 — Admin dashboard and operations

**Purpose.** Give authorized staff the tools to operate the store.

Create the admin foundation with dashboard, products, orders, customers, inventory, categories, bundles, coupons, reviews, analytics, and settings routes. Every admin page should consume the same service abstractions as the storefront, with server-side role authorization.

The product manager should support search, filtering, create, edit, archive, status, stock, price, sale price, images, category, gender, and type-specific attributes. Delete operations should default to archive behavior so historical orders do not lose their product references.

The order manager should support search, filters, detail view, payment status, customer information, items, totals, tracking information, and allowed status transitions. Inventory should show current stock, low-stock thresholds, and out-of-stock products. Bundle management should allow staff to choose products and define bundle price, original value, and savings.

**Deliverables.** Protected admin shell, dashboard metrics, CRUD forms, inventory views, order management, bundle management, coupon management, review moderation, and settings foundation.

**Acceptance criteria.** Admin operations are unavailable to customers even if they manipulate the URL. Product, inventory, and order changes are reflected in the storefront through the service layer. Destructive operations require an explicit UI confirmation and preserve historical data where possible.

### Phase 9 — Reviews and customer trust features

**Purpose.** Add credible review functionality tied to order history.

Create review list, rating summary, review text, verified-purchase indicator, review form, and moderation states. A customer should be permitted to submit a verified review only for an eligible product purchased through a completed order. The frontend may display a pending review state, but purchase verification must be decided server-side.

Add review sorting and pagination if the review volume requires it. Product rating summaries should be computed from approved reviews rather than manually maintained UI constants.

**Deliverables.** Review schemas, customer form, verified-purchase rules, moderation UI, rating aggregation, and product-page review section.

**Acceptance criteria.** Unverified customers cannot claim a verified purchase badge. Moderated or rejected reviews are not displayed as approved reviews. Ratings and review counts remain consistent with approved records.

### Phase 10 — Search, analytics, and notifications

**Purpose.** Improve discovery and provide operational visibility.

Start with database-backed search across name, category, brand, tags, fragrance family, notes, and relevant product attributes. Add query normalization, result ranking, empty states, and search analytics. An external search provider should not be introduced until the local query layer becomes insufficient.

Add analytics events for product views, searches, add-to-cart, wishlist actions, checkout starts, coupon attempts, payment outcomes, and orders. Events must avoid collecting unnecessary personal data. The admin dashboard can initially show basic product, order, revenue, and inventory summaries.

Add notification boundaries for order confirmation, shipping updates, password recovery, and customer support. Email delivery should be asynchronous when production infrastructure is available. Development environments should log safely without exposing secrets.

**Deliverables.** Search service, search UI, event model, analytics summaries, notification adapter, and operational logs.

**Acceptance criteria.** Search returns relevant results without exposing private data. Admin summaries reconcile with stored orders. Notifications have retry and failure states.

### Phase 11 — Quality, accessibility, performance, and release hardening

**Purpose.** Prepare the application for real customers and deployment.

Add automated tests at three levels. Unit tests should cover price calculations, discounts, shipping, stock limits, order status transitions, and validation. Integration tests should cover repositories, cart mutations, checkout, coupons, and authorization. End-to-end tests should cover the primary customer path from catalogue to order and the primary admin path from product edit to inventory update.

Complete an accessibility pass covering keyboard navigation, focus visibility, semantic headings, form labels, error messaging, image alt text, colour contrast, reduced-motion preferences, and screen-reader announcements for cart and wishlist updates.

Run performance checks for image sizes, route payloads, font loading, layout shifts, and mobile network conditions. Add error boundaries, structured server logs, request correlation IDs, health checks, and deployment smoke tests. Remove or separate Fast Refresh warning sources where practical, but do not block commerce work on non-functional lint warnings.

**Deliverables.** Automated test suite, accessibility checklist, performance report, structured logging, error monitoring, health endpoint, deployment checklist, and rollback procedure.

**Acceptance criteria.** The primary customer and admin journeys pass in CI. No known critical accessibility or authorization defect remains. Production deployment can be verified and rolled back using documented steps.

## 5. Recommended implementation order

The phases should be implemented in this order because each stage supplies dependencies for the next stage:

| Sequence | Phase | Primary outcome | Depends on |
|---:|---|---|---|
| 0 | Project hygiene | Stable development and deployment baseline | Existing app |
| 1 | Product catalogue | Complete, validated catalogue | Phase 0 |
| 2 | Database foundation | PostgreSQL and Prisma persistence | Phase 1 |
| 3 | API and mutations | Trusted server business rules | Phase 2 |
| 4 | Cart and wishlist | Persistent commerce state | Phase 3 |
| 5 | Authentication | Secure identity and roles | Phase 2–3 |
| 6 | Account and orders | Customer order history | Phase 4–5 |
| 7 | Checkout and payments | Real order creation and payment boundary | Phase 3–6 |
| 8 | Admin operations | Store management tools | Phase 3 and 5 |
| 9 | Reviews | Verified customer feedback | Phase 6–8 |
| 10 | Search and analytics | Discovery and operational insight | Phase 2–9 |
| 11 | Hardening | Release-ready quality and reliability | All required production phases |

Parallel work is possible after Phase 2. For example, the admin shell and product management UI can progress alongside customer account work. Payment provider selection, authentication provider selection, and hosting decisions should be made early because they affect schema and environment configuration.

## 6. Environment and integration decisions

Before implementing external integrations, the project owner should choose the following services:

| Decision | Options to evaluate | Why it matters |
|---|---|---|
| PostgreSQL hosting | Managed PostgreSQL or project-provided database | Determines connection, backups, and migration workflow |
| Authentication | Auth provider or reviewed custom session layer | Determines session, user, email, and role design |
| Payments | Provider available in the target market | Determines payment intents, webhooks, refunds, and settlement status |
| Email | Transactional email provider | Determines password recovery and order notifications |
| Image storage | Object storage or managed media service | Determines product image uploads and optimization |
| Deployment | Existing TanStack Start-compatible hosting | Determines server runtime, environment variables, and webhook URLs |

No provider should be represented as connected until its credentials, webhook configuration, sandbox behavior, and failure handling have been tested.

## 7. Definition of done for the complete application

The project is complete when a new developer can clone it, configure documented environment variables, install the canonical dependencies, run migrations and seed data, start the application, and execute the automated test suite.

A customer must be able to browse the complete catalogue, search and filter products, view product details, manage a cart and wishlist, authenticate, manage an account, apply a valid coupon, select shipping, complete a real or clearly marked sandbox payment, and view the resulting order. The application must never show a paid or confirmed order when payment has not been confirmed.

An administrator must be able to manage products, stock, bundles, coupons, orders, customers, reviews, and basic analytics. All privileged operations must be protected server-side. Historical order data must remain accurate even when product prices, names, or images change later.

The app must be responsive at the verified breakpoints, accessible by keyboard and assistive technology, observable in production, and recoverable through documented rollback and backup procedures.

## 8. Immediate next sprint

The first implementation sprint after this plan should complete Phase 0 and begin Phase 1. It should standardize the package manager, create the shared Zod product schemas, expand the catalogue to the requested counts, add missing product attributes and assets, and ensure all product-facing screens consume the canonical data layer.

The sprint should finish with a catalogue acceptance test, a fresh-install verification, and a short decision record confirming that the existing TanStack Start architecture will be retained for the backend work.

## References

No external sources were used. This plan is based on the current NOVIXA repository, its existing implementation, the attached project requirements, and the completed visual QA findings.
