# SL Options Market — manual acceptance checklist

Run these tests on a local or staging MySQL database after `npm install`, `npm run db:generate`, `npm run db:deploy` and `npm run db:seed`.

## Storefront

- [ ] Home page loads demo products and four categories; responsive at 360, 390, 768, 1024 and 1440 px.
- [ ] Shop search, category filter, sorting and pagination produce correct results.
- [ ] Product details show price in LKR, stock, description and image.
- [ ] Full product description always appears as a dedicated section **below** the gallery/price/cart panel and **above** specifications, not inline beside the gallery; verify paragraphs/line breaks and mobile widths.
- [ ] Anonymous visitor adds product to bag; bag survives refresh and syncs after registration/login.
- [ ] Signed-in visitor adds/removes products, adjusts quantities and sees updated totals.
- [ ] Wishlist only works while authenticated and persists across sessions.
- [ ] Empty bag/wishlist/search result display helpful states.

## Authentication

- [ ] Customer email/password signup and login work; users cannot set ADMIN role.
- [ ] Cookies are HttpOnly; never return password hash or Google subject in API responses.
- [ ] Wrong password and repeated login attempts are rejected.
- [ ] Google sign-in works with a configured authorized web client ID.
- [ ] Google email collision cannot silently take over an existing password account.
- [ ] A logged-in user can link matching Google credentials.
- [ ] Forgot password emails link to a page that accepts single-use unexpired reset tokens.
- [ ] After reset, existing sessions are invalidated; used reset tokens are rejected.
- [ ] Customer routes require a user; admin routes return 403 to customers.

## Checkout and orders

- [ ] Address uses Sri Lankan district list, delivery note and phone; delivery quote is computed server-side.
- [ ] Free delivery triggers exactly at configured minimum order value.
- [ ] Cash-on-delivery order returns a unique order number and persists line-item price snapshots.
- [ ] Checkout computes price server-side even if a browser submits a manipulated price.
- [ ] Order totals match product price * quantity + shipping.
- [ ] Checkout decrements stock once; repeat request with same checkoutKey returns original order.
- [ ] Checkout declines out-of-stock/draft items and conflicting concurrent transactions.
- [ ] Only owner can see their own order history and order details.
- [ ] Order emails arrive only when SMTP is configured; mail failure does not undo an order.

## Administration

- [ ] Admin creates category and product, uploads real JPG/PNG/WebP, edits price, activates item.
- [ ] New product appears on customer storefront, searching and category filter.
- [ ] Draft product is hidden and cannot be checked out.
- [ ] Admin sees orders and customers and can change fulfilment status.
- [ ] Cancelled order restores stock only once; cannot be reopened accidentally.
- [ ] Admin marking COD payment PAID is a manual staff action after collection.
- [ ] Store settings update top banner, shipping and contact address.
- [ ] Upload rejects unsupported formats and files larger than 5 MB.

## Deployment & security

- [ ] HTTPS, secure session cookies, restricted origins and login popup behavior work in production.
- [ ] Behind Nginx, real client IP/rate limiting work as intended without trusting arbitrary forwards.
- [ ] Product images and MySQL persist across restarts; database backup/restore tested.
- [ ] CSS/content policy does not break Google Login, fonts, uploaded photos or menus.
- [ ] Replace all sample listings/images/legal templates, support email and secrets.

## Order details, tracking and invoices (feature batch)
- [ ] Customer can open their own order at /orders/:id and see quantities, saved prices, delivery address, payment and status history.
- [ ] Other customers' order IDs return 404; customers cannot call admin tracking/status API routes.
- [ ] COD awaiting payment displays **Order invoice** and plainly says payment pending; after admin confirms payment it displays **Payment receipt**.
- [ ] Invoice/receipt prints well to A4 PDF on desktop and mobile browsers; tax invoice details are reviewed for Sri Lankan requirements.
- [ ] Admin can open order details, advance statuses (never backwards), and enter courier, tracking number, optional HTTPS URL and delivery estimate.
- [ ] Customer timeline shows only actual recorded transitions; already-existing orders retain their current status after migration.
- [ ] Cancelling an eligible order restores stock once, and dispatched/delivered orders cannot be cancelled through this action.

## Rich product pages and header menus
- [ ] Admin creates a product from a dedicated page, uploads 2+ valid photos, reorders/removes them, and sets a cover.
- [ ] Product edit page preserves previously saved photos, SKU, description, specifications, visibility and price.
- [ ] Customer product page displays gallery, working thumbnails and image zoom, related products, low-stock notice and specifications.
- [ ] Mobile and desktop header menus show wishlist items, account shortcuts/signout, and cart preview with subtotal.
- [ ] Menus close on Escape, outside click and route change; keyboard and touch controls remain usable.
- [ ] Admin sidebar sign-out clears the session and redirects away from protected admin screens.

## Responsive navigation and store pages (November 2026 batch)

