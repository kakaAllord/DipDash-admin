# Dipdash Command Center (Admin)

The desktop admin dashboard for the [Dipdash](../README.md) platform.

- **Next.js 16 · React 19 · Tailwind v4 · Drizzle · PostgreSQL**
- Runs on **http://localhost:3002**
- Shares the central `dipdash` Postgres DB (see `.env` → `DATABASE_URL`).
- Default login: **admin / admin123** (from the seed).

## Run

```powershell
npm install
npm run dev      # http://localhost:3002
```

The database is created/seeded from the **student** app (`dipdash`).

## Sections

- **Overview** — order counts, GMV, average cycle metrics (match/prep/transit/
  total from the four timestamps), and a demand‑by‑hour curve.
- **Analytics** — orders by student level (most → never), peak buying hours, and
  the most regular customers (name, level, course, orders, spend).
- **Live map** — courier locations only (students are never shown); free vs.
  on‑delivery couriers use distinct markers, and clicking one shows who they are
  and which order(s) they're carrying.
- **Couriers** — review pending applications (ID photo vs. live selfie), approve
  (the courier then signs in with their admission + password), and open any
  courier's **Details** for documents, phone, reviews, and active/past orders.
- **Order ledger** — every order with its four timestamps; dispute in‑flight ones.
- **Inventory** — toggle menu items in/out of stock platform‑wide in real time.
- **Surge** — set a temporary per‑location delivery surcharge (with reason and an
  optional auto‑end timer) that updates student pricing live over sockets.
- **Escrow** — mediate disputes: approve a deduction (refund student + deduct
  courier deposit + restrict) or dismiss.

## Domain rules

The pricing/risk/escrow logic in `src/lib/domain` is a verbatim copy of the same
modules in the other two repos — keep them in sync.
