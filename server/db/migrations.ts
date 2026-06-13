import type DatabaseType from 'better-sqlite3';

/**
 * Lightweight, ordered migration runner for the SQLite database.
 *
 * Each migration has a stable string `id` and an `up` function. Applied
 * migration ids are recorded in the `_migrations` table so each runs exactly
 * once. Migrations run inside a transaction and are idempotent where practical
 * (using `IF NOT EXISTS` / column existence checks) so they are safe against
 * databases created by earlier versions of the app.
 */

export interface Migration {
  id: string;
  up: (db: DatabaseType.Database) => void;
}

/** Add a column only if it does not already exist. */
function addColumnIfMissing(
  db: DatabaseType.Database,
  table: string,
  column: string,
  definition: string,
): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.find((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

/** Returns true if a table exists. */
function tableExists(db: DatabaseType.Database, name: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
    .get(name);
  return Boolean(row);
}

const migrations: Migration[] = [
  // ── 001: v1 baseline (idempotent — matches the original schema) ──
  {
    id: '001_baseline',
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          title TEXT DEFAULT '',
          keyword TEXT NOT NULL,
          content TEXT DEFAULT '',
          slug TEXT DEFAULT '',
          excerpt TEXT DEFAULT '',
          tags TEXT DEFAULT '[]',
          status TEXT DEFAULT 'pending',
          error_message TEXT DEFAULT '',
          language TEXT DEFAULT 'English',
          tone TEXT DEFAULT 'informational',
          word_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS prompts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          template TEXT NOT NULL,
          is_default INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS html_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          content TEXT NOT NULL,
          is_default INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS jobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          status TEXT DEFAULT 'running',
          total INTEGER DEFAULT 0,
          completed INTEGER DEFAULT 0,
          failed INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS job_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          job_id INTEGER NOT NULL,
          keyword TEXT NOT NULL,
          status TEXT DEFAULT 'waiting',
          article_id INTEGER,
          error_message TEXT DEFAULT '',
          started_at DATETIME,
          finished_at DATETIME,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
          FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
        );
      `);
    },
  },

  // ── 002: v2 schema (users, audit_logs, expanded tables, renamed canonical tables) ──
  {
    id: '002_v2_schema',
    up(db) {
      // -- Admin users --
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'admin',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login_at DATETIME
        );
      `);

      // -- Audit logs --
      db.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          entity_type TEXT DEFAULT '',
          entity_id INTEGER,
          ip_address TEXT,
          user_agent TEXT,
          metadata_json TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );
      `);

      // -- Expand projects --
      addColumnIfMissing(db, 'projects', 'language', "TEXT DEFAULT 'English'");
      addColumnIfMissing(db, 'projects', 'tone', "TEXT DEFAULT 'informational'");
      addColumnIfMissing(db, 'projects', 'category', "TEXT DEFAULT ''");
      addColumnIfMissing(db, 'projects', 'author', "TEXT DEFAULT ''");
      addColumnIfMissing(db, 'projects', 'brand', "TEXT DEFAULT ''");
      addColumnIfMissing(db, 'projects', 'audience', "TEXT DEFAULT ''");
      addColumnIfMissing(db, 'projects', 'default_prompt_id', 'INTEGER');

      // -- Expand articles --
      addColumnIfMissing(db, 'articles', 'meta_title', "TEXT DEFAULT ''");
      addColumnIfMissing(db, 'articles', 'meta_description', "TEXT DEFAULT ''");
      addColumnIfMissing(db, 'articles', 'content_html', "TEXT DEFAULT ''");
      addColumnIfMissing(db, 'articles', 'content_markdown', "TEXT DEFAULT ''");
      addColumnIfMissing(db, 'articles', 'faq_json', "TEXT DEFAULT '[]'");
      addColumnIfMissing(db, 'articles', 'tags_json', "TEXT DEFAULT '[]'");
      addColumnIfMissing(db, 'articles', 'category', "TEXT DEFAULT ''");
      addColumnIfMissing(db, 'articles', 'ai_provider', "TEXT DEFAULT ''");
      addColumnIfMissing(db, 'articles', 'ai_model', "TEXT DEFAULT ''");
      addColumnIfMissing(db, 'articles', 'prompt_id', 'INTEGER');
      addColumnIfMissing(db, 'articles', 'generation_job_id', 'INTEGER');
      addColumnIfMissing(db, 'articles', 'token_usage_prompt', 'INTEGER DEFAULT 0');
      addColumnIfMissing(db, 'articles', 'token_usage_completion', 'INTEGER DEFAULT 0');
      addColumnIfMissing(db, 'articles', 'token_usage_total', 'INTEGER DEFAULT 0');

      // Backfill content_html / tags_json from legacy columns where empty.
      db.exec(`
        UPDATE articles
        SET content_html = content
        WHERE (content_html IS NULL OR content_html = '') AND content IS NOT NULL AND content <> '';
      `);
      db.exec(`
        UPDATE articles
        SET tags_json = tags
        WHERE (tags_json IS NULL OR tags_json = '' OR tags_json = '[]') AND tags IS NOT NULL AND tags <> '';
      `);

      // -- prompt_templates (canonical replacement for prompts) --
      db.exec(`
        CREATE TABLE IF NOT EXISTS prompt_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          template TEXT NOT NULL,
          description TEXT DEFAULT '',
          is_default INTEGER DEFAULT 0,
          output_mode TEXT DEFAULT 'json',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      // Migrate existing prompts into prompt_templates (once).
      if (tableExists(db, 'prompts')) {
        const count = db.prepare('SELECT COUNT(*) as c FROM prompt_templates').get() as {
          c: number;
        };
        if (count.c === 0) {
          db.exec(`
            INSERT INTO prompt_templates (name, template, is_default, created_at, updated_at)
            SELECT name, template, is_default, created_at, updated_at FROM prompts;
          `);
        }
      }

      // -- Expand html_templates --
      addColumnIfMissing(db, 'html_templates', 'updated_at', 'DATETIME');

      // -- generation_jobs (canonical replacement for jobs) --
      // NOTE: status columns are unconstrained TEXT on purpose so the existing
      // (legacy) job runner keeps working until Phase 5 normalizes it.
      db.exec(`
        CREATE TABLE IF NOT EXISTS generation_jobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          status TEXT DEFAULT 'queued',
          total INTEGER DEFAULT 0,
          completed INTEGER DEFAULT 0,
          failed INTEGER DEFAULT 0,
          canceled INTEGER DEFAULT 0,
          queued INTEGER DEFAULT 0,
          running INTEGER DEFAULT 0,
          language TEXT DEFAULT '',
          tone TEXT DEFAULT '',
          length TEXT DEFAULT '',
          prompt_id INTEGER,
          ai_provider TEXT DEFAULT '',
          ai_model TEXT DEFAULT '',
          concurrency INTEGER DEFAULT 1,
          delay_ms INTEGER DEFAULT 2000,
          started_at DATETIME,
          finished_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS generation_job_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          job_id INTEGER NOT NULL,
          keyword TEXT NOT NULL,
          status TEXT DEFAULT 'queued',
          article_id INTEGER,
          error_message TEXT DEFAULT '',
          retry_count INTEGER DEFAULT 0,
          started_at DATETIME,
          finished_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (job_id) REFERENCES generation_jobs(id) ON DELETE CASCADE,
          FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL
        );
      `);

      // Migrate legacy jobs / job_items once.
      if (tableExists(db, 'jobs')) {
        const count = db.prepare('SELECT COUNT(*) as c FROM generation_jobs').get() as {
          c: number;
        };
        if (count.c === 0) {
          db.exec(`
            INSERT INTO generation_jobs (id, project_id, status, total, completed, failed, created_at)
            SELECT id, project_id, status, total, completed, failed, created_at FROM jobs;
          `);
          db.exec(`
            INSERT INTO generation_job_items
              (id, job_id, keyword, status, article_id, error_message, started_at, finished_at)
            SELECT id, job_id, keyword, status, article_id, error_message, started_at, finished_at
            FROM job_items;
          `);
        }
      }

      // -- Migrate legacy setting keys to canonical v2 keys --
      const renameSetting = (oldKey: string, newKey: string): void => {
        const oldRow = db.prepare('SELECT value FROM settings WHERE key = ?').get(oldKey) as
          | { value: string }
          | undefined;
        const newRow = db.prepare('SELECT value FROM settings WHERE key = ?').get(newKey);
        if (oldRow && !newRow) {
          db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(newKey, oldRow.value);
        }
        if (oldRow) {
          db.prepare('DELETE FROM settings WHERE key = ?').run(oldKey);
        }
      };
      renameSetting('api_base_url', 'ai_base_url');
      renameSetting('model', 'ai_model');
      // Intentionally DROP any legacy plaintext api_key — it must be re-entered
      // (encrypted) via the setup wizard / settings. Never keep a plaintext key.
      db.prepare('DELETE FROM settings WHERE key = ?').run('api_key');
    },
  },
];

/** Apply all not-yet-applied migrations in order. */
export function runMigrations(db: DatabaseType.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const isApplied = db.prepare('SELECT 1 FROM _migrations WHERE id = ?');
  const markApplied = db.prepare('INSERT INTO _migrations (id) VALUES (?)');

  for (const migration of migrations) {
    if (isApplied.get(migration.id)) continue;
    const tx = db.transaction(() => {
      migration.up(db);
      markApplied.run(migration.id);
    });
    tx();
    // eslint-disable-next-line no-console
    console.log(`Migration applied: ${migration.id}`);
  }
}
