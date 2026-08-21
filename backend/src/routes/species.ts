import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { query } from '../config/db';

const router = Router();

// GET /api/v1/species — list all species
router.get('/', requireAuth, async (_req, res) => {
  const result = await query(
    `SELECT id, scientific_name, common_name, local_name, is_native, carbon_factor, notes, created_at
     FROM species
     ORDER BY common_name`
  );
  res.json({ species: result.rows });
});

// GET /api/v1/species/:id
router.get('/:id', requireAuth, async (req, res) => {
  const result = await query(
    `SELECT * FROM species WHERE id = $1`,
    [req.params.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Species not found' });
  }
  res.json({ species: result.rows[0] });
});

// POST /api/v1/species — admin only
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (req, res) => {
    const { scientific_name, common_name, local_name, is_native, carbon_factor, notes } = req.body;

    if (!scientific_name || !common_name) {
      return res.status(400).json({
        error: 'scientific_name and common_name are required',
      });
    }

    const result = await query(
      `INSERT INTO species (scientific_name, common_name, local_name, is_native, carbon_factor, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        scientific_name,
        common_name,
        local_name || null,
        is_native !== false,
        carbon_factor || null,
        notes || null,
      ]
    );

    res.status(201).json({ species: result.rows[0] });
  }
);

export default router;