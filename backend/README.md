# UYIH Tree Monitoring API

Backend for the **Green Futures Initiative** tree monitoring platform.

## Stack
- Node.js 20+ / TypeScript
- Express
- PostgreSQL 15+ with PostGIS
- Google OAuth 2.0 + JWT
- Zod for validation (to be added per route)

## Quick start

### 1. Database
```bash
# Create role & database (as superuser)
createuser uyih -P          # password: uyih_secret (or your choice)
createdb -O uyih uyih_trees
psql -d uyih_trees -c "CREATE EXTENSION postgis;"
psql -d uyih_trees -c "CREATE EXTENSION \"uuid-ossp\";"
psql -d uyih_trees -c "CREATE EXTENSION pgcrypto;"

# Run schema
psql -d uyih_trees -f migrations/001_initial_schema.sql
```

### 2. Environment
```bash
cp .env.example .env
# Edit GOOGLE_CLIENT_ID / SECRET and DATABASE_URL
```

### 3. Install & run
```bash
npm install
npm run dev
```

API will be at `http://localhost:4000`

## Schema overview

See `migrations/001_initial_schema.sql` and `../docs/SCHEMA.md`.

Key hierarchy:
```
Project (Green Futures)
  └── School (e.g. a primary school in Narok)
        ├── Plot(s)          ← boundary for satellite canopy analysis
        │     ├── Baseline   ← locked after capture (additionality)
        │     └── Tree(s)    ← QR + GPS + species + batch
        └── Nursery
              └── Seed Batch
```

Monitoring:
- `check_ins` (offline-first, photo + health + optional height/DBH)
- `manual_measurements` (ground truth)
- `canopy_analyses` (plot-level NDVI / canopy %)

Sponsorship & future carbon:
- tiers → sponsorships → trees
- carbon_milestones, revenue_policies, carbon_issuances

## Next steps
1. Implement `/api/v1/trees` (register + list + QR lookup)
2. Implement `/api/v1/check-ins` with offline idempotency
3. Auth middleware + role guards
4. Photo upload (R2 / S3)
5. React PWA frontend
