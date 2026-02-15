import { Router } from 'express';
import db from '../database.js';
import { generateArticle } from '../services/ai-service.js';

const router = Router();

// In-memory map of running jobs for cancellation signaling
const runningJobs = new Map(); // jobId -> { canceled: bool }

// ── Helper: load settings from DB ──
function loadSettings() {
  const settings = {};
  const rows = db.prepare('SELECT key, value FROM settings').all();
  rows.forEach((r) => (settings[r.key] = r.value));
  return settings;
}

// ── POST /api/generate — create job + start processing ──
router.post('/', async (req, res) => {
  try {
    const { projectId, keywords, language, tone, length, promptId } = req.body;

    if (!projectId || !keywords || !keywords.length) {
      return res.status(400).json({ error: 'projectId and keywords are required' });
    }

    // Resolve prompt template
    let promptTemplate;
    if (promptId) {
      const prompt = db.prepare('SELECT template FROM prompts WHERE id = ?').get(promptId);
      promptTemplate = prompt ? prompt.template : null;
    }
    if (!promptTemplate) {
      const defaultPrompt = db.prepare('SELECT template FROM prompts WHERE is_default = 1').get();
      promptTemplate = defaultPrompt
        ? defaultPrompt.template
        : 'Write an article about "{keyword}" in {language} with a {tone} tone.';
    }

    const settings = loadSettings();
    const lang = language || settings.default_language || 'Indonesian';
    const articleTone = tone || settings.default_tone || 'informational';
    const articleLength = length || 'medium';

    // Filter empty keywords
    const cleanKeywords = keywords.map((k) => k.trim()).filter(Boolean);
    if (cleanKeywords.length === 0) {
      return res.status(400).json({ error: 'No valid keywords provided' });
    }

    // Create job row
    const jobResult = db
      .prepare('INSERT INTO jobs (project_id, status, total) VALUES (?, ?, ?)')
      .run(projectId, 'running', cleanKeywords.length);
    const jobId = jobResult.lastInsertRowid;

    // Create job_items rows
    const insertItem = db.prepare(
      'INSERT INTO job_items (job_id, keyword, status) VALUES (?, ?, ?)'
    );
    for (const kw of cleanKeywords) {
      insertItem.run(jobId, kw, 'waiting');
    }

    // Register in-memory handle for cancellation
    const jobHandle = { canceled: false };
    runningJobs.set(Number(jobId), jobHandle);

    // Return jobId immediately — processing runs in background
    res.json({ jobId: Number(jobId) });

    // ── Background processing (fire-and-forget) ──
    const aiConfig = {
      apiBaseUrl: settings.api_base_url,
      apiKey: settings.api_key,
      model: settings.model,
      maxTokens: parseInt(settings.max_tokens) || 4096,
      temperature: parseFloat(settings.temperature) || 0.7,
    };
    const rateLimitMs = parseInt(settings.rate_limit_ms) || 2000;

    const items = db
      .prepare("SELECT * FROM job_items WHERE job_id = ? AND status = 'waiting' ORDER BY id")
      .all(jobId);

    let completedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < items.length; i++) {
      // Check cancellation
      if (jobHandle.canceled) {
        // Mark remaining items as canceled
        db.prepare(
          "UPDATE job_items SET status = 'canceled', finished_at = CURRENT_TIMESTAMP WHERE job_id = ? AND status = 'waiting'"
        ).run(jobId);
        break;
      }

      const item = items[i];

      // Mark item as generating
      db.prepare(
        "UPDATE job_items SET status = 'generating', started_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(item.id);

      try {
        const result = await generateArticle(
          item.keyword, promptTemplate, lang, articleTone, articleLength, aiConfig
        );

        // Insert article
        const artResult = db.prepare(
          `INSERT INTO articles (project_id, keyword, title, content, slug, excerpt, tags, word_count, language, tone, status, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)`
        ).run(
          projectId,
          item.keyword,
          result.title || item.keyword,
          result.content,
          result.slug,
          result.excerpt,
          JSON.stringify(result.tags || []),
          result.wordCount,
          lang,
          articleTone
        );

        // Update job_item
        db.prepare(
          "UPDATE job_items SET status = 'completed', article_id = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(artResult.lastInsertRowid, item.id);

        completedCount++;
      } catch (err) {
        // Insert article in failed state
        const artResult = db.prepare(
          `INSERT INTO articles (project_id, keyword, status, error_message, language, tone, updated_at)
           VALUES (?, ?, 'failed', ?, ?, ?, CURRENT_TIMESTAMP)`
        ).run(projectId, item.keyword, err.message, lang, articleTone);

        db.prepare(
          "UPDATE job_items SET status = 'failed', article_id = ?, error_message = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(artResult.lastInsertRowid, err.message, item.id);

        failedCount++;
      }

      // Update job aggregate
      db.prepare('UPDATE jobs SET completed = ?, failed = ? WHERE id = ?').run(
        completedCount, failedCount, jobId
      );

      // Rate limiting between calls
      if (i < items.length - 1 && !jobHandle.canceled) {
        await new Promise((resolve) => setTimeout(resolve, rateLimitMs));
      }
    }

    // Finalize job status
    const finalStatus = jobHandle.canceled ? 'canceled' : 'completed';
    db.prepare('UPDATE jobs SET status = ?, completed = ?, failed = ? WHERE id = ?').run(
      finalStatus, completedCount, failedCount, jobId
    );

    runningJobs.delete(Number(jobId));
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// ── GET /api/generate/stream/:jobId — SSE event stream ──
router.get('/stream/:jobId', (req, res) => {
  const jobId = parseInt(req.params.jobId);
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendSSE = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial job state
  const items = db.prepare('SELECT * FROM job_items WHERE job_id = ? ORDER BY id').all(jobId);
  sendSSE('job_started', { jobId, total: job.total, status: job.status });

  // Send current state of all items
  for (const item of items) {
    if (item.status !== 'waiting') {
      const eventName = item.status === 'completed' ? 'item_completed'
        : item.status === 'failed' ? 'item_failed'
        : item.status === 'generating' ? 'item_started'
        : item.status === 'canceled' ? 'item_failed'
        : 'item_started';
      sendSSE(eventName, {
        itemId: item.id,
        keyword: item.keyword,
        status: item.status,
        articleId: item.article_id,
        error: item.error_message || undefined,
      });
    }
  }

  sendSSE('job_progress', { completed: job.completed, failed: job.failed, total: job.total });

  // If job already done, send final event and close
  if (job.status !== 'running') {
    sendSSE('job_done', { status: job.status, completed: job.completed, failed: job.failed, total: job.total });
    res.end();
    return;
  }

  // Poll DB for updates
  let lastCompleted = job.completed;
  let lastFailed = job.failed;
  let lastItemStatuses = {};
  items.forEach((it) => { lastItemStatuses[it.id] = it.status; });

  const pollInterval = setInterval(() => {
    try {
      const currentJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
      if (!currentJob) {
        clearInterval(pollInterval);
        res.end();
        return;
      }

      // Check for item status changes
      const currentItems = db.prepare('SELECT * FROM job_items WHERE job_id = ? ORDER BY id').all(jobId);
      for (const item of currentItems) {
        const prevStatus = lastItemStatuses[item.id];
        if (prevStatus !== item.status) {
          lastItemStatuses[item.id] = item.status;

          if (item.status === 'generating') {
            sendSSE('item_started', { itemId: item.id, keyword: item.keyword, status: 'generating' });
          } else if (item.status === 'completed') {
            // Fetch article title & word_count
            const article = item.article_id
              ? db.prepare('SELECT title, word_count FROM articles WHERE id = ?').get(item.article_id)
              : null;
            sendSSE('item_completed', {
              itemId: item.id,
              keyword: item.keyword,
              status: 'completed',
              articleId: item.article_id,
              title: article?.title || item.keyword,
              wordCount: article?.word_count || 0,
            });
          } else if (item.status === 'failed' || item.status === 'canceled') {
            sendSSE('item_failed', {
              itemId: item.id,
              keyword: item.keyword,
              status: item.status,
              error: item.error_message || (item.status === 'canceled' ? 'Canceled' : 'Unknown error'),
            });
          }
        }
      }

      // Send progress if counts changed
      if (currentJob.completed !== lastCompleted || currentJob.failed !== lastFailed) {
        lastCompleted = currentJob.completed;
        lastFailed = currentJob.failed;
        sendSSE('job_progress', {
          completed: currentJob.completed,
          failed: currentJob.failed,
          total: currentJob.total,
        });
      }

      // Job finished
      if (currentJob.status !== 'running') {
        sendSSE('job_done', {
          status: currentJob.status,
          completed: currentJob.completed,
          failed: currentJob.failed,
          total: currentJob.total,
        });
        clearInterval(pollInterval);
        res.end();
      }
    } catch {
      // DB error during poll — silently continue
    }
  }, 500);

  // Heartbeat every 15s
  const heartbeatInterval = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { /* ignore */ }
  }, 15000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(pollInterval);
    clearInterval(heartbeatInterval);
  });
});

// ── POST /api/generate/cancel/:jobId ──
router.post('/cancel/:jobId', (req, res) => {
  const jobId = parseInt(req.params.jobId);
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'running') return res.json({ success: true, message: 'Job already ' + job.status });

  // Signal in-memory cancellation
  const handle = runningJobs.get(jobId);
  if (handle) handle.canceled = true;

  // Update DB
  db.prepare("UPDATE jobs SET status = 'canceled' WHERE id = ?").run(jobId);
  db.prepare(
    "UPDATE job_items SET status = 'canceled', finished_at = CURRENT_TIMESTAMP WHERE job_id = ? AND status IN ('waiting','generating')"
  ).run(jobId);

  res.json({ success: true });
});

// ── GET /api/generate/status/:jobId — poll-based status ──
router.get('/status/:jobId', (req, res) => {
  const jobId = parseInt(req.params.jobId);
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const items = db
    .prepare('SELECT id, keyword, status, article_id, error_message, started_at, finished_at FROM job_items WHERE job_id = ? ORDER BY id')
    .all(jobId);

  res.json({ ...job, items });
});

export default router;
