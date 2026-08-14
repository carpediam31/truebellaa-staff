# TrueBellaa — Staff Console

A separate front-end (Login + Admin + Manager + Marketing/Sales panels) for
your back-office team. This is **not** the customer storefront — that's your
existing `truebellaa-react` project, already wired up. This is the internal
tool your staff use to run the store.

## What's inside

| Screen | Who can use it | What it does |
|---|---|---|
| **Login** | Everyone | Staff sign in with the email/password an Admin gave them. |
| **Dashboard** | Everyone | A quick summary — product count, recent orders, pending reviews, subscriber count, and (Admins/Managers) the recent activity feed. |
| **Products & Stock** | Anyone with `product.view` | Browse every SKU. Admins/Managers can inline-edit price and stock; Sales sees it read-only. |
| **Orders & Shipping** | Anyone with `order.view` | See orders and their status. Admins/Managers can create a Shiprocket shipment for a paid order with one click. |
| **Coupons** | Sales / Admin | Create discount codes, toggle them active/inactive. |
| **Newsletter List** | Sales / Admin | See everyone who subscribed (with a CSV export button). |
| **Reviews** | Sales / Admin | Approve or reject pending product reviews. |
| **Staff & Roles** | Admin only | **This is "Registration."** Create new Manager/Sales/Admin logins, change someone's role, or disable an account. |
| **Activity Log** | Admin / Manager | The full audit trail — logins, logouts, price changes, stock changes, coupon/review actions, everything. |

## Why there's no public "Sign up" page

Staff accounts are **not self-service** on purpose — you don't want a
stranger creating themselves an Admin login. Instead, an Admin (or anyone
you've given `user.manage` permission) creates every staff account from
**Staff & Roles → Add staff (Register)**, picks their role, and hands them
the email + a temporary password. That's the "Registration" screen you
asked for — it just lives behind a login, the same way it would in any real
back-office tool.

The seeded starter accounts (create your own via the UI, or reset these
passwords in the database — see your backend's README):
```
admin@truebellaa.com    → Administrator (full access)
manager@truebellaa.com  → Operations Manager
sales@truebellaa.com    → Marketing & Sales
```

## Run it

```bash
npm install
cp .env.example .env      # defaults point at http://localhost:8000
npm run dev                # http://localhost:5174
```

Make sure your backend (`truebellaa-backend`) is running on port 8000 first
— this app is 100% driven by its API, there's no mock data anywhere.

`.env` options:
```
VITE_API_BASE=http://localhost:8000/api/v1
VITE_TENANT_SLUG=truebellaa
```

## How permissions work here

Every button and every sidebar link checks the logged-in staff member's
`permissions` list (returned by `/api/v1/auth/staff/me`) before showing
itself — the UI never assumes a role. If someone's role changes in
**Staff & Roles**, they'll see the new set of pages next time they load the
app. Manually typing a URL for a page you don't have permission for lands on
a friendly "403" screen instead of a broken page.

## New backend endpoints this frontend needed

Your backend already had login, products, orders, and audit endpoints. To
power the Admin/Manager/Sales panels fully, a few small endpoints were added
to `truebellaa-backend` (all permission-gated the same way as everything
else): staff user management (`/admin/users`, `/admin/roles`), stock
updates (`/admin/variants/{sku}/stock`), and the marketing endpoints
(`/admin/coupons`, `/admin/newsletter`, `/admin/reviews`). If you already
copied an older backend zip, grab the latest one so these routes exist —
otherwise you'll see 404s on the Coupons/Newsletter/Reviews/Staff pages.

## Deploying

```bash
npm run build     # outputs static files to dist/
```
`dist/` is a static site — host it anywhere (Netlify, Vercel, S3, nginx...).
Point `VITE_API_BASE` at your production backend URL before building.
