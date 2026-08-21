# UYIH Tree Monitoring — Database Schema Guide

## Design principles
1. **Audit-ready from day one** — every data point needed for Plan Vivo / Verra / NEMA is collected as part of normal operations.
2. **School / Plot hierarchy** — supports nationwide expansion without schema changes.
3. **Baselines are locked** — additionality evidence cannot be reconstructed later.
4. **Offline-first friendly** — check-ins carry `client_id` for idempotent sync.
5. **PostGIS** — tree points + plot polygons enable spatial queries and future satellite analysis.

## Core tables

| Table | Purpose |
|-------|---------|
| `users` | Google OAuth users + roles (field_team, admin, donor, auditor) |
| `projects` | Top-level grouped project (one PIN / PDD) |
| `schools` | Partner schools / community sites |
| `plots` | Planting areas with optional polygon boundary |
| `plot_baselines` | Pre-planting evidence (locked once complete) |
| `nurseries` | On-school nurseries |
| `species` | Tree species + growth curve placeholders |
| `seed_batches` | Propagation tracking (germination → transplant) |
| `trees` | Individual trees (QR, GPS, status, sponsor link) |
| `check_ins` | Recurring field observations + photos |
| `manual_measurements` | High-accuracy ground truth |
| `canopy_analyses` | Plot-level satellite NDVI / canopy cover |
| `sponsorship_tiers` | Individual vs corporate packages |
| `sponsorships` + `sponsorship_trees` | Donor ownership |
| `field_badges` + `user_badges` + `field_streaks` | Gamification |
| `carbon_milestones` | PIN → PDD → verification → issuance |
| `revenue_policies` | Community / sanitary products split model |
| `change_log` | Soft audit trail for critical tables |

## Useful views
- `v_tree_summary` — denormalized tree + school + sponsor
- `v_school_survival` — survival rate per school (leaderboard source)
- `v_field_leaderboard` — check-in activity by field team

## Carbon readiness mapping

| Certification need | How the schema supports it |
|--------------------|----------------------------|
| Project boundary   | `plots.boundary` (PostGIS polygon) |
| Additionality      | Locked `plot_baselines` |
| Species & provenance | `species` + `seed_batches` |
| Planting evidence  | `trees` + registration GPS + photos via check-ins |
| Monitoring         | `check_ins`, `manual_measurements`, `canopy_analyses` |
| Permanence / survival | Status history + survival views |
| Community benefit  | `revenue_policies` + future issuance records |

## Next schema iterations (planned)
- Photo metadata table (EXIF, AI analysis results)
- Offline sync queue / conflict resolution log
- Materialized views for heavy dashboard aggregations
- Row-level security (RLS) for multi-tenant isolation if needed
