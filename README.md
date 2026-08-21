# UYIH Tree Monitoring App (Green Futures Initiative)

Web app for **Umoja Youth Impact Hub** to monitor trees from nursery → planting → long-term survival, with data structured for eventual Plan Vivo / Verra / Kenya NEMA carbon-credit certification.

## Current status
- ✅ Full PostgreSQL + PostGIS schema (audit-ready)
- ✅ Backend scaffold (Express + TypeScript + Google OAuth stubs)
- ⏳ Tree registration + QR + GPS
- ⏳ Offline-first check-ins
- ⏳ React + Vite + Tailwind PWA frontend
- ⏳ AI measurement & canopy microservices

## Project structure
```
uyih-tree-monitor/
├── backend/                 # Node.js + Express API
│   ├── migrations/          # 001_initial_schema.sql
│   ├── seeds/
│   └── src/
├── frontend/                # (to be scaffolded) React + Vite + Tailwind PWA
├── docs/
│   └── SCHEMA.md
└── scripts/
```

## Branding cues (from umoja-youth-impact-hub.vercel.app)
- Primary green + orange accents
- Clean modern Tailwind aesthetic
- Focus: Narok County, youth empowerment, environmental stewardship, healthcare access

## Getting started (backend)

See `backend/README.md`.

```bash
cd backend
cp .env.example .env
# set DATABASE_URL and Google OAuth credentials
npm install
# create DB + run migrations (see backend/README)
npm run dev
```

## Auth
Google OAuth is the preferred method. Users land as `donor` by default; admins promote field team / admin roles.

## Next recommended steps
1. Finish auth middleware + role guards
2. Implement tree registration endpoint (QR generation + GPS)
3. Scaffold the React PWA frontend with offline support
4. Photo upload pipeline

Questions or ready for the next milestone? Just say the word.
