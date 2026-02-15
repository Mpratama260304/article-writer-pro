import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import projectsRouter from './routes/projects.js';
import articlesRouter from './routes/articles.js';
import generatorRouter from './routes/generator.js';
import promptsRouter from './routes/prompts.js';
import templatesRouter from './routes/templates.js';
import settingsRouter from './routes/settings.js';
import exportRouter from './routes/export.js';
import dashboardRouter from './routes/dashboard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API Routes
app.use('/api/projects', projectsRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/generate', generatorRouter);
app.use('/api/prompts', promptsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/export', exportRouter);
app.use('/api/dashboard', dashboardRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`ArticleWriterPro server running on http://localhost:${PORT}`);
});

export default app;
