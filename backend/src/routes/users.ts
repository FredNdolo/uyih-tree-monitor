import { Router } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';

const router = Router();

const VALID_ROLES = ['field_team', 'admin', 'donor', 'auditor', 'super_admin'];

// GET /api/v1/users — admin only
router.get(
  '/',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (_req, res) => {
    const result = await query(
      `SELECT id, email, full_name, avatar_url, role, is_active,
              last_login_at, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  }
);

// PATCH /api/v1/users/:id — update role / is_active (admin only)
router.patch(
  '/:id',
  requireAuth,
  requireRole('admin', 'super_admin'),
  async (req: AuthRequest, res) => {
    const { role, is_active } = req.body;

    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        error: `role must be one of: ${VALID_ROLES.join(', ')}`,
      });
    }

    // Prevent removing your own admin access by accident
    if (req.params.id === req.user!.userId && role && role !== 'admin' && role !== 'super_admin') {
      return res.status(400).json({
        error: 'You cannot demote your own admin account',
      });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (role !== undefined) {
      updates.push(`role = $${idx++}`);
      values.push(role);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(Boolean(is_active));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING id, email, full_name, avatar_url, role, is_active, last_login_at, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  }
);

export default router;