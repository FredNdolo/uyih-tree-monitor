# UYIH Tree Monitoring App — Progress Checklist

Last updated: 14 August 2026

---

## Phase 0 — Foundation

- [x] Project scaffold created
- [x] Full PostgreSQL + PostGIS schema designed & applied
- [x] Neon database connected
- [x] Seed data loaded (project, school, species, tiers, badges)
- [x] Google OAuth credentials set up
- [x] Backend API running (`npm run dev`)
- [x] Health endpoint working
- [ ] Auth middleware + JWT protection
- [ ] Role-based access control (field_team / admin / donor / auditor)

---

## Phase 1 — Core Backend APIs

- [ ] Schools & Plots endpoints (list / create / get)
- [ ] Species & Seed Batches endpoints
- [ ] **Tree registration** (QR generation + GPS + species + batch)
- [ ] Tree lookup by QR code
- [ ] Check-in API (photo, health status, GPS, offline-friendly `client_id`)
- [ ] Manual measurements endpoint
- [ ] Basic sponsorship / “my trees” endpoints for donors

---

## Phase 2 — Frontend (React + Vite + Tailwind PWA)

- [ ] Frontend scaffold (matching UYIH green + orange branding)
- [ ] Google login flow (frontend ↔ backend)
- [ ] Field team: Tree registration screen (camera + GPS)
- [ ] Field team: Check-in screen (offline support)
- [ ] Admin / M&E dashboard (basic stats)
- [ ] Donor “My Tree” page
- [ ] PWA setup (installable + offline queue)

---

## Phase 3 — Offline & Media

- [ ] Photo upload (Cloudflare R2 or S3-compatible)
- [ ] Offline queue + sync when back online
- [ ] Reference-object photo support (for future AI measurement)

---

## Phase 4 — Monitoring & Reporting

- [ ] School survival leaderboard
- [ ] Field team streaks & badges
- [ ] Internal progress dashboard
- [ ] Donor progress reports
- [ ] Audit-ready data export

---

## Phase 5 — Advanced / Future

- [ ] AI height & diameter estimation (Python microservice)
- [ ] Plot-level satellite canopy analysis
- [ ] Carbon milestone tracking (PIN → PDD → verification)
- [ ] Revenue split modeling
- [ ] Nationwide expansion support (more schools/plots)

---

## Immediate Next Steps (Recommended Order)

1. Auth middleware + role guards
2. Schools & Plots API
3. Tree registration API
4. Frontend scaffold + login
5. Field registration + check-in screens

---

## Notes

- Stack: React + Vite + Tailwind (frontend) · Node/Express + PostgreSQL/PostGIS (backend)
- Auth: Google OAuth → JWT
- Carbon readiness is a 2-year framework, not immediate revenue
- Data model already supports Plan Vivo / Verra / NEMA audit needs