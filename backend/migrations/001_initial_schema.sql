-- =============================================================================
-- UYIH Tree Monitoring App — Full PostgreSQL + PostGIS Schema
-- Designed for Plan Vivo / Verra / Kenya NEMA-DNA carbon credit readiness
-- Hierarchy: Project → School → Plot → Nursery → Seed Batch → Tree
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. USERS & AUTH (Google OAuth primary)
-- =============================================================================

CREATE TYPE user_role AS ENUM (
  'field_team',      -- Girl Guides / UYIH volunteers / coordinators
  'admin',           -- UYIH admin / M&E
  'donor',           -- Individual or CSR sponsor
  'auditor',         -- Read-only future access
  'super_admin'      -- Platform level
);

CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_id         TEXT UNIQUE,                    -- Google sub claim
  email             TEXT UNIQUE NOT NULL,
  email_verified    BOOLEAN DEFAULT false,
  full_name         TEXT,
  phone             TEXT,
  avatar_url        TEXT,
  role              user_role NOT NULL DEFAULT 'donor',
  is_active         BOOLEAN DEFAULT true,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_role ON users(role);

-- Field team members can be linked to specific schools (many-to-many)
CREATE TABLE field_team_assignments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id         UUID NOT NULL,                  -- FK added after schools table
  is_primary        BOOLEAN DEFAULT false,
  assigned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, school_id)
);

-- =============================================================================
-- 2. PROJECT & ORGANIZATIONAL HIERARCHY
-- =============================================================================

