import crypto from 'node:crypto';

import { config } from '../config/index.js';
import { audit } from './audit-service.js';
import { createAdminUser, hasAdminUser } from './auth-service.js';
import { setApiKeyEncrypted, setSetting } from './settings-service.js';
import type { SetupInput } from '../schemas/index.js';

/**
 * First-run setup state.
 *
 * The app is in "setup mode" while no admin user exists. A one-time setup token
 * is generated and printed to the server logs; the setup form must present this
 * token to complete setup. Once an admin exists, setup mode is disabled and the
 * token is invalidated.
 */

let setupToken: string | null = null;

/** True when no admin user exists yet. */
export function isSetupRequired(): boolean {
  return !hasAdminUser();
}

/**
 * Ensure a setup token exists when setup is required, and log it. Called on
 * server boot. No-op once an admin exists.
 */
export function ensureSetupToken(): void {
  if (!isSetupRequired()) {
    setupToken = null;
    return;
  }
  if (!setupToken) {
    setupToken = crypto.randomBytes(24).toString('hex');
  }
  const base = `http://localhost:${config.port}`;
  // eslint-disable-next-line no-console
  console.log(
    [
      '',
      '────────────────────────────────────────────────────────',
      ' ArticleWriterPro — FIRST-RUN SETUP REQUIRED',
      ' Open the setup wizard in your browser:',
      `   ${base}/setup?token=${setupToken}`,
      '',
      ' (Behind a proxy/Railway, use your public URL + the same path.)',
      '────────────────────────────────────────────────────────',
      '',
    ].join('\n'),
  );
}

/** Validate a provided setup token against the active one (constant-time). */
export function isValidSetupToken(token: string | undefined): boolean {
  if (!setupToken || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(setupToken);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Invalidate the token (after successful setup). */
export function clearSetupToken(): void {
  setupToken = null;
}

/**
 * Status payload for `GET /api/setup/status`. The raw token is only included in
 * development mode to ease local testing — never in production.
 */
export function getSetupStatus(): { setupRequired: boolean; devToken?: string } {
  const setupRequired = isSetupRequired();
  if (setupRequired && !config.isProduction && setupToken) {
    return { setupRequired, devToken: setupToken };
  }
  return { setupRequired };
}

/**
 * Complete setup: create the admin user and persist initial AI settings (with
 * the API key encrypted). Disables setup mode and invalidates the token.
 */
export async function completeSetup(input: SetupInput): Promise<void> {
  if (!isSetupRequired()) {
    const err = new Error('Setup has already been completed.');
    (err as { status?: number }).status = 409;
    throw err;
  }

  const user = await createAdminUser(input.username, input.email, input.password);

  setSetting('ai_provider_name', input.aiProviderName);
  setSetting('ai_base_url', input.aiBaseUrl);
  setSetting('ai_model', input.aiModel);
  setSetting('default_language', input.defaultLanguage);
  setSetting('default_tone', input.defaultTone);
  setApiKeyEncrypted(input.aiApiKey);

  clearSetupToken();
  audit({ userId: user.id, action: 'setup.complete', entityType: 'user', entityId: user.id });
}
