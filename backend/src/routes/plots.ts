import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { query } from '../config/db';

const router = Router();

// GET /api/v1/plots?school_id=... — list plots (optionally filtered by school)
router.get('/', requireAuth, async (req, res) => {
  const { school_id } = req.query;

  let sql = `
    SELECT pl.id, pl.name, pl.code, pl.area_hectares, pl.elevation_m,
           pl.soil_type, pl.baseline_locked, pl.notes, pl.created_at,
           s.id AS school_id, s.name AS school_name, s.county
    FROM plots pl
    JOIN schools s ON s.id = pl.school_id
  `;
  const params: any[] = [];

  if (school_id) {
    sql += ` WHERE pl.school_id = $1`;
    params.push(school_id);
  }

  sql += ` ORDER BY s.name, pl.name`;

  const result = await query(sql, params);
  res.json({ plots: result.rows });
});

// GET /api/v1/plots/:id
router.get('/:id', requireAuth, async (req, res) => {
  const result = await query(
    `SELECT pl.*, s.name AS school_name, s.county
     FROM plots pl
     JOIN schools s ON s.id = pl.school_id
     WHERE pl.id = $1`,
    [req.params.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Plot not found' });
  }

  res.json({ plot: result.rows[0] });
});

// POST /api/v1/plots — create plot (admin or field_team)
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'super_admin', 'field_team'),
  async (req, res) => {
    const {
      school_id,
      name,
      code,
      area_hectares,
      elevation_m,
      soil_type,
      notes,
    } = req.body;

    if (!school_id || !name) {
      return res.status(400).json({
        error: 'school_id and name are required',
      });
    }

    const result = await query(
      `INSERT INTO plots (
         school_id, name, code, area_hectares, elevation_m, soil_type, notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        school_id,
        name,
        code || null,
        area_hectares || null,
        elevation_m || null,
        soil_type || null,
        notes || null,
      ]
    );

    res.status(201).json({ plot: result.rows[0] });
  }
);

// PATCH /api/v1/plots/:id
router.patch(
  '/:id',
  requireAuth,
  requireRole('admin', 'super_admin', 'field_team'),
  async (req, res) => {
    const allowed = [
      'name', 'code', 'area_hectares', 'elevation_m',
      'soil_type', 'notes',
    ];

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = $${idx}`);
        values.push(req.body[key]);
        idx++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(req.params.id);

    const result = await query(
      `UPDATE plots SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${idx}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plot not found' });
    }

    res.json({ plot: result.rows[0] });
  }
);

export default router;