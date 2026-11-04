# SL Options Market — Order tracking and product experience

This feature branch builds on the security remediation branch, using the existing React/Node.js/Prisma/MySQL stack and WAMP MySQL (no Docker).

## Customer features
- Account → My purchases → **View details & track**: items, prices, delivery address, actual status history, courier tracking link/number and estimated delivery when provided.
- **View invoice** opens a printable order invoice; when admin marks payment PAID, the label changes to **Payment receipt**. Use browser Print → Save as PDF. An unpaid COD order is not falsely presented as paid.
- Top-bar menus: wishlist previews, account shortcuts/settings/sign-out, and cart item previews/subtotal/checkout links.
- Product page: up to 8 images with thumbnails, enlarged view, short/full descriptions, specs, SKU, low-stock notice and related products.

## Admin features
- Products → **Add product / Edit details** uses a dedicated full-page editor. Up to 8 JPG/PNG/WebP images (5MB each), reorder/remove, up to 12 label/value specifications, optional SKU/summary, category/stock/price/draft/active. First image is the card cover.
- Orders → **View details** shows status timeline, items, invoice/receipt, customer and address. Update fulfilment, payment, courier, tracking number/HTTPS tracking URL and optional delivery estimate.
- Admin sidebar now has a **Sign out** button.

## WAMP upgrade: preserve existing data

The new migration `20261104000100_catalog_gallery_and_order_tracking` adds optional Product fields (gallery JSON, specs JSON, short description, SKU), optional courier fields on Order, and an OrderStatusEvent table. Existing orders are backfilled with only their recorded initial/current statuses; no invented intermediate events. Existing product imageUrl continues to work.

**Back up slstore first in phpMyAdmin and do NOT run prisma migrate reset.**

```powershell
cd C:\wamp\www\html\sl-ecom
git fetch origin
git switch --track origin/feature/store-orders-product-experience-20261104
npm ci
npm run db:generate
npm exec -w apps/api -- prisma validate
npm run db:deploy
npm exec -w apps/api -- prisma migrate status
npm test
npm run build
npm audit
npm run audit:prod
npm run dev
```

If the branch is already local, use `git switch feature/store-orders-product-experience-20261104` and `git pull`. Frontend is http://localhost:5180; admin is http://localhost:5180/admin; API is http://localhost:4010. npm 11 may still show an `npm ls deepmerge-ts` override warning; verify actual installed version and audits rather than forcing Prisma 7.

## Manual acceptance checks

1. Customer can open **their own** order, including invoice and timeline; other customers' order IDs return 404.
2. Pending COD invoice says payment due; a PAID order shows a payment receipt; A4 print looks correct.
3. Admin advances an order status; customer timeline shows only real updates. Going backwards is disallowed. Cancellation before shipping restores stock only once.
4. Admin saves courier name/tracking number/HTTPS URL and customer can follow the courier link.
5. Admin adds an ACTIVE product with 2+ photos and specifications. Verify cover ordering, gallery, related products, cart and checkout.
6. Top-bar menus show account, wishlist and bag previews on desktop and mobile, dismiss on Escape/outside click, and sign-out works.
7. Test responsive layout at 360/390/700/1440px, and test existing COD checkout after migration.

## Important notes

The in-app timeline tracks **order status**, not real-time GPS location. Courier tracking only works when the admin provides an external courier URL. The printable order invoice/receipt is **not automatically a Sri Lankan VAT/tax invoice**; finalize legally required merchant address, tax details and invoice numbering before issuing official tax invoices. Existing uploaded images must be backed up from `apps/api/uploads`. All new features require a browser + MySQL smoke test before merging into main.
