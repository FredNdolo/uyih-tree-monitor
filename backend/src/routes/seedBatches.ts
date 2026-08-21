import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { query } from '../config/db';

const router = Router();

// GET /api/v1/seed-batches?nursery_id=...
router.get('/', requireAuth, async (req, res) => {
  const { nursery_id } = req.query;

  let sql = `
    SELECT sb.*, 
           sp.common_name AS species_name,
           n.name AS nursery_name
    FROM seed_batches sb
    JOIN species sp ON sp.id = sb.species_id
    JOIN nurseries n ON n.id = sb.nursery_id
  `;
  const params: any[] = [];

  if (nursery_id) {
    sql += ` WHERE sb.nursery_id = $1`;
    params.push(nursery_id);
  }

  sql += ` ORDER BY sb.created_at DESC`;

  const result = await query(sql, params);
  res.json({ seed_batches: result.rows });
});

// GET /api/v1/seed-batches/:id
router.get('/:id', requireAuth, async (req, res) => {
  const result = await query(
    `SELECT sb.*, sp.common_name AS species_name, n.name AS nursery_name
     FROM seed_batches sb
     JOIN species sp ON sp.id = sb.species_id
     JOIN nurseries n ON n.id = sb.nursery_id
     WHERE sb.id = $1`,
    [req.params.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Seed batch not found' });
  }

  res.json({ seed_batch: result.rows[0] });
});

// POST /api/v1/seed-batches — field_team or admin
router.post(
  '/',
  requireAuth,
  requireRole('field_team', 'admin', 'super_admin'),
  async (req, res) => {
    const {
      nursery_id,
      species_id,
      batch_code,
      seed_source,
      collection_date,
      sowing_date,
      quantity_sown,
      germination_count,
      transplant_ready_date,
      status,
      notes,
    } = req.body;

    if (!nursery_id || !species_id || !batch_code) {
      return res.status(400).json({
        error: 'nursery_id, species_id and batch_code are required',
      });
    }

    const result = await query(
      `INSERT INTO seed_batches (
         nursery_id, species_id, batch_code, seed_source,
         collection_date, sowing_date, quantity_sown, germination_count,
         transplant_ready_date, status, notes, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        nursery_id,
        species_id,
        batch_code,
        seed_source || null,
        collection_date || null,
        sowing_date || null,
        quantity_sown || null,
        germination_count || null,
        transplant_ready_date || null,
        status || 'sown',
        notes || null,
        (req as any).user?.userId || null,
      ]
    );

    res.status(201).json({ seed_batch: result.rows[0] });
  }
);

export default router;