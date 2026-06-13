import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { config } from '../config/index.js';
import { verifyJwt, type JwtPayload } from '../lib/jwt.js';
import { isValidSetupToken } from '../services/setup-service.js';

/** Name of the session cookie. */
export const SESSION_COOKIE = 'awp_session';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/** Cookie options for the session cookie. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.isProduction,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function readToken(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
}

/** Populate `req.user` if a valid session cookie is present; never blocks. */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const token = readToken(req);
  if (token) {
    const payload = verifyJwt(token);
    if (payload) req.user = payload;
  }
  next();
};

/** Require a valid admin session; otherwise respond 401. */
export const requireAuth: RequestHandler = (req, res, next) => {
  const token = readToken(req);
  const payload = token ? verifyJwt(token) : null;
  if (!payload) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  req.user = payload;
  next();
};

/**
 * Require a valid one-time setup token (query `?token=` or `x-setup-token`
 * header). Used to protect setup completion.
 */
export function requireSetupToken(req: Request, res: Response, next: NextFunction): void {
  const token =
    (typeof req.query.token === 'string' ? req.query.token : undefined) ??
    req.get('x-setup-token') ??
    (req.body as { token?: string } | undefined)?.token;

  if (!isValidSetupToken(token)) {
    res.status(403).json({ error: 'Invalid or expired setup token' });
    return;
  }
  next();
}
