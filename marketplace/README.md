# Marketly — multi-vendor marketplace

A multi-vendor e-commerce marketplace (think Amazon Marketplace or eMAG): independent shops register, list products and sell to customers through a single cart and checkout. The platform takes a commission on every sale and pays out each vendor's share.

**Stack:** Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma · Auth.js v5 · Stripe Connect (with a built-in local provider for development) · Cloudinary or S3 for images.

## Features

**Customers**
- Browse and search the catalogue: keyword search across titles, descriptions and shop names; category tree; price and in-stock filters; sorting; pagination
- Product pages with an image gallery, stock levels, reviews from verified buyers and more products from the same shop
- Shop storefronts with their own search and filters
- One cart across many shops (works for guests), grouped by shop with per-shop shipping
- A single checkout and payment covering every shop, plus order history with per-shop status and tracking

**Vendors**
- Sign up as a seller, or turn an existing customer account into one at `/sell`
- Dashboard with 30-day sales, orders waiting to ship, pending and paid-out payouts, and low-stock alerts
- Product management: create and edit products, upload multiple images, set compare-at prices, stock and SKUs, and switch between draft, active and archived
- Order fulfilment: processing → shipped (with tracking) → delivered, or cancel with an automatic refund
- Payout onboarding through Stripe Connect Express, with a link to the Stripe dashboard
- Shop profile with logo, banner and description

**Admins**
- Overview: GMV, commission revenue, top shops, payouts owed, failed transfers
- Vendor moderation: approve, suspend or reactivate shops, and set a commission rate per shop
- Category tree management and a list of all orders

**Platform**
- Role-based access (`CUSTOMER`, `VENDOR`, `ADMIN`): `src/proxy.ts` redirects early, and every page and server action checks permissions again on the server
- Mobile-first, responsive UI

## How the money flows

```
Customer pays once ──► Platform account (one charge for the whole cart)
                          │
                          ├─► Vendor A: subtotal + shipping − commission   (transfer when A ships)
                          ├─► Vendor B: subtotal + shipping − commission   (transfer when B ships)
                          └─► Platform keeps Σ commission
```

- **Order model.** A checkout creates one `Order`, split into one `VendorOrder` per shop. Each `VendorOrder` stores its subtotal, shipping, the commission rate captured at checkout, the commission and the payout. Changing a shop's rate later never rewrites past orders.
- **Commission** applies to goods only, not shipping. The rate is the shop's override if it has one, otherwise `DEFAULT_COMMISSION_BPS`. Amounts are integer minor units, rounded half-up. The pure function `src/lib/pricing.ts` does all of this and has unit tests, including a check that the customer total always equals vendor payouts plus commission.
- **Stripe Connect.** The integration uses *separate charges and transfers*. A Checkout Session with a `transfer_group` charges the customer once. When a vendor marks their part of the order as shipped, `stripe.transfers.create` (linked to the charge with `source_transaction`) pays the vendor's Express account. Holding payouts until shipment protects buyers. A vendor who cancels before shipping triggers a partial refund of their share.
- **Stock** is reserved with a conditional decrement in the same transaction that creates the order, so concurrent buyers can't oversell. Stock is released if the customer abandons checkout, if the Stripe session expires (webhook), or if the vendor cancels.
- **Webhooks** (`/api/webhooks/stripe`) are verified and stored in `WebhookEvent` so each one is handled only once:
  - `checkout.session.completed` / `async_payment_succeeded` marks the order paid.
  - `checkout.session.expired` / `async_payment_failed` cancels the order and restocks.
  - `account.updated` syncs whether the vendor can receive payouts and retries payouts that are waiting.
  - A payment that arrives for an order already cancelled is refunded automatically.
- **Pluggable provider.** `src/lib/payments/types.ts` defines the `PaymentProvider` interface. A regional processor (e.g. a local marketplace payment provider such as Netopia, Mangopay or Adyen for Platforms) can be added by implementing that interface. The bundled `local` provider simulates payments so the whole flow runs without any accounts.

