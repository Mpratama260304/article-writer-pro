import type DatabaseType from 'better-sqlite3';

/**
 * Seeds NON-SECRET defaults only.
 *
 * SECURITY: This never seeds an admin user, password, app secret, AI base URL,
 * AI model or API key. Those are created exclusively through the First-Run
 * Setup Wizard so the image ships with zero credentials.
 */
export function seedDefaults(db: DatabaseType.Database): void {
  // Non-secret default settings (no provider URL / model / key here).
  const defaultSettings: Array<{ key: string; value: string }> = [
    { key: 'max_tokens', value: '4096' },
    { key: 'temperature', value: '0.7' },
    { key: 'default_language', value: 'English' },
    { key: 'default_tone', value: 'informational' },
    { key: 'rate_limit_ms', value: '2000' },
    { key: 'concurrency', value: '1' },
  ];
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const s of defaultSettings) {
    insertSetting.run(s.key, s.value);
  }

  // Default prompt template (canonical table).
  const promptCount = db.prepare('SELECT COUNT(*) as count FROM prompt_templates').get() as {
    count: number;
  };
  if (promptCount.count === 0) {
    db.prepare(
      `INSERT INTO prompt_templates (name, template, description, is_default, output_mode)
       VALUES (?, ?, ?, 1, 'json')`,
    ).run(
      'Default SEO Article (JSON)',
      `You are a professional SEO content writer. Write a comprehensive, SEO-optimized article about "{keyword}".

Requirements:
- Engaging, click-worthy title that includes the keyword
- Approximately {length} words
- Use a {tone} tone, written entirely in {language}
- Structure the body with <h2>/<h3> subheadings and short paragraphs
- Target audience: {audience}
- Category: {category}
- Brand/site: {brand}
- Custom instruction: {custom_instruction}

Respond with STRICT JSON only, matching exactly this shape:
{
  "title": "...",
  "slug": "...",
  "excerpt": "...",
  "meta_title": "...",
  "meta_description": "...",
  "tags": ["..."],
  "category": "...",
  "content_html": "<h2>...</h2><p>...</p>",
  "faq": [{ "question": "...", "answer": "..." }]
}`,
      'Strict JSON SEO article with FAQ and metadata.',
    );
  }

  // Default HTML export template.
  const templateCount = db.prepare('SELECT COUNT(*) as count FROM html_templates').get() as {
    count: number;
  };
  if (templateCount.count === 0) {
    db.prepare(`INSERT INTO html_templates (name, content, is_default) VALUES (?, ?, 1)`).run(
      'Clean Blog',
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; line-height: 1.8; color: #333; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 2.2rem; margin-bottom: 0.5rem; color: #1a1a1a; }
    h2 { font-size: 1.6rem; margin: 2rem 0 1rem; color: #2a2a2a; border-bottom: 2px solid #eee; padding-bottom: 0.3rem; }
    h3 { font-size: 1.3rem; margin: 1.5rem 0 0.8rem; color: #3a3a3a; }
    p { margin-bottom: 1.2rem; }
    ul, ol { margin: 1rem 0; padding-left: 2rem; }
    li { margin-bottom: 0.5rem; }
    .meta { color: #888; font-size: 0.9rem; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <article>
    <h1>{{title}}</h1>
    <div class="meta">
      <span>By {{author}}</span> &bull;
      <span>{{date}}</span> &bull;
      <span>Keyword: {{keyword}}</span>
    </div>
    <div class="content">
      {{content}}
    </div>
  </article>
</body>
</html>`,
    );
  }
}
