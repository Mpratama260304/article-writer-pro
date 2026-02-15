import { Router } from 'express';
import db from '../database.js';

const router = Router();

router.get('/stats', (req, res) => {
  try {
    const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
    const totalArticles = db.prepare('SELECT COUNT(*) as count FROM articles').get().count;
    const completedArticles = db.prepare("SELECT COUNT(*) as count FROM articles WHERE status = 'completed'").get().count;
    const pendingArticles = db.prepare("SELECT COUNT(*) as count FROM articles WHERE status IN ('pending', 'generating')").get().count;

    const recentArticles = db
      .prepare(
        `SELECT a.id, a.title, a.keyword, a.status, a.created_at, p.name as project_name
         FROM articles a
         JOIN projects p ON a.project_id = p.id
         ORDER BY a.created_at DESC
         LIMIT 10`
      )
      .all();

    res.json({
      totalProjects,
      totalArticles,
      completedArticles,
      pendingArticles,
      recentArticles,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
