import { Router } from 'express';
import db from '../database.js';

const router = Router();

// Get single article with content
router.get('/:id', (req, res) => {
  try {
    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete article
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List articles in project
router.get('/project/:projectId', (req, res) => {
  try {
    const articles = db
      .prepare(
        'SELECT id, title, keyword, status, word_count, created_at, error_message FROM articles WHERE project_id = ? ORDER BY created_at DESC'
      )
      .all(req.params.projectId);
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
