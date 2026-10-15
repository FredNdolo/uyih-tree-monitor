import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../config/auth';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * Requires a valid JWT in the Authorization header:
 *   Authorization: Bearer <token>
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7);

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Requires the user to have one of the allowed roles.
 * Must be used after requireAuth.
 *
 * Example: requireRole('admin', 'field_team')
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Requires one of roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}