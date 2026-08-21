import { Router } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';

const router = Router();

// GET /api/v1/nurseries?school_id=
router.get('/', requireAuth, async (req, res) => {
  const { school_id } = req.query;

  let sql = `
    SELECT n.*, s.name AS school_name, s.county
    FROM nurseries n
    JOIN schools s ON s.id = n.school_id
  `;
  const params: any[] = [];

  if (school_id) {
    sql += ` WHERE n.school_id = $1`;
    params.push(school_id);
  }

  sql += ` ORDER BY s.name, n.name`;

  const result = await query(sql, params);
  res.json({ nurseries: result.rows });
});

// GET /api/v1/nurseries/:id
router.get('/:id', requireAuth, async (req, res) => {
  const result = await query(
    `SELECT n.*, s.name AS school_name
     FROM nurseries n
     JOIN schools s ON s.id = n.school_id
     WHERE n.id = $1`,
    [req.params.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Nursery not found' });
  }
  res.json({ nursery: result.rows[0] });
});

// POST /api/v1/nurseries
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'super_admin', 'field_team'),
  async (req: AuthRequest, res) => {
    const { school_id, name, code, capacity } = req.body;

    if (!school_id || !name) {
      return res.status(400).json({ error: 'school_id and name are required' });
    }

    const result = await query(
      `INSERT INTO nurseries (school_id, name, code, capacity)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [school_id, name, code || null, capacity || null]
    );

    res.status(201).json({ nursery: result.rows[0] });
  }
);

export default router;