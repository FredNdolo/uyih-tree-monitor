import { Request, RequestHandler } from 'express';
import { verifyToken, JwtPayload } from '../config/auth';

/** JWT-authenticated request; omits Passport's `user` to avoid type conflicts. */
export type AuthRequest = Omit<Request, 'user'> & { user?: JwtPayload };

/**
 * Requires a valid JWT in the Authorization header:
 *   Authorization: Bearer <token>
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  // Exhibition / demo: skip JWT and act as admin
  if (process.env.EXHIBITION_MODE === 'true') {
    req.user = {
      userId: process.env.EXHIBITION_USER_ID || '00000000-0000-0000-0000-000000000001',
      email: 'exhibit@uyih.local',
      role: 'admin',
    };
    return next();
  }

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
export function requireRole(...allowedRoles: string[]): RequestHandler {
  return (req, res, next) => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(authReq.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Requires one of roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}
