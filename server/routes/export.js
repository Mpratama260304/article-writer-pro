import { Router } from 'express';
import db from '../database.js';
import { generateWordPressXML, createHTMLZip, createMarkdownZip } from '../services/export-service.js';

const router = Router();

// Export as WordPress XML
router.post('/wordpress/:projectId', (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const articles = db
      .prepare("SELECT * FROM articles WHERE project_id = ? AND status = 'completed' ORDER BY created_at")
      .all(req.params.projectId);

    if (articles.length === 0) return res.status(400).json({ error: 'No completed articles to export' });

    const xml = generateWordPressXML(articles, project.name);
    const filename = `${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-wordpress.xml`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xml);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export as HTML ZIP
router.post('/html/:projectId', (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const articles = db
      .prepare("SELECT * FROM articles WHERE project_id = ? AND status = 'completed' ORDER BY created_at")
      .all(req.params.projectId);

    if (articles.length === 0) return res.status(400).json({ error: 'No completed articles to export' });

    // Get template - use selected or default
    const templateId = req.body.templateId;
    let template;
    if (templateId) {
      template = db.prepare('SELECT content FROM html_templates WHERE id = ?').get(templateId);
    }
    if (!template) {
      template = db.prepare('SELECT content FROM html_templates WHERE is_default = 1').get();
    }
    if (!template) {
      return res.status(400).json({ error: 'No HTML template found' });
    }

    const filename = `${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-html.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    createHTMLZip(articles, template.content, res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// Export as Markdown ZIP
router.post('/markdown/:projectId', (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const articles = db
      .prepare("SELECT * FROM articles WHERE project_id = ? AND status = 'completed' ORDER BY created_at")
      .all(req.params.projectId);

    if (articles.length === 0) return res.status(400).json({ error: 'No completed articles to export' });

    const filename = `${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-markdown.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    createMarkdownZip(articles, res);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

export default router;