-- Top-level grouped/phased project (one registration with Plan Vivo / Verra)
CREATE TABLE projects (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,                  -- e.g. "Green Futures Initiative"
  code              TEXT UNIQUE NOT NULL,           -- e.g. "GFI-2025"
  description       TEXT,
  standard          TEXT[],                         -- {'Plan Vivo', 'Verra VCS', 'NEMA'}
  pin_reference     TEXT,                           -- Plan Vivo PIN number
  pdd_reference     TEXT,                           -- Project Design Document ref
  status            TEXT NOT NULL DEFAULT 'design', -- design | active | verification | issued
  start_date        DATE,
  expected_end_date DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Schools (or community sites) — expansion ready for nationwide 2027+
CREATE TABLE schools (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID NOT NULL REFERENCES projects(id),
  name              TEXT NOT NULL,
  code              TEXT UNIQUE,                    -- internal short code
  county            TEXT NOT NULL,                  -- e.g. Narok
  sub_county        TEXT,
  ward              TEXT,
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  location          GEOGRAPHY(POINT, 4326),         -- PostGIS point
  contact_name      TEXT,
  contact_phone     TEXT,
  contact_email     TEXT,
  land_agreement_ref TEXT,                          -- legal/land agreement document ref
  agreement_signed_at DATE,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schools_project ON schools(project_id);
CREATE INDEX idx_schools_location ON schools USING GIST(location);

-- Now add the FK that was deferred
ALTER TABLE field_team_assignments
  ADD CONSTRAINT fk_fta_school
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Plots (planting areas within a school). Boundaries for canopy analysis.
CREATE TABLE plots (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,                  -- e.g. "Plot A – Behind admin block"
  code              TEXT,
  area_hectares     NUMERIC(10,4),
  boundary          GEOGRAPHY(POLYGON, 4326),       -- plot polygon for satellite analysis
  centroid          GEOGRAPHY(POINT, 4326),
  elevation_m       NUMERIC(8,2),
  soil_type         TEXT,
  baseline_locked   BOOLEAN DEFAULT false,          -- once true, baseline cannot be edited
  baseline_locked_at TIMESTAMPTZ,
  baseline_locked_by UUID REFERENCES users(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plots_school ON plots(school_id);
CREATE INDEX idx_plots_boundary ON plots USING GIST(boundary);

-- =============================================================================
-- 3. NURSERY & PROPAGATION
-- =============================================================================

CREATE TABLE nurseries (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id         UUID NOT NULL REFERENCES schools(id),
  name              TEXT NOT NULL,
  code              TEXT,
  capacity          INTEGER,                        -- max seedlings
  location          GEOGRAPHY(POINT, 4326),
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE species (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scientific_name   TEXT NOT NULL,
  common_name       TEXT NOT NULL,                  -- e.g. "Croton megalocarpus", "Mukinduri"
  local_name        TEXT,                           -- Maasai / local language
  growth_curve_json JSONB,                          -- expected height/dbh over years by zone
  carbon_factor     NUMERIC(8,4),                   -- tCO2e per tree or per ha (placeholder)
  is_native         BOOLEAN DEFAULT true,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE seed_batches (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id        UUID NOT NULL REFERENCES nurseries(id),
  species_id        UUID NOT NULL REFERENCES species(id),
  batch_code        TEXT NOT NULL,                  -- unique human-readable
  seed_source       TEXT,                           -- provenance
  collection_date   DATE,
  sowing_date       DATE,
  quantity_sown     INTEGER,
  germination_count INTEGER,
  germination_rate  NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN quantity_sown > 0 THEN ROUND((germination_count::numeric / quantity_sown) * 100, 2)
         ELSE NULL END
  ) STORED,
  transplant_ready_date DATE,
  status            TEXT DEFAULT 'sown',            -- sown | germinating | ready | transplanted | depleted
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(nursery_id, batch_code)
);

CREATE INDEX idx_seed_batches_nursery ON seed_batches(nursery_id);
CREATE INDEX idx_seed_batches_species ON seed_batches(species_id);

-- =============================================================================
-- 4. BASELINE DOCUMENTATION (locked once complete — additionality critical)
-- =============================================================================

CREATE TABLE plot_baselines (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plot_id           UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by       UUID REFERENCES users(id),
  
  -- Pre-planting evidence
  existing_tree_count INTEGER DEFAULT 0,
  existing_canopy_cover_pct NUMERIC(5,2),
  land_use_history  TEXT,                           -- agricultural, degraded, etc.
  degradation_notes TEXT,
  photos            JSONB,                          -- array of photo URLs + captions
  satellite_snapshot_url TEXT,
  ndvi_baseline     NUMERIC(6,4),                   -- if available
  
  -- Socio-economic / additionality notes
  additionality_justification TEXT,
  
  is_locked         BOOLEAN DEFAULT false,
  locked_at         TIMESTAMPTZ,
  locked_by         UUID REFERENCES users(id),
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plot_id)                                   -- one active baseline per plot
);

-- =============================================================================
-- 5. TREES (core entity)
-- =============================================================================

CREATE TYPE tree_status AS ENUM (
  'registered',
  'alive',
  'stressed',
  'dead',
  'replaced',
  'harvested'           -- for future agroforestry if needed
);

CREATE TABLE trees (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_code           TEXT UNIQUE NOT NULL,           -- unique QR payload / short code
  plot_id           UUID NOT NULL REFERENCES plots(id),
  species_id        UUID NOT NULL REFERENCES species(id),
  seed_batch_id     UUID REFERENCES seed_batches(id),
  
  -- Registration data
  registered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  registered_by     UUID REFERENCES users(id),
  planting_date     DATE,
  
  -- Location (captured at registration + every check-in)
  latitude          DOUBLE PRECISION NOT NULL,
  longitude         DOUBLE PRECISION NOT NULL,
  location          GEOGRAPHY(POINT, 4326) NOT NULL,
  accuracy_m        NUMERIC(6,2),                   -- GPS accuracy
  
  -- Current state
  status            tree_status NOT NULL DEFAULT 'registered',
  current_height_cm NUMERIC(8,2),
  current_dbh_cm    NUMERIC(8,2),                   -- diameter at breast height
  last_check_in_at  TIMESTAMPTZ,
  
  -- Sponsorship / donor link (optional)
  sponsor_user_id   UUID REFERENCES users(id),      -- individual donor
  sponsorship_tier  TEXT,                           -- linked to tiers table
  
  -- Audit / carbon readiness
  expected_survival_year5 NUMERIC(5,2),             -- from growth curve
  notes             TEXT,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trees_plot ON trees(plot_id);
CREATE INDEX idx_trees_qr ON trees(qr_code);
CREATE INDEX idx_trees_location ON trees USING GIST(location);
CREATE INDEX idx_trees_sponsor ON trees(sponsor_user_id);
CREATE INDEX idx_trees_status ON trees(status);
CREATE INDEX idx_trees_species ON trees(species_id);

-- =============================================================================
-- 6. MONITORING: CHECK-INS (offline-first friendly)
-- =============================================================================

CREATE TYPE health_status AS ENUM (
  'healthy',
  'stressed',
  'diseased',
  'damaged',
  'dead',
  'missing'
);

CREATE TABLE check_ins (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id           UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  checked_by        UUID REFERENCES users(id),
  
  -- When & where
  checked_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  location          GEOGRAPHY(POINT, 4326),
  accuracy_m        NUMERIC(6,2),
  
  -- Observations
  health_status     health_status NOT NULL,
  height_cm         NUMERIC(8,2),                   -- estimated or measured
  dbh_cm            NUMERIC(8,2),
  notes             TEXT,
  
  -- Media (stored as URLs or object keys; offline clients queue uploads)
  photo_urls        JSONB DEFAULT '[]',             -- array of storage URLs
  reference_photo_url TEXT,                         -- photo with known-size object for AI scale
  
  -- Offline sync metadata
  client_id         TEXT,                           -- device-generated UUID for idempotency
  synced_at         TIMESTAMPTZ,
  is_offline_origin BOOLEAN DEFAULT false,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_check_ins_tree ON check_ins(tree_id);
CREATE INDEX idx_check_ins_checked_at ON check_ins(checked_at DESC);
CREATE INDEX idx_check_ins_client_id ON check_ins(client_id);

-- Periodic high-accuracy manual measurements (ground truth for AI validation)
CREATE TABLE manual_measurements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id           UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  measured_by       UUID REFERENCES users(id),
  measured_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  height_cm         NUMERIC(8,2) NOT NULL,
  dbh_cm            NUMERIC(8,2),
  method            TEXT,                           -- clinometer, measuring tape, etc.
  notes             TEXT,
  photo_url         TEXT,
  
  -- Links to any AI estimate this validates
  validates_check_in_id UUID REFERENCES check_ins(id),
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_manual_meas_tree ON manual_measurements(tree_id);

-- =============================================================================
-- 7. PLOT-LEVEL SATELLITE / CANOPY ANALYSIS
-- =============================================================================

CREATE TABLE canopy_analyses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plot_id           UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  analysis_date     DATE NOT NULL,
  source            TEXT,                           -- Sentinel-2, Planet, etc.
  ndvi_mean         NUMERIC(6,4),
  ndvi_std          NUMERIC(6,4),
  canopy_cover_pct  NUMERIC(5,2),
  imagery_url       TEXT,
  raw_result_json   JSONB,                          -- full model output
  processed_by      TEXT DEFAULT 'pending',         -- service name / version
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plot_id, analysis_date, source)
);

CREATE INDEX idx_canopy_plot ON canopy_analyses(plot_id);

-- =============================================================================
-- 8. SPONSORSHIP TIERS & DONOR EXPERIENCE
-- =============================================================================

CREATE TABLE sponsorship_tiers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,                  -- e.g. "Guardian", "Grove", "Forest"
  code              TEXT UNIQUE NOT NULL,
  min_trees         INTEGER NOT NULL,
  max_trees         INTEGER,                        -- null = unlimited
  is_corporate      BOOLEAN DEFAULT false,          -- CSR vs individual
  price_kes         NUMERIC(12,2),
  price_usd         NUMERIC(12,2),
  benefits_json     JSONB,                          -- features unlocked
  monitoring_level  TEXT,                           -- basic | standard | premium
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sponsorships (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_user_id   UUID NOT NULL REFERENCES users(id),
  tier_id           UUID REFERENCES sponsorship_tiers(id),
  school_id         UUID REFERENCES schools(id),    -- preferred school if any
  tree_count        INTEGER NOT NULL,
  amount_paid       NUMERIC(12,2),
  currency          TEXT DEFAULT 'KES',
  payment_ref       TEXT,
  status            TEXT DEFAULT 'active',          -- pending | active | expired
  started_at        TIMESTAMPTZ DEFAULT NOW(),
  ends_at           TIMESTAMPTZ,
  certificate_url   TEXT,                           -- shareable growth certificate
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link individual trees to a sponsorship package
CREATE TABLE sponsorship_trees (
  sponsorship_id    UUID NOT NULL REFERENCES sponsorships(id) ON DELETE CASCADE,
  tree_id           UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  PRIMARY KEY (sponsorship_id, tree_id)
);

-- =============================================================================
-- 9. GAMIFICATION (built on existing check-in data)
-- =============================================================================

CREATE TABLE field_badges (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code              TEXT UNIQUE NOT NULL,           -- e.g. "streak_7", "survival_champion"
  name              TEXT NOT NULL,
  description       TEXT,
  icon_url          TEXT,
  criteria_json     JSONB                           -- rule definition
);

CREATE TABLE user_badges (
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id          UUID NOT NULL REFERENCES field_badges(id) ON DELETE CASCADE,
  awarded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context_json      JSONB,                          -- e.g. school, streak length
  PRIMARY KEY (user_id, badge_id)
);

-- Simple streak tracking (can be materialized view later)
CREATE TABLE field_streaks (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak    INTEGER DEFAULT 0,
  longest_streak    INTEGER DEFAULT 0,
  last_check_in_date DATE,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 10. CARBON CREDIT & REVENUE MODELING (future-ready)
-- =============================================================================

CREATE TABLE carbon_milestones (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID NOT NULL REFERENCES projects(id),
  milestone         TEXT NOT NULL,                  -- PIN | PDD | validation | verification | issuance
  status            TEXT DEFAULT 'pending',
  completed_at      DATE,
  reference_doc     TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE revenue_policies (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID NOT NULL REFERENCES projects(id),
  name              TEXT NOT NULL,                  -- e.g. "Default 2026 split"
  community_share_pct NUMERIC(5,2) NOT NULL,        -- typically ≥60 for Plan Vivo
  sanitary_products_pct NUMERIC(5,2),               -- portion of community share
  other_resources_pct NUMERIC(5,2),
  uyih_ops_pct      NUMERIC(5,2),
  is_active         BOOLEAN DEFAULT true,
  effective_from    DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Placeholder for future issuance records
CREATE TABLE carbon_issuances (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID NOT NULL REFERENCES projects(id),
  vintage_year      INTEGER,
  credits_issued    NUMERIC(12,4),                  -- tCO2e
  registry          TEXT,                           -- Plan Vivo, Verra, Kenya DNA
  serial_numbers    TEXT,
  issued_at         DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 11. AUDIT & REPORTING SUPPORT
-- =============================================================================

CREATE TABLE audit_exports (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requested_by      UUID REFERENCES users(id),
  export_type       TEXT NOT NULL,                  -- full | plot | period | donor
  filters_json      JSONB,
  file_url          TEXT,
  status            TEXT DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

-- Soft-delete / change log for critical tables (trees, baselines, measurements)
CREATE TABLE change_log (
  id                BIGSERIAL PRIMARY KEY,
  table_name        TEXT NOT NULL,
  record_id         UUID NOT NULL,
  action            TEXT NOT NULL,                  -- INSERT | UPDATE | DELETE
  old_data          JSONB,
  new_data          JSONB,
  changed_by        UUID REFERENCES users(id),
  changed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_change_log_table_record ON change_log(table_name, record_id);

-- =============================================================================
-- 12. HELPER FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_schools_updated BEFORE UPDATE ON schools
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_plots_updated BEFORE UPDATE ON plots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_trees_updated BEFORE UPDATE ON trees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_seed_batches_updated BEFORE UPDATE ON seed_batches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Keep tree location geography in sync with lat/lon
CREATE OR REPLACE FUNCTION sync_tree_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trees_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON trees
  FOR EACH ROW EXECUTE FUNCTION sync_tree_location();

-- Same for schools & check-ins (optional convenience)
CREATE OR REPLACE FUNCTION sync_point_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_schools_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON schools
  FOR EACH ROW EXECUTE FUNCTION sync_point_location();

CREATE TRIGGER trg_checkins_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON check_ins
  FOR EACH ROW EXECUTE FUNCTION sync_point_location();

-- Prevent editing locked baselines
CREATE OR REPLACE FUNCTION prevent_locked_baseline_edit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_locked = true THEN
    RAISE EXCEPTION 'Baseline for plot % is locked and cannot be modified', OLD.plot_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_baseline_lock
  BEFORE UPDATE ON plot_baselines
  FOR EACH ROW EXECUTE FUNCTION prevent_locked_baseline_edit();

-- =============================================================================
-- 13. USEFUL VIEWS FOR DASHBOARDS & REPORTING
-- =============================================================================

CREATE OR REPLACE VIEW v_tree_summary AS
SELECT
  t.id,
  t.qr_code,
  t.status,
  t.planting_date,
  t.current_height_cm,
  t.current_dbh_cm,
  t.last_check_in_at,
  s.common_name AS species,
  p.name AS plot_name,
  sch.name AS school_name,
  sch.county,
  t.sponsor_user_id,
  u.full_name AS sponsor_name
FROM trees t
JOIN species s ON s.id = t.species_id
JOIN plots p ON p.id = t.plot_id
JOIN schools sch ON sch.id = p.school_id
LEFT JOIN users u ON u.id = t.sponsor_user_id;

CREATE OR REPLACE VIEW v_school_survival AS
SELECT
  sch.id AS school_id,
  sch.name AS school_name,
  COUNT(t.id) AS total_trees,
  COUNT(t.id) FILTER (WHERE t.status IN ('alive', 'registered', 'stressed')) AS living_trees,
  ROUND(
    100.0 * COUNT(t.id) FILTER (WHERE t.status IN ('alive', 'registered', 'stressed'))
    / NULLIF(COUNT(t.id), 0), 2
  ) AS survival_rate_pct
FROM schools sch
LEFT JOIN plots p ON p.school_id = sch.id
LEFT JOIN trees t ON t.plot_id = p.id
GROUP BY sch.id, sch.name;

CREATE OR REPLACE VIEW v_field_leaderboard AS
SELECT
  u.id AS user_id,
  u.full_name,
  COUNT(c.id) AS total_check_ins,
  COUNT(DISTINCT c.tree_id) AS trees_monitored,
  MAX(c.checked_at) AS last_activity
FROM users u
JOIN check_ins c ON c.checked_by = u.id
WHERE u.role = 'field_team'
GROUP BY u.id, u.full_name
ORDER BY total_check_ins DESC;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
