import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { query } from './db';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL!;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
    },
    async (_accessToken, _refreshToken, profile: Profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email from Google'), undefined);
        }

        // Upsert user
        const existing = await query(
          `SELECT id, email, role, full_name, avatar_url FROM users WHERE google_id = $1 OR email = $2`,
          [profile.id, email]
        );

        let user;
        if (existing.rows.length > 0) {
          user = existing.rows[0];
          await query(
            `UPDATE users SET google_id = $1, full_name = COALESCE($2, full_name),
             avatar_url = COALESCE($3, avatar_url), last_login_at = NOW(), updated_at = NOW()
             WHERE id = $4`,
            [profile.id, profile.displayName, profile.photos?.[0]?.value, user.id]
          );
        } else {
          const insert = await query(
            `INSERT INTO users (google_id, email, email_verified, full_name, avatar_url, role, last_login_at)
             VALUES ($1, $2, true, $3, $4, 'donor', NOW())
             RETURNING id, email, role, full_name, avatar_url`,
            [profile.id, email, profile.displayName, profile.photos?.[0]?.value]
          );
          user = insert.rows[0];
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error, undefined);
      }
    }
  )
);

export default passport;
