# SL Options Market — Customer and product analytics

## What's included

A new **Admin → Analytics** dashboard, built on the existing React + Node/Express + MySQL stack (no Docker or third-party analytics). The Admin Overview now includes a 30-day engagement preview.

- Date filters: **7, 30 or 90 days**
- Product views, listing clicks, wishlist additions, cart additions, checkout entries
- Approximate unique visitor counts and signed-in customer counts
- Non-cancelled order totals, items ordered, ordered value and **COD received** only when marked PAID
- Product-by-product report: viewed, clicked, saved now, still in cart, cart additions, units ordered
- Select a product to see signed-in customers who interacted with it, their view/click counts, current wishlist/cart state, and whether they previously purchased the product
- Daily views/orders trend; 90-day selection displays weekly snapshots for readability
- Aggregate-only **CSV download** (does not export individual customer contact details)
- Responsive admin tables and charts

### Definitions

| Signal | Recording | Meaning |
|---|---|---|
| CLICK | Customer clicks a product card image/title | Link interaction, **not a unique visitor count** |
| VIEW | Customer opens a product detail page | Page view, deduplicated per person/product/5-minute bucket |
| WISHLIST_ADD | Authenticated wishlist action successfully saves an item | A wishlist addition, not necessarily still on wishlist |
| CART_ADD | Product successfully added to the cart, including anonymous cart | Intent signal, not checkout or an order |
| CHECKOUT_START | Checkout page opens and product was in the cart | Page-entry signal, not a payment attempt |
| Ordered units | Actual non-cancelled OrderItem records | Purchased/order-requested units; status may still be pending COD |
| COD received | Orders explicitly marked PAID | Admin-recorded receipts, not confirmed bank settlement |

Product event tracking **starts only when deployed**. We do not reconstruct historical browsing. Existing orders and wishlists are used for their present/history state where available, but historical view counts start at zero.

### User versus item

Use the **Customers** action next to a product in Admin → Analytics. The detail view shows interactions by **signed-in customers only**, limited to the most recent 5,000 events / 100 customers. It compares those interactions with all non-cancelled purchase history of the same product to identify **interested, not purchased** customers. Anonymous guests appear in aggregate metrics only, not as identifiable users.

These are **operational signals**, not proof that a person intended to buy or abandoned a checkout. Avoid automatically contacting customers because they viewed or saved an item without explicit marketing permissions.

### Privacy and security

- The frontend generates a random per-tab UUID for anonymous browsing; it is held in `sessionStorage` and not shared with third parties.
- The backend reads the authenticated customer ID from the signed session cookie. It **never** accepts a user ID supplied by the browser.
- No IP address, device fingerprint, search history, message contents, delivery address, or payment data is stored in ProductEvent.
- The backend rate-limits activity submission; repeat views/clicks/checkout signals deduplicate for five-minute buckets.
- Only authenticated **ADMIN** users may read analytics summaries and identified customer-interest data.
- Customer Account → Settings and the public Privacy page offer a checkbox to opt out of optional analytics. The cookie is respected by both client-side tracking and server-side cart/wishlist instrumentation. The preference does not disable necessary order accounting.
- Event data is automatically pruned after **90 days** on server startup and every day while the API is running.
- Events and identifiers are pseudonymous or linked to logged-in accounts; store administrators must restrict access and handle access/deletion requests appropriately.
- Audit and legal review is required before going live under Sri Lankan data-protection and consumer regulations.

### New schema

One additive migration, `20261105000000_product_engagement_analytics`, adds the **ProductEvent** table with indexed product, user, anonymous visitor, type, timestamp and optional unique deduplication key. Existing Product, User, Order, Cart and Wishlist data is preserved.

## WAMP Windows installation

**Back up the `slstore` database** using phpMyAdmin before deploying a new migration.

```powershell
cd C:\wamp\www\html\sl-ecom
git fetch origin
git switch --track origin/feature/admin-customer-product-analytics-20261105
npm ci
npm run db:generate
npm exec -w apps/api -- prisma validate
npm run db:deploy
npm exec -w apps/api -- prisma migrate status
npm test
npm run build
npm audit
npm run dev
```

No Docker. **Do not** use `prisma migrate reset`; this would erase your customers and orders.

The root `predev` script now generates Prisma Client automatically before `npm run dev`, so `npm ci` no longer causes the startup error from an ungenerated `@prisma/client`.

### Acceptance tests

- Anonymous visitor opens multiple products, adds to cart; counts increment under Analytics but no individual customer row is identified.
- Signed-in customer views, saves and adds one item; that customer appears in the item report with the appropriate signals.
- Signed-in customer places a COD order; units ordered increase. The item no longer appears as "not purchased" for that user. Revenue is not classified as received until status is PAID.
- Customer account opt-out prevents subsequent view/cart/wishlist events from being recorded. Turning it back on resumes tracking.
- Refreshing a product detail page rapidly does not inflate 5-minute views. Test at 320px/390px/768px and desktop.
- 7/30/90-day filters, product name filter, CSV export, customer-interest details, admin-only API permissions and order cancellations work.
- In the test database, create an event older than 90 days and verify the retention cleanup removes it.
- Check that all route navigation, responsive header dropdowns, product detail layout, account pages and branded preloader continue to work.

**PR remains unmerged** until Prisma migration and real browser flows pass locally. A clean `npm audit` alone does not verify behavioral analytics accuracy.