## Getting started

Requirements: Node.js 20.9+ and PostgreSQL 14+.

```bash
cd marketplace
cp .env.example .env          # set DATABASE_URL and AUTH_SECRET (npx auth secret)
npm install                   # also runs `prisma generate`
npx prisma migrate deploy     # or `npm run db:migrate` while developing the schema
npm run db:seed               # demo shops, products, users (+ generates demo images)
npm run dev                   # http://localhost:3000
```

Demo accounts (password `password123`):

| Email | Role |
| --- | --- |
| `admin@example.com` | Admin |
| `customer@example.com` | Customer |
| `vendor1@example.com`, `vendor2@example.com`, `vendor3@example.com` | Vendors with approved shops (vendor3 has an 8% commission override) |
| `pending@example.com` | Vendor whose shop is awaiting approval |

Without Stripe keys, the app uses the **local payment provider** in development. Checkout redirects to a test payment page in the app, and payouts are recorded without moving money. In production, it refuses to fall back to this silently, so set `PAYMENT_PROVIDER=local` yourself if you want a demo deployment.

### Stripe Connect

1. Enable Connect in the Stripe dashboard (Express accounts).
2. Set `STRIPE_SECRET_KEY` (and optionally `PAYMENT_PROVIDER=stripe`).
3. Forward webhooks locally and copy the signing secret into `STRIPE_WEBHOOK_SECRET`:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe \
     --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,account.updated
   ```
   In production, add an endpoint with the same events. Listen to events on connected accounts as well, so `account.updated` arrives.
4. Vendors connect payouts from **Seller dashboard → Shop & payouts**.

The platform account pays Stripe's processing fees, because it is the merchant of record for each charge. Account for this when you set `DEFAULT_COMMISSION_BPS`.

### Image storage

`src/lib/storage` uses the first backend that is configured:

1. **Cloudinary**: set `CLOUDINARY_URL`, or `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`.
2. **S3 or S3-compatible storage** (R2, MinIO): set `S3_BUCKET`, `S3_REGION`, optionally `S3_ENDPOINT`, and `S3_PUBLIC_URL` for a CDN. Credentials come from the standard AWS chain.
3. **Local disk** (development only): files go to `./.uploads` and are served by `/api/uploads/...`.

Uploads are limited to JPEG, PNG, WebP and AVIF files of 5 MB or less, with up to 8 images per product.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server, production build, production server |
| `npm run lint` / `typecheck` / `test` | ESLint, `tsc --noEmit`, Vitest unit tests |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:reset` | Prisma migrations and demo data |

The demo images live in `public/` and are generated by `npm run db:seed`. `next start` only serves `public/` files that existed when it started, so run the seed before starting the server.

## Project layout

```
prisma/               schema, migrations, seed
src/
  auth.ts             Auth.js config (credentials + optional Google), role in JWT
  proxy.ts            route protection for /admin, /vendor, /account, /checkout
  app/                routes: storefront, cart & checkout, account, vendor, admin, API
  components/         UI (server components by default, client islands for forms)
  lib/
    pricing.ts        commission / payout / shipping math (unit tested)
    payments/         PaymentProvider interface, Stripe Connect + local providers
    storage/          Cloudinary / S3 / local image storage
  server/
    orders.ts         place order, mark paid, fulfilment state machine, payouts, refunds
    cart.ts           cookie-backed cart
    guards.ts         requireUser / requireRole / requireShop
    actions/          server actions (auth, cart, checkout, vendor, admin, reviews)
```

## Production notes

- Set `APP_URL` to the public origin. It is used in payment redirects and onboarding links.
- Run `prisma migrate deploy` during deployment.
- Before high traffic, consider:
  - Postgres full-text search or a search service in place of `ILIKE` queries.
  - A scheduled job that calls `retryDuePayouts()` and expires stale unpaid local orders.
  - Transactional emails for order confirmations and shipping updates.
