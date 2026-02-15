import { Router } from 'express';
import db from '../database.js';
import { testConnection } from '../services/ai-service.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    rows.forEach((r) => (settings[r.key] = r.value));
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', (req, res) => {
  try {
    const settings = req.body;
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const updateMany = db.transaction((entries) => {
      for (const [key, value] of Object.entries(entries)) {
        upsert.run(key, String(value));
      }
    });
    updateMany(settings);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/test-connection', async (req, res) => {
  try {
    const config = req.body;
    const result = await testConnection({
      apiBaseUrl: config.api_base_url,
      apiKey: config.api_key,
      model: config.model,
    });
    res.json({ success: true, message: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
