import type { CorsOptions } from 'cors';
import cors from 'cors';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { config } from '../config/index.js';

/** Origins always permitted during local development. */
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

/**
 * CORS configuration backed by an allowlist. In production only origins listed
 * in `CORS_ORIGINS` are allowed (the bundled SPA is same-origin, so it needs no
 * entry). Requests without an `Origin` header (curl, same-origin, health
 * checks) are always allowed.
 */
export function corsMiddleware(): RequestHandler {
  const allowlist = new Set([
    ...config.corsOrigins,
    ...(config.isProduction ? [] : DEV_ORIGINS),
  ]);

  return cors((req, callback) => {
    const origin = req.headers.origin;
    const base: CorsOptions = { credentials: true };

    // No Origin header (curl, health checks, same-origin GET) → allow.
    if (!origin) {
      callback(null, { ...base, origin: true });
      return;
    }

    // Explicitly allowlisted origin → allow.
    if (allowlist.has(origin)) {
      callback(null, { ...base, origin: true });
      return;
    }

    // Same-origin request: the bundled SPA is served from the same host as the
    // API (e.g. the Railway public domain). Browsers still send an `Origin`
    // header on non-GET requests, so allow it when the origin host matches the
    // request host.
    try {
      if (req.headers.host && new URL(origin).host === req.headers.host) {
        callback(null, { ...base, origin: true });
        return;
      }
    } catch {
      // Malformed Origin header → fall through to reject.
    }

    // Disallowed cross-origin request: omit CORS headers instead of throwing,
    // so the request is not turned into a server-side 500.
    callback(null, { ...base, origin: false });
  });
}

/** Security headers. CSP is relaxed for the bundled SPA assets. */
export function helmetMiddleware(): RequestHandler {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });
}

/** Global rate limiter applied to all API routes. */
export function globalRateLimiter(): RequestHandler {
  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
}

/** Stricter rate limiter for sensitive endpoints (auth, setup). */
export function authRateLimiter(): RequestHandler {
  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts, please try again later.' },
  });
}

/** 404 handler for unknown API routes. */
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found' });
};

/**
 * Centralized error handler. Never leaks internal stack traces to clients;
 * full details are logged server-side only.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status =
    typeof err?.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;

  // Log full error server-side for diagnostics.
  // eslint-disable-next-line no-console
  console.error('[error]', err);

  const safeMessage =
    status < 500 && typeof err?.message === 'string'
      ? err.message
      : 'Internal server error';

  res.status(status).json({ error: safeMessage });
};
