import { Router } from 'express';
import db from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM html_templates ORDER BY is_default DESC, created_at DESC').all();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, content, is_default } = req.body;
    if (!name || !content) return res.status(400).json({ error: 'Name and content are required' });

    if (is_default) {
      db.prepare('UPDATE html_templates SET is_default = 0').run();
    }

    const result = db
      .prepare('INSERT INTO html_templates (name, content, is_default) VALUES (?, ?, ?)')
      .run(name, content, is_default ? 1 : 0);
    const template = db.prepare('SELECT * FROM html_templates WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, content, is_default } = req.body;

    if (is_default) {
      db.prepare('UPDATE html_templates SET is_default = 0').run();
    }

    db.prepare('UPDATE html_templates SET name = ?, content = ?, is_default = ? WHERE id = ?').run(
      name,
      content,
      is_default ? 1 : 0,
      req.params.id
    );
    const template = db.prepare('SELECT * FROM html_templates WHERE id = ?').get(req.params.id);
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM html_templates WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
