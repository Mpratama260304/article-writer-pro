import crypto from 'node:crypto';

import { getAppSecret } from './appSecret.js';

/**
 * Minimal, dependency-free HS256 JWT implementation.
 *
 * Used for the admin session cookie. The signing key is derived from the
 * persisted app secret (`getAppSecret()`), so tokens survive redeploys when the
 * data directory is mounted as a volume.
 */

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function sign(data: string): string {
  return base64url(crypto.createHmac('sha256', getAppSecret()).update(data).digest());
}

export interface JwtPayload {
  sub: number;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

/** Default session lifetime: 7 days. */
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

export function signJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload: JwtPayload = { ...payload, iat: now, exp: now + ttlSeconds };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(fullPayload));
  const signature = sign(`${headerB64}.${payloadB64}`);
  return `${headerB64}.${payloadB64}.${signature}`;
}

/** Verify a token. Returns the payload or null when invalid/expired. */
export function verifyJwt(token: string): JwtPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signature] = parts;
  const expected = sign(`${headerB64}.${payloadB64}`);

  // Constant-time comparison.
  const a = Buffer.from(signature ?? '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(base64urlDecode(payloadB64 ?? '').toString('utf8')) as JwtPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
