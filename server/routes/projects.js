import { Router } from 'express';
import db from '../database.js';

const router = Router();

// List all projects with article counts
router.get('/', (req, res) => {
  try {
    const projects = db
      .prepare(
        `SELECT p.*, 
          COUNT(a.id) as article_count,
          SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed_count
        FROM projects p
        LEFT JOIN articles a ON p.id = a.project_id
        GROUP BY p.id
        ORDER BY p.created_at DESC`
      )
      .all();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new project
router.post('/', (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = db
      .prepare('INSERT INTO projects (name, description) VALUES (?, ?)')
      .run(name, description || '');
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get project details
router.get('/:id', (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const articles = db
      .prepare('SELECT id, title, keyword, status, word_count, created_at, error_message FROM articles WHERE project_id = ? ORDER BY created_at DESC')
      .all(req.params.id);
    res.json({ ...project, articles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update project
router.put('/:id', (req, res) => {
  try {
    const { name, description } = req.body;
    db.prepare('UPDATE projects SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      name,
      description || '',
      req.params.id
    );
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete project and all its articles
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM articles WHERE project_id = ?').run(req.params.id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
