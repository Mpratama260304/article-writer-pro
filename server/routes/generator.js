import { Router } from 'express';
import db from '../database.js';
import { generateArticle } from '../services/ai-service.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { projectId, keywords, language, tone, length, promptId } = req.body;

    if (!projectId || !keywords || !keywords.length) {
      return res.status(400).json({ error: 'projectId and keywords are required' });
    }

    // Get prompt template
    let promptTemplate;
    if (promptId) {
      const prompt = db.prepare('SELECT template FROM prompts WHERE id = ?').get(promptId);
      promptTemplate = prompt ? prompt.template : null;
    }
    if (!promptTemplate) {
      const defaultPrompt = db.prepare('SELECT template FROM prompts WHERE is_default = 1').get();
      promptTemplate = defaultPrompt ? defaultPrompt.template : 'Write an article about "{keyword}" in {language} with a {tone} tone.';
    }

    // Get settings for AI config
    const settings = {};
    const rows = db.prepare('SELECT key, value FROM settings').all();
    rows.forEach((r) => (settings[r.key] = r.value));

    const aiConfig = {
      apiBaseUrl: settings.api_base_url,
      apiKey: settings.api_key,
      model: settings.model,
      maxTokens: parseInt(settings.max_tokens) || 4096,
      temperature: parseFloat(settings.temperature) || 0.7,
    };

    const rateLimitMs = parseInt(settings.rate_limit_ms) || 2000;
    const lang = language || settings.default_language || 'Indonesian';
    const articleTone = tone || settings.default_tone || 'informational';
    const articleLength = length || 'medium';

    // Create article entries as pending
    const insertArticle = db.prepare(
      'INSERT INTO articles (project_id, keyword, language, tone, status) VALUES (?, ?, ?, ?, ?)'
    );
    const articleIds = [];
    for (const kw of keywords) {
      const trimmed = kw.trim();
      if (!trimmed) continue;
      const result = insertArticle.run(projectId, trimmed, lang, articleTone, 'pending');
      articleIds.push({ id: result.lastInsertRowid, keyword: trimmed });
    }

    // Set headers for streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const sendEvent = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Process sequentially with rate limiting
    for (let i = 0; i < articleIds.length; i++) {
      const { id, keyword } = articleIds[i];

      sendEvent({
        type: 'progress',
        articleId: id,
        keyword,
        status: 'generating',
        current: i + 1,
        total: articleIds.length,
      });

      // Mark as generating
      db.prepare("UPDATE articles SET status = 'generating', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);

      try {
        const result = await generateArticle(keyword, promptTemplate, lang, articleTone, articleLength, aiConfig);

        db.prepare(
          "UPDATE articles SET title = ?, content = ?, word_count = ?, status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(result.title || keyword, result.content, result.wordCount, id);

        sendEvent({
          type: 'progress',
          articleId: id,
          keyword,
          status: 'completed',
          title: result.title,
          wordCount: result.wordCount,
          current: i + 1,
          total: articleIds.length,
        });
      } catch (err) {
        db.prepare(
          "UPDATE articles SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(err.message, id);

        sendEvent({
          type: 'progress',
          articleId: id,
          keyword,
          status: 'failed',
          error: err.message,
          current: i + 1,
          total: articleIds.length,
        });
      }

      // Rate limiting between calls
      if (i < articleIds.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, rateLimitMs));
      }
    }

    sendEvent({ type: 'done', total: articleIds.length });
    res.end();
  } catch (err) {
    // If headers not sent yet
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  }
});

export default router;
