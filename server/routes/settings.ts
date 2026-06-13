import { Router } from 'express';

import { parseOrThrow, settingsUpdateSchema, testConnectionSchema } from '../schemas/index.js';
import { audit } from '../services/audit-service.js';
// ai-service is JS; tsx resolves the .js specifier at runtime.
import { testConnection } from '../services/ai-service.js';
import {
  getAiSettingsForServerUse,
  getPublicSettings,
  updateSettingsSafely,
} from '../services/settings-service.js';

const router = Router();

/** Public settings only — never returns the raw API key (masked instead). */
router.get('/', (_req, res) => {
  res.json(getPublicSettings());
});

/** Update settings. Empty `ai_api_key` keeps the existing key. */
router.put('/', (req, res, next) => {
  try {
    const input = parseOrThrow(settingsUpdateSchema, req.body);
    updateSettingsSafely(input);
    audit({ userId: req.user?.sub ?? null, action: 'settings.update', req });
    res.json(getPublicSettings());
  } catch (err) {
    next(err);
  }
});

/**
 * Test the AI provider connection using the SERVER-SIDE decrypted key. Optional
 * unsaved overrides (base url / model / key) may be supplied for pre-save
 * testing; the key is never returned to the client.
 */
router.post('/test-connection', async (req, res, next) => {
  try {
    const overrides = parseOrThrow(testConnectionSchema, req.body ?? {});
    const stored = getAiSettingsForServerUse();

    const apiBaseUrl = overrides.ai_base_url?.trim() || stored.baseUrl;
    const model = overrides.ai_model?.trim() || stored.model;
    const apiKey = overrides.ai_api_key?.trim() || stored.apiKey;

    const message = await testConnection({ apiBaseUrl, apiKey, model });
    res.json({ success: true, message });
  } catch (err) {
    // Safe error — do not leak provider internals/stack.
    const msg = err instanceof Error ? err.message : 'Connection failed';
    res.status(400).json({ success: false, error: msg });
    void next;
  }
});

export default router;
