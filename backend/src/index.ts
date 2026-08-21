import dotenv from 'dotenv';
dotenv.config(); // MUST be first

import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import passport from './config/auth';
import { signToken } from './config/auth';
import { requireAuth, requireRole, AuthRequest } from './middleware/auth';
import { query } from './config/db';

import schoolsRouter from './routes/schools';
import plotsRouter from './routes/plots';
import treesRouter from './routes/trees';
import checkInsRouter from './routes/checkIns';
import speciesRouter from './routes/species';
import seedBatchesRouter from './routes/seedBatches';
import measurementsRouter from './routes/measurements';
import uploadsRouter from './routes/uploads';
import usersRouter from './routes/users';
import nurseriesRouter from './routes/nurseries';

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow images from API origin
}));
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());


// Serve uploaded photos
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ---------------------------------------------------------------------------
// Public routes
// ---------------------------------------------------------------------------

app.get('/', (_req, res) => {
  res.json({
    message: 'UYIH Tree Monitoring API',
    docs: '/api/v1',
    health: '/health',
    login: '/auth/google',
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'uyih-tree-monitor-api',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1', (_req, res) => {
  res.json({
    name: 'UYIH Tree Monitoring API',
    version: '0.1.0',
    endpoints: {
      health: '/health',
      auth: {
        google: '/auth/google',
        me: '/auth/me',
      },
      schools: '/api/v1/schools',
      plots: '/api/v1/plots',
      trees: '/api/v1/trees',
      checkins: '/api/v1/check-ins',
      species: '/api/v1/species',
      seedBatches: '/api/v1/seed-batches',
      measurements: '/api/v1/measurements',
      uploads: '/api/v1/uploads',
      users: '/api/v1/users',
      nurseries: '/api/v1/nurseries',
    },
  });
});

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

app.get(
  '/auth/google',
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
);

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/failure' }),
  (req, res) => {
    const user = req.user as any;

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.redirect(`${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}`);
  }
);

app.get('/auth/failure', (_req, res) => {
  res.status(401).json({ error: 'Authentication failed' });
});

app.get('/auth/me', requireAuth, async (req, res) => {
  const authReq = req as AuthRequest;
  const result = await query(
    `SELECT id, email, full_name, avatar_url, role, created_at, last_login_at
     FROM users WHERE id = $1`,
    [authReq.user!.userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user: result.rows[0] });
});

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------

app.use('/api/v1/schools', schoolsRouter);
app.use('/api/v1/plots', plotsRouter);
app.use('/api/v1/trees', treesRouter);
app.use('/api/v1/check-ins', checkInsRouter);
app.use('/api/v1/species', speciesRouter);
app.use('/api/v1/seed-batches', seedBatchesRouter);
app.use('/api/v1/measurements', measurementsRouter);
app.use('/api/v1/uploads', uploadsRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/nurseries', nurseriesRouter);


// Example protected routes
app.get('/api/v1/protected', requireAuth, (req, res) => {
  const authReq = req as AuthRequest;
  res.json({
    message: 'You are authenticated',
    user: authReq.user,
  });
});

app.get(
  '/api/v1/admin-only',
  requireAuth,
  requireRole('admin', 'super_admin'),
  (req, res) => {
    const authReq = req as AuthRequest;
    res.json({
      message: 'Welcome, admin',
      user: authReq.user,
    });
  }
);

app.get(
  '/api/v1/field',
  requireAuth,
  requireRole('field_team', 'admin', 'super_admin'),
  (req, res) => {
    const authReq = req as AuthRequest;
    res.json({
      message: 'Field team area',
      user: authReq.user,
    });
  }
);

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`🌳 UYIH Tree Monitor API running on http://localhost:${PORT}`);
});