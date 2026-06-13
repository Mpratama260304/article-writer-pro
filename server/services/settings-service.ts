import db from '../database.js';
import { decryptSecret, encryptSecret, isEncrypted, maskSecret } from '../lib/crypto.js';

/**
 * Settings service: a thin, safe layer over the key-value `settings` table.
 *
 * SECURITY MODEL
 *  - The AI API key is stored ENCRYPTED (`encryptSecret`) at rest.
 *  - The full key is NEVER returned to the frontend — only a mask.
 *  - Only `getAiSettingsForServerUse()` decrypts the key, for server-side calls.
 */

const AI_API_KEY = 'ai_api_key';

/** Setting keys that must never be exposed to the frontend. */
const SECRET_KEYS = new Set([AI_API_KEY]);

export function getSetting(key: string): string | undefined {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
}

function getAllRaw(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{
    key: string;
    value: string;
  }>;
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

/**
 * Settings safe for the frontend. Excludes the raw API key; instead exposes a
 * masked preview plus a boolean indicating whether a key is configured.
 */
export function getPublicSettings(): Record<string, unknown> {
  const all = getAllRaw();
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(all)) {
    if (SECRET_KEYS.has(key)) continue;
    out[key] = value;
  }

  const encryptedKey = all[AI_API_KEY];
  let masked = '';
  if (encryptedKey) {
    try {
      masked = maskSecret(decryptSecret(encryptedKey));
    } catch {
      masked = '••••';
    }
  }
  out.ai_api_key_masked = masked;
  out.ai_api_key_set = Boolean(encryptedKey);
  return out;
}

export interface AiServerSettings {
  providerName: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  rateLimitMs: number;
  concurrency: number;
}

/**
 * Full AI configuration for SERVER-SIDE use only, with the API key decrypted.
 * Must never be sent to the frontend.
 */
export function getAiSettingsForServerUse(): AiServerSettings {
  const all = getAllRaw();
  const rawKey = all[AI_API_KEY] ?? '';
  let apiKey = '';
  if (rawKey) {
    try {
      apiKey = decryptSecret(rawKey);
    } catch {
      apiKey = '';
    }
  }
  return {
    providerName: all.ai_provider_name ?? '',
    baseUrl: all.ai_base_url ?? '',
    model: all.ai_model ?? '',
    apiKey,
    maxTokens: Number.parseInt(all.max_tokens ?? '4096', 10) || 4096,
    temperature: Number.parseFloat(all.temperature ?? '0.7') || 0.7,
    rateLimitMs: Number.parseInt(all.rate_limit_ms ?? '2000', 10) || 2000,
    concurrency: Number.parseInt(all.concurrency ?? '1', 10) || 1,
  };
}

/** Non-secret setting keys that may be written from the settings form. */
const WRITABLE_KEYS = new Set([
  'ai_provider_name',
  'ai_base_url',
  'ai_model',
  'max_tokens',
  'temperature',
  'default_language',
  'default_tone',
  'rate_limit_ms',
  'concurrency',
]);

export interface SettingsUpdateInput {
  [key: string]: unknown;
  /** When non-empty, replaces the stored API key. Empty/absent = keep existing. */
  ai_api_key?: string;
}

/**
 * Safely persist a settings update.
 *  - Writes only allowlisted non-secret keys.
 *  - Encrypts `ai_api_key` only when a non-empty value is provided.
 *  - An empty/absent `ai_api_key` means "keep the existing key" (never erased here).
 */
export function updateSettingsSafely(input: SettingsUpdateInput): void {
  const tx = db.transaction(() => {
    for (const [key, value] of Object.entries(input)) {
      if (!WRITABLE_KEYS.has(key)) continue;
      if (value === undefined || value === null) continue;
      setSetting(key, String(value));
    }

    const newKey = typeof input.ai_api_key === 'string' ? input.ai_api_key.trim() : '';
    if (newKey) {
      // Avoid double-encrypting if a client somehow echoes an encrypted blob.
      const toStore = isEncrypted(newKey) ? newKey : encryptSecret(newKey);
      setSetting(AI_API_KEY, toStore);
    }
  });
  tx();
}

/** Store an already-plaintext API key, encrypting it. Used by the setup wizard. */
export function setApiKeyEncrypted(plaintextKey: string): void {
  setSetting(AI_API_KEY, encryptSecret(plaintextKey));
}