- [ ] Navigate Shop → product → account → orders → Contact; every full page opens at the top, including browser Back/Forward.
- [ ] Clicking a product or account link while halfway down the previous page does not retain the previous scroll position.
- [ ] Custom category/district/topic dropdown navigation does not move the document unexpectedly when changing the highlighted option.
- [ ] Desktop dropdowns anchor close to the selected top-bar icon; tablet (768–960 px) and phone (320–640 px) account/wishlist/cart previews appear centered below the sticky top bar.
- [ ] Header previews stay fully on-screen and scroll internally; Escape, outside tap and navigation close the preview.
- [ ] At 320, 375, 390, 768 and 1024 px: account overview, order cards, invoices, wishlist grid, addresses, settings forms and sign-out do not cause horizontal overflow.
- [ ] Contact page loads from the footer and mobile menu; customer can submit valid enquiry with configured SMTP, with delivery to the merchant inbox and a success state.
- [ ] Contact form shows a helpful fallback if SMTP is unavailable; invalid addresses, message <10 or >3000 characters and too many requests are rejected.
- [ ] Contact form uses store-configured SMTP sender and destination only, not untrusted user input as an email recipient.
- [ ] Shipping & Returns, Privacy, Terms and /policies hub routes are reachable from footer; their internal links and account policy links work.
- [ ] Verify actual business name, merchant address, official support inbox, shipping/return windows and legally required policy details before production.
- [ ] Confirm desktop, tablet and mobile checkout/cart/product detail layouts still work after adding the responsive styles.

## Branded frontend preloader

- [ ] A fresh hard reload shows the **SL OPTIONS MARKET** branded loading screen immediately, before React has finished starting.
- [ ] Once initial session/account checks finish, the loading screen fades away automatically with no unnecessary minimum wait.
- [ ] The loader remains centered on phone, tablet and desktop; no horizontal scrolling or clipped text.
- [ ] Product, wishlist, orders and other async views show the small branded loading indicator without flashing a full-screen loader on every route.
- [ ] Navigate across pages after startup: route scroll reset and centered top-bar previews continue to work normally.
- [ ] Enable **Reduce motion** in the OS/browser: orbit, pulse and progress animations stop and the overlay disappears without motion.
- [ ] Test with the API briefly unavailable: the screen does not trap customers indefinitely; regular API error/empty states become visible.
- [ ] Confirm no requests are triggered by the loader itself and no customer/order data appears within loading markup.

## Email and authentication hardening

- [ ] Admin Store settings → Connected services displays backend SMTP/Google setup status without credentials.
- [ ] Admin SMTP verify authenticates; test email is only sent to signed-in administrator address.
- [ ] New email/password and Google registrations send the correct welcome emails without sending duplicates on every login.
- [ ] Existing password account cannot be silently linked via Google email; explicit linking from signed-in settings works.
- [ ] Reset-link email is single-use and expires; failed SMTP delivery removes an unused reset token without exposing account existence.
- [ ] Password change, password reset and Google linking send account security notices without passwords or access tokens.
- [ ] Customer order confirmation includes exact items, LKR total and pending COD wording; separate staff alert reaches configured store inbox.
- [ ] Admin order status and payment changes trigger customer notifications only when values change.
- [ ] Courier/tracking edits send updated delivery details, and no notification is sent when values stay unchanged.
- [ ] SMTP outages do not roll back registration or orders; provider rejection is logged without leaking secrets.
- [ ] Production sender/domain and STORE_URL are configured correctly and no email links point to localhost.
- [ ] All existing account, cart, wishlist, checkout, invoice and admin analytics flows remain functional.

## Customer and product analytics (2026-11-05)

- [ ] Backup `slstore`, run additive `20261105000000_product_engagement_analytics` migration; existing orders and accounts remain intact.
- [ ] After `npm ci`, `npm run dev` auto-generates the Prisma Client, and API health responds at localhost:4010.
- [ ] Anonymous customer clicks product card, views product and adds to cart; Admin → Analytics shows aggregate events without identifying the visitor.
- [ ] Signed-in customer clicks, views, wishlists and adds to cart; customer-product detail shows account activity and current wishlist/cart status.
- [ ] Confirm deduplication on repeated product-detail refreshes; viewing an item does not count as a purchase.
- [ ] Place a COD order; purchased units and ordered value increase. Received COD value increases only when marked PAID.
- [ ] Cancel the order; cancelled-order totals do not appear as successful sales. Existing order cancellation and stock restore still work.
- [ ] Test 7/30/90-day reporting, daily activity chart, sorting/searching item table, aggregate CSV download and 320px/768px/desktop admin layouts.
- [ ] Log in as a customer; requests to `/api/admin/analytics/summary` and `/api/admin/analytics/audience/:productId` return 403.
- [ ] Test the optional analytics opt-out from Privacy and Account settings; no new VIEW, CLICK, WISHLIST_ADD or CART_ADD events are recorded after opting out.
- [ ] Check event retention after 90 days and that historical shopping data prior to rollout is not fabricated.
- [ ] Verify `npm test`, `npm run build`, `npm audit` and existing storefront account/cart/checkout flows.
