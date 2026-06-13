import Database from 'better-sqlite3';

import { runMigrations } from './db/migrations.js';
import { seedDefaults } from './db/seed.js';
import { DB_PATH, ensureDataDir } from './lib/paths.js';

ensureDataDir();

const db = new Database(DB_PATH);

// Enable WAL mode for better performance.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Apply schema migrations, then seed non-secret defaults.
runMigrations(db);
seedDefaults(db);

// eslint-disable-next-line no-console
console.log('Database ready at:', DB_PATH);

export default db;
