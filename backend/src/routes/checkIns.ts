import { Router } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';

const router = Router();

const VALID_HEALTH = ['healthy', 'stressed', 'diseased', 'damaged', 'dead', 'missing'];

// GET /api/v1/check-ins?tree_id=...
router.get('/', requireAuth, async (req, res) => {
  const { tree_id, limit = '50', offset = '0' } = req.query;

  if (!tree_id) {
    return res.status(400).json({ error: 'tree_id query parameter is required' });
  }

  const result = await query(
    `SELECT c.id, c.tree_id, c.checked_at, c.health_status,
            c.height_cm, c.dbh_cm, c.notes,
            c.latitude, c.longitude, c.accuracy_m,
            c.photo_urls, c.reference_photo_url,
            c.client_id, c.is_offline_origin, c.synced_at,
            c.created_at,
            u.full_name AS checked_by_name
     FROM check_ins c
     LEFT JOIN users u ON u.id = c.checked_by
     WHERE c.tree_id = $1
     ORDER BY c.checked_at DESC
     LIMIT $2 OFFSET $3`,
    [tree_id, Number(limit), Number(offset)]
  );

  res.json({ check_ins: result.rows, count: result.rows.length });
});

// GET /api/v1/check-ins/:id
router.get('/:id', requireAuth, async (req, res) => {
  const result = await query(
    `SELECT c.*, u.full_name AS checked_by_name
     FROM check_ins c
     LEFT JOIN users u ON u.id = c.checked_by
     WHERE c.id = $1`,
    [req.params.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Check-in not found' });
  }

  res.json({ check_in: result.rows[0] });
});

// POST /api/v1/check-ins
router.post(
  '/',
  requireAuth,
  requireRole('field_team', 'admin', 'super_admin'),
  async (req, res) => {
    const authReq = req as AuthRequest;
    const {
      tree_id,
      health_status,
      height_cm,
      dbh_cm,
      notes,
      latitude,
      longitude,
      accuracy_m,
      photo_urls,
      reference_photo_url,
      client_id,
      checked_at,
      is_offline_origin,
    } = req.body;

    if (!tree_id || !health_status) {
      return res.status(400).json({
        error: 'tree_id and health_status are required',
      });
    }

    if (!VALID_HEALTH.includes(health_status)) {
      return res.status(400).json({
        error: `health_status must be one of: ${VALID_HEALTH.join(', ')}`,
      });
    }

    const treeCheck = await query(`SELECT id, status FROM trees WHERE id = $1`, [tree_id]);
    if (treeCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid tree_id' });
    }

    // Idempotency for offline sync
    if (client_id) {
      const existing = await query(
        `SELECT * FROM check_ins WHERE client_id = $1`,
        [client_id]
      );
      if (existing.rows.length > 0) {
        return res.status(200).json({
          check_in: existing.rows[0],
          message: 'Already synced (idempotent)',
        });
      }
    }

    const result = await query(
      `INSERT INTO check_ins (
         tree_id, checked_by, checked_at,
         health_status, height_cm, dbh_cm, notes,
         latitude, longitude, accuracy_m,
         photo_urls, reference_photo_url,
         client_id, is_offline_origin, synced_at
       ) VALUES (
         $1, $2, COALESCE($3, NOW()),
         $4, $5, $6, $7,
         $8, $9, $10,
         $11, $12,
         $13, $14, NOW()
       )
       RETURNING *`,
      [
        tree_id,
        authReq.user!.userId,
        checked_at || null,
        health_status,
        height_cm ?? null,
        dbh_cm ?? null,
        notes || null,
        latitude ?? null,
        longitude ?? null,
        accuracy_m ?? null,
        photo_urls ? JSON.stringify(photo_urls) : '[]',
        reference_photo_url || null,
        client_id || null,
        is_offline_origin === true,
      ]
    );

    const checkIn = result.rows[0];

    // Update tree latest state
    const treeUpdates: string[] = ['last_check_in_at = NOW()', 'updated_at = NOW()'];
    const treeParams: any[] = [];
    let tIdx = 1;

    if (health_status === 'dead' || health_status === 'missing') {
      treeUpdates.push(`status = $${tIdx++}`);
      treeParams.push('dead');
    } else if (health_status === 'stressed' || health_status === 'diseased' || health_status === 'damaged') {
      treeUpdates.push(`status = $${tIdx++}`);
      treeParams.push('stressed');
    } else if (health_status === 'healthy') {
      treeUpdates.push(`status = $${tIdx++}`);
      treeParams.push('alive');
    }

    if (height_cm != null) {
      treeUpdates.push(`current_height_cm = $${tIdx++}`);
      treeParams.push(height_cm);
    }
    if (dbh_cm != null) {
      treeUpdates.push(`current_dbh_cm = $${tIdx++}`);
      treeParams.push(dbh_cm);
    }

    treeParams.push(tree_id);

    await query(
      `UPDATE trees SET ${treeUpdates.join(', ')} WHERE id = $${tIdx}`,
      treeParams
    );

    res.status(201).json({ check_in: checkIn });
  }
);

export default router;