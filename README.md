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
- **Couriers** — review pending applications (ID photo vs. live selfie), approve
  to issue an activation token, and see the courier pool with deposits/ceilings.
- **Order ledger** — every order with its four timestamps; dispute in‑flight ones.
- **Inventory** — toggle menu items in/out of stock platform‑wide in real time.
- **Escrow** — mediate disputes: approve a deduction (refund student + deduct
  courier deposit + restrict) or dismiss.

## Domain rules

The pricing/risk/escrow logic in `src/lib/domain` is a verbatim copy of the same
modules in the other two repos — keep them in sync.
