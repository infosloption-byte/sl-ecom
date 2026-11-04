# SL Options Market — manual acceptance checklist

Run these tests on a local or staging MySQL database after `npm install`, `npm run db:generate`, `npm run db:deploy` and `npm run db:seed`.

## Storefront

- [ ] Home page loads demo products and four categories; responsive at 360, 390, 768, 1024 and 1440 px.
- [ ] Shop search, category filter, sorting and pagination produce correct results.
- [ ] Product details show price in LKR, stock, description and image.
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
