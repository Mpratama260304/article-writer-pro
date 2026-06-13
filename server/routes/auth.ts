import { Router } from 'express';

import { SESSION_COOKIE, requireAuth, sessionCookieOptions } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/security.js';
import { signJwt } from '../lib/jwt.js';
import { loginSchema, parseOrThrow } from '../schemas/index.js';
import { audit } from '../services/audit-service.js';
import {
  getUserById,
  recordLogin,
  toPublicUser,
  verifyCredentials,
} from '../services/auth-service.js';

const router = Router();

/** Admin login. Sets an httpOnly session cookie on success. */
router.post('/login', authRateLimiter(), async (req, res, next) => {
  try {
    const { username, password } = parseOrThrow(loginSchema, req.body);
    const user = await verifyCredentials(username, password);
    if (!user) {
      audit({ action: 'auth.login.failed', req, metadata: { username } });
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }
    recordLogin(user.id);
    const token = signJwt({ sub: user.id, username: user.username, role: user.role });
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    audit({ userId: user.id, action: 'auth.login', req });
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

/** Logout: clear the session cookie. */
router.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(), maxAge: undefined });
  res.json({ success: true });
});

/** Current authenticated user. */
router.get('/me', requireAuth, (req, res) => {
  const user = req.user ? getUserById(req.user.sub) : undefined;
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  res.json({ user: toPublicUser(user) });
});

export default router;
