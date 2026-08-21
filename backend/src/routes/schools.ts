import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { query } from '../config/db';

const router = Router();

// GET /api/v1/schools — list all schools (any authenticated user)
router.get('/', requireAuth, async (_req, res) => {
  const result = await query(
    `SELECT s.id, s.name, s.code, s.county, s.sub_county, s.ward,
            s.latitude, s.longitude, s.contact_name, s.contact_phone,
            s.is_active, s.created_at,
            p.name AS project_name
     FROM schools s
     JOIN projects p ON p.id = s.project_id
     ORDER BY s.name`
  );
  res.json({ schools: result.rows });
});

// GET /api/v1/schools/:id
router.get('/:id', requireAuth, async (req, res) => {
  const result = await query(
    `SELECT s.*, p.name AS project_name, p.code AS project_code
     FROM schools s
     JOIN projects p ON p.id = s.project_id
     WHERE s.id = $1`,
    [req.params.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'School not found' });
  }

  res.json({ school: result.rows[0] });
});

// POST /api/v1/schools — create school (admin only)
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (req, res) => {
    const {
      project_id,
      name,
      code,
      county,
      sub_county,
      ward,
      latitude,
      longitude,
      contact_name,
      contact_phone,
      contact_email,
      land_agreement_ref,
    } = req.body;

    if (!project_id || !name || !county) {
      return res.status(400).json({
        error: 'project_id, name and county are required',
      });
    }

    const result = await query(
      `INSERT INTO schools (
         project_id, name, code, county, sub_county, ward,
         latitude, longitude, contact_name, contact_phone, contact_email,
         land_agreement_ref
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        project_id,
        name,
        code || null,
        county,
        sub_county || null,
        ward || null,
        latitude || null,
        longitude || null,
        contact_name || null,
        contact_phone || null,
        contact_email || null,
        land_agreement_ref || null,
      ]
    );

    res.status(201).json({ school: result.rows[0] });
  }
);

// PATCH /api/v1/schools/:id — update (admin only)
router.patch(
  '/:id',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (req, res) => {
    const allowed = [
      'name', 'code', 'county', 'sub_county', 'ward',
      'latitude', 'longitude', 'contact_name', 'contact_phone',
      'contact_email', 'land_agreement_ref', 'is_active',
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
      `UPDATE schools SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${idx}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json({ school: result.rows[0] });
  }
);

export default router;