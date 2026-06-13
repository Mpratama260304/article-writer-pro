import { Router } from 'express';

import { authRateLimiter } from '../middleware/security.js';
import { requireSetupToken } from '../middleware/auth.js';
import { parseOrThrow, setupSchema } from '../schemas/index.js';
import { completeSetup, getSetupStatus } from '../services/setup-service.js';

const router = Router();

/** Whether the app still needs first-run setup. Public. */
router.get('/status', (_req, res) => {
  res.json(getSetupStatus());
});

/** Complete first-run setup. Requires the one-time setup token. */
router.post('/complete', authRateLimiter(), requireSetupToken, async (req, res, next) => {
  try {
    const input = parseOrThrow(setupSchema, req.body);
    await completeSetup(input);
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
