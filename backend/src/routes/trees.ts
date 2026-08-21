import { Router } from 'express';
import { randomBytes } from 'crypto';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';

const router = Router();

/**
 * Generate a short, unique, human-friendly QR code payload.
 * Format: UYIH-XXXXXXXX (8 hex chars)
 */
function generateQrCode(): string {
  return `UYIH-${randomBytes(4).toString('hex').toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// GET /api/v1/trees
// List trees (optional filters: plot_id, school_id, status, sponsor)
// ---------------------------------------------------------------------------
router.get('/', requireAuth, async (req, res) => {
  const { plot_id, school_id, status, limit = '50', offset = '0' } = req.query;

  let sql = `
    SELECT t.id, t.qr_code, t.status, t.planting_date,
           t.latitude, t.longitude, t.accuracy_m,
           t.current_height_cm, t.current_dbh_cm, t.last_check_in_at,
           t.created_at,
           s.common_name AS species,
           s.scientific_name,
           p.name AS plot_name,
           p.id AS plot_id,
           sch.name AS school_name,
           sch.id AS school_id
    FROM trees t
    JOIN species s ON s.id = t.species_id
    JOIN plots p ON p.id = t.plot_id
    JOIN schools sch ON sch.id = p.school_id
    WHERE 1=1
  `;
  const params: any[] = [];
  let idx = 1;

  if (plot_id) {
    sql += ` AND t.plot_id = $${idx++}`;
    params.push(plot_id);
  }
  if (school_id) {
    sql += ` AND sch.id = $${idx++}`;
    params.push(school_id);
  }
  if (status) {
    sql += ` AND t.status = $${idx++}`;
    params.push(status);
  }

  sql += ` ORDER BY t.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(Number(limit), Number(offset));

  const result = await query(sql, params);
  res.json({ trees: result.rows, count: result.rows.length });
});

// ---------------------------------------------------------------------------
// GET /api/v1/trees/qr/:qrCode  — lookup by QR code
// ---------------------------------------------------------------------------
router.get('/qr/:qrCode', requireAuth, async (req, res) => {
  const result = await query(
    `SELECT t.*, 
            s.common_name AS species, s.scientific_name,
            p.name AS plot_name, p.id AS plot_id,
            sch.name AS school_name, sch.id AS school_id
     FROM trees t
     JOIN species s ON s.id = t.species_id
     JOIN plots p ON p.id = t.plot_id
     JOIN schools sch ON sch.id = p.school_id
     WHERE t.qr_code = $1`,
    [req.params.qrCode.toUpperCase()]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Tree not found' });
  }

  res.json({ tree: result.rows[0] });
});

// ---------------------------------------------------------------------------
// GET /api/v1/trees/:id
// ---------------------------------------------------------------------------
router.get('/:id', requireAuth, async (req, res) => {
  const result = await query(
    `SELECT t.*, 
            s.common_name AS species, s.scientific_name,
            p.name AS plot_name, p.id AS plot_id,
            sch.name AS school_name, sch.id AS school_id
     FROM trees t
     JOIN species s ON s.id = t.species_id
     JOIN plots p ON p.id = t.plot_id
     JOIN schools sch ON sch.id = p.school_id
     WHERE t.id = $1`,
    [req.params.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Tree not found' });
  }

  res.json({ tree: result.rows[0] });
});

// ---------------------------------------------------------------------------
// POST /api/v1/trees  — register a new tree
// Required: plot_id, species_id, latitude, longitude
// Optional: seed_batch_id, planting_date, accuracy_m, notes
// ---------------------------------------------------------------------------
router.post(
  '/',
  requireAuth,
  requireRole('field_team', 'admin', 'super_admin'),
  async (req, res) => {
    const authReq = req as AuthRequest;
    const {
      plot_id,
      species_id,
      seed_batch_id,
      latitude,
      longitude,
      accuracy_m,
      planting_date,
      notes,
    } = req.body;

    // Validation
    if (!plot_id || !species_id || latitude == null || longitude == null) {
      return res.status(400).json({
        error: 'plot_id, species_id, latitude and longitude are required',
      });
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        error: 'latitude and longitude must be numbers',
      });
    }

    // Verify plot exists
    const plotCheck = await query(`SELECT id FROM plots WHERE id = $1`, [plot_id]);
    if (plotCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid plot_id' });
    }

    // Verify species exists
    const speciesCheck = await query(`SELECT id FROM species WHERE id = $1`, [species_id]);
    if (speciesCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid species_id' });
    }

    // Generate unique QR (retry a few times on the unlikely collision)
    let qr_code = generateQrCode();
    for (let i = 0; i < 5; i++) {
      const existing = await query(`SELECT id FROM trees WHERE qr_code = $1`, [qr_code]);
      if (existing.rows.length === 0) break;
      qr_code = generateQrCode();
    }

    const result = await query(
      `INSERT INTO trees (
         qr_code, plot_id, species_id, seed_batch_id,
         latitude, longitude, accuracy_m,
         planting_date, registered_by, notes, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'registered')
       RETURNING *`,
      [
        qr_code,
        plot_id,
        species_id,
        seed_batch_id || null,
        latitude,
        longitude,
        accuracy_m || null,
        planting_date || new Date().toISOString().slice(0, 10),
        authReq.user!.userId,
        notes || null,
      ]
    );

    const tree = result.rows[0];

    // Return with joined names for convenience
    const full = await query(
      `SELECT t.*, 
              s.common_name AS species, s.scientific_name,
              p.name AS plot_name,
              sch.name AS school_name
       FROM trees t
       JOIN species s ON s.id = t.species_id
       JOIN plots p ON p.id = t.plot_id
       JOIN schools sch ON sch.id = p.school_id
       WHERE t.id = $1`,
      [tree.id]
    );

    res.status(201).json({ tree: full.rows[0] });
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/v1/trees/:id  — update status / notes (field or admin)
// ---------------------------------------------------------------------------
router.patch(
  '/:id',
  requireAuth,
  requireRole('field_team', 'admin', 'super_admin'),
  async (req, res) => {
    const allowed = ['status', 'notes', 'current_height_cm', 'current_dbh_cm'];
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
      `UPDATE trees SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${idx}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tree not found' });
    }

    res.json({ tree: result.rows[0] });
  }
);

export default router;