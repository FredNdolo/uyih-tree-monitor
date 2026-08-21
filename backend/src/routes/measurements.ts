import { Router } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';

const router = Router();

// GET /api/v1/measurements?tree_id=...
router.get('/', requireAuth, async (req, res) => {
  const { tree_id } = req.query;

  if (!tree_id) {
    return res.status(400).json({ error: 'tree_id query parameter is required' });
  }

  const result = await query(
    `SELECT m.*, u.full_name AS measured_by_name
     FROM manual_measurements m
     LEFT JOIN users u ON u.id = m.measured_by
     WHERE m.tree_id = $1
     ORDER BY m.measured_at DESC`,
    [tree_id]
  );

  res.json({ measurements: result.rows });
});

// POST /api/v1/measurements — ground-truth measurement
router.post(
  '/',
  requireAuth,
  requireRole('field_team', 'admin', 'super_admin'),
  async (req, res) => {
    const authReq = req as AuthRequest;
    const {
      tree_id,
      height_cm,
      dbh_cm,
      method,
      notes,
      photo_url,
      validates_check_in_id,
      measured_at,
    } = req.body;

    if (!tree_id || height_cm == null) {
      return res.status(400).json({
        error: 'tree_id and height_cm are required',
      });
    }

    // Verify tree exists
    const treeCheck = await query(`SELECT id FROM trees WHERE id = $1`, [tree_id]);
    if (treeCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid tree_id' });
    }

    const result = await query(
      `INSERT INTO manual_measurements (
         tree_id, measured_by, measured_at,
         height_cm, dbh_cm, method, notes, photo_url, validates_check_in_id
       ) VALUES ($1, $2, COALESCE($3, NOW()), $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        tree_id,
        authReq.user!.userId,
        measured_at || null,
        height_cm,
        dbh_cm ?? null,
        method || null,
        notes || null,
        photo_url || null,
        validates_check_in_id || null,
      ]
    );

    // Also update the tree’s current measurements
    await query(
      `UPDATE trees
       SET current_height_cm = $1,
           current_dbh_cm = COALESCE($2, current_dbh_cm),
           updated_at = NOW()
       WHERE id = $3`,
      [height_cm, dbh_cm ?? null, tree_id]
    );

    res.status(201).json({ measurement: result.rows[0] });
  }
);

export default router;