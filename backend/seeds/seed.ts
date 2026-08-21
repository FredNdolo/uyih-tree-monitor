/**
 * Minimal seed data for local development.
 * Run after migrations: npm run seed
 */
import dotenv from 'dotenv';
dotenv.config();

import { pool, query } from '../src/config/db';

async function seed() {
  console.log('Seeding UYIH Tree Monitor...');
  console.log('Using database:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));

  // Project
  const project = await query(
    `INSERT INTO projects (name, code, description, standard, status, start_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [
      'Green Futures Initiative',
      'GFI-2025',
      'UYIH tree planting & carbon readiness programme in Narok County and beyond',
      ['Plan Vivo', 'NEMA'],
      'design',
      '2025-01-01',
    ]
  );
  const projectId = project.rows[0].id;
  console.log('Project:', projectId);

  // Species
  const species = await query(
    `INSERT INTO species (scientific_name, common_name, local_name, is_native)
     VALUES
       ('Croton megalocarpus', 'Croton', 'Mukinduri', true),
       ('Grevellea robusta', 'Silk Oak', 'Mukima', false),
       ('Markhamia lutea', 'Nile Tulip', 'Siala', true),
       ('Acacia xanthophloea', 'Fever Tree', 'Olerai', true)
     ON CONFLICT DO NOTHING
     RETURNING id, common_name`
  );
  console.log('Species seeded:', species.rowCount);

  // Sample school (Narok)
  const school = await query(
    `INSERT INTO schools (project_id, name, code, county, sub_county, latitude, longitude, contact_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [
      projectId,
      'Narok Primary Demonstration School',
      'NAROK-01',
      'Narok',
      'Narok North',
      -1.0851,
      35.8731,
      'UYIH Coordinator',
    ]
  );
  const schoolId = school.rows[0].id;
  console.log('School:', schoolId);

  // Plot
  const plot = await query(
    `INSERT INTO plots (school_id, name, code, area_hectares)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [schoolId, 'Main Planting Plot A', 'PLOT-A', 0.35]
  );
  console.log('Plot:', plot.rows[0].id);

  // Nursery
  await query(
    `INSERT INTO nurseries (school_id, name, code, capacity)
     VALUES ($1, $2, $3, $4)`,
    [schoolId, 'Narok School Nursery', 'NUR-01', 2000]
  );

  // Sponsorship tiers
  await query(
    `INSERT INTO sponsorship_tiers (name, code, min_trees, max_trees, is_corporate, price_kes, monitoring_level)
     VALUES
       ('Guardian', 'IND-1', 1, 4, false, 1500, 'basic'),
       ('Grove', 'IND-5', 5, 19, false, 6000, 'standard'),
       ('Forest', 'IND-20', 20, NULL, false, 20000, 'premium'),
       ('CSR Partner', 'CSR-50', 50, NULL, true, 50000, 'premium')
     ON CONFLICT (code) DO NOTHING`
  );

  // Sample badges
  await query(
    `INSERT INTO field_badges (code, name, description)
     VALUES
       ('first_tree', 'First Tree', 'Registered your first tree'),
       ('streak_7', 'Week Warrior', '7-day check-in streak'),
       ('streak_30', 'Guardian of the Month', '30-day check-in streak'),
       ('survival_champion', 'Survival Champion', 'Highest survival rate at your school')
     ON CONFLICT (code) DO NOTHING`
  );

  console.log('Seed complete.');
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});