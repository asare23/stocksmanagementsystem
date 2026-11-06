# Stock Management System (SMS)

A full-stack inventory & spare-parts management platform built from the
requirements specification: Product Setup → Purchasing → Receiving → Stock →
Sales → Returns → Adjustments → Reporting, with an immutable inventory ledger
underneath everything.

**Stack:** React 18 + Vite + Tailwind (frontend) · Node.js/Express + Prisma +
PostgreSQL (backend) · JWT auth with role/permission-based access control.

## What's implemented (Phase 1 + most of Phase 2)

- **Auth & RBAC** — JWT login/refresh, password hashing, account lockout after
  5 failed attempts, 7 seeded roles (Super Admin, Stock Manager, Procurement
  Officer, Sales Officer, Cashier, Accountant, Auditor) each with a granular
  permission set (`PRODUCT_CREATE`, `STOCK_ADJUST`, `PURCHASE_APPROVE`, ...).
- **Organization** — Company → Branch → Warehouse → (rack/shelf/bin) location.
- **Products** — categories (hierarchical), brands, units, barcodes, vehicle
  compatibility (make/model/year/position) for spare parts, serial/batch
  tracking flags, multiple price levels with a logged price-history table.
- **Suppliers & Customers** — full contact/credit/payment-terms records.
- **Purchasing** — Purchase Orders (DRAFT → PENDING_APPROVAL → APPROVED →
  PARTIALLY/FULLY_RECEIVED → CLOSED, with CANCELLED) → Goods Receipts. Stock
  only increases when a GRN is **confirmed**, never on PO creation.
- **The inventory ledger** — every stock movement (purchase, sale, transfer
  in/out, customer/supplier return, adjustment in/out, opening stock) writes
  an `InventoryTransaction` row with a running balance, inside the same DB
  transaction as the cached `Inventory.quantityOnHand` update. This is the
  core design principle from the spec: Product = _what_, Inventory = _how
  much_, InventoryTransaction = _why it changed_.
- **Stock Transfers** — REQUESTED → APPROVED → DISPATCHED (stock leaves
  source) → RECEIVED (stock lands at destination) → COMPLETED.
- **Stock Adjustments** — reasoned (damaged/lost/expired/theft/counting
  error/...), require approval, post to the ledger on approval, and can be
  reversed without deleting history.
- **Stock Counts / physical inventory** — snapshot system qty → enter
  physical qty → auto-computed difference → approve, which generates and
  posts a stock adjustment automatically.
- **Sales / POS** — atomic cart → invoice → payment → stock-out in one DB
  transaction; partial payments; full sale reversal that restores stock.
- **Customer & Supplier Returns** — linked to the original invoice/GRN, with
  condition-aware stock impact and refund tracking.
- **Dashboard** — KPIs (products, stock units, inventory value, today's
  sales/purchases, low/out-of-stock counts, pending POs) + sales trend and
  top-product charts.
- **Reports** — current stock, valuation, dead/fast/slow-moving stock, sales
  by period/product/category/salesperson/branch/customer, profit by product,
  purchase history, outstanding POs, supplier performance, financial summary.
- **Audit log** — every write action is recorded with user, action,
  before/after values and timestamp.

## What's deliberately out of scope for this pass

Per the requirements doc's own phasing (Phase 3/4): demand forecasting,
notification delivery (schema exists, no email/SMS sending wired up), 2FA,
SSO, multi-company, barcode-scanner hardware integration, and a small number
of report variants. The data model (`schema.prisma`) already has the tables
for serial/batch tracking and vehicle compatibility; the UI exposes the
tracking flags but not full serial/batch entry screens yet — extend
`GoodsReceipts.jsx` and the `ProductSerial`/`ProductBatch` tables when you're
ready for that.

## Project layout

```
backend/    Node/Express API, Prisma schema, seed script
frontend/   React/Vite/Tailwind SPA
```

## Getting started

-

```bash
# example with Docker
docker run --name sms-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
```

### 2. Backend

```bash
cd backend
cp .env.example .env        # edit DATABASE_URL, JWT secrets
npm install
npx prisma migrate dev --name init   # creates tables
npm run prisma:seed                  # roles, permissions, admin user, sample data
npm run dev                          # starts on http://localhost:4000
```

Seeded login: **admin@sms.local / Admin@12345** (Super Admin). The seed
script also creates one user per role with password `Password@123` — see the
seed script's console output for the emails.

> This project was built and syntax-checked in a sandboxed environment that
> could not reach `binaries.prisma.sh` to download the Prisma query engine,
> so `prisma generate`/`migrate` could not be run there. Run those two
> commands yourself the first time you set this up locally — they need
> normal internet access, same as any other npm/Prisma project.

### 3. Frontend

```bash
cd frontend
cp .env.example .env        # VITE_API_URL, defaults to http://localhost:4000/api
npm install
npm run dev                 # starts on http://localhost:5173
```

Open http://localhost:5173 and log in with the seeded admin account.

### 4. Production build

```bash
cd frontend && npm run build     # outputs frontend/dist — serve as static files
cd backend && npm start          # or run behind pm2/systemd + a reverse proxy
```

## Key design notes

- **Atomicity** (req #48.3): every stock-affecting operation (GRN confirm,
  sale, transfer dispatch/receive, adjustment approval, stock count posting)
  runs inside `prisma.$transaction(...)`, so the inventory update, the ledger
  row, and the business-record status change all commit or roll back
  together.
- **No hard deletes on transactional data** (req #49): products are
  deactivated, not deleted; sales/adjustments/transfers are reversed via a
  controlled reversal that posts the opposite ledger entry, never by editing
  history.
- **Negative stock** is blocked by default per product; set a product's
  `allowNegativeStock` flag to permit it.
- **Permissions** are enforced server-side on every route (`requirePermission`
  middleware) — the frontend's `PermissionGate` only hides buttons for UX,
  it isn't the security boundary.

## Extending this

- Add remaining serial/batch entry UI on top of the existing `ProductSerial`/
  `ProductBatch` tables.
- Wire the `Notification` table to an email/SMS sender and a cron job that
  checks reorder levels, expiring batches, and overdue payments.
- Swap the numbering scheme in `codeGenerator.js` for a Postgres `SEQUENCE`
  or a per-type counter row before running this under real concurrency.

  Login as: admin@sms.local / Admin@12345 (SUPER_ADMIN)
  Other seeded users (password: Password@123):
  stock.manager@sms.local
  procurement.officer@sms.local
  sales.officer@sms.local
  cashier@sms.local
  accountant@sms.local
  auditor@sms.local
