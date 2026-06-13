import { Router } from 'express';
import db from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const prompts = db
      .prepare('SELECT * FROM prompt_templates ORDER BY is_default DESC, created_at DESC')
      .all();
    res.json(prompts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, template, is_default, description, output_mode } = req.body;
    if (!name || !template) return res.status(400).json({ error: 'Name and template are required' });

    if (is_default) {
      db.prepare('UPDATE prompt_templates SET is_default = 0').run();
    }

    const result = db
      .prepare(
        'INSERT INTO prompt_templates (name, template, description, is_default, output_mode) VALUES (?, ?, ?, ?, ?)'
      )
      .run(name, template, description || '', is_default ? 1 : 0, output_mode || 'json');
    const prompt = db
      .prepare('SELECT * FROM prompt_templates WHERE id = ?')
      .get(result.lastInsertRowid);
    res.status(201).json(prompt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, template, is_default, description, output_mode } = req.body;

    if (is_default) {
      db.prepare('UPDATE prompt_templates SET is_default = 0').run();
    }

    db.prepare(
      'UPDATE prompt_templates SET name = ?, template = ?, description = ?, output_mode = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(
      name,
      template,
      description || '',
      output_mode || 'json',
      is_default ? 1 : 0,
      req.params.id
    );
    const prompt = db.prepare('SELECT * FROM prompt_templates WHERE id = ?').get(req.params.id);
    res.json(prompt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM prompt_templates WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
