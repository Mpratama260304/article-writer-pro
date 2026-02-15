import { Router } from 'express';
import db from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const prompts = db.prepare('SELECT * FROM prompts ORDER BY is_default DESC, created_at DESC').all();
    res.json(prompts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, template, is_default } = req.body;
    if (!name || !template) return res.status(400).json({ error: 'Name and template are required' });

    if (is_default) {
      db.prepare('UPDATE prompts SET is_default = 0').run();
    }

    const result = db
      .prepare('INSERT INTO prompts (name, template, is_default) VALUES (?, ?, ?)')
      .run(name, template, is_default ? 1 : 0);
    const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(prompt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, template, is_default } = req.body;

    if (is_default) {
      db.prepare('UPDATE prompts SET is_default = 0').run();
    }

    db.prepare('UPDATE prompts SET name = ?, template = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      name,
      template,
      is_default ? 1 : 0,
      req.params.id
    );
    const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(req.params.id);
    res.json(prompt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM prompts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
