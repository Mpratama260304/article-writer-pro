import bcrypt from 'bcryptjs';

import db from '../database.js';

export interface UserRow {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface PublicUser {
  id: number;
  username: string;
  email: string;
  role: string;
  last_login_at: string | null;
}

const BCRYPT_ROUNDS = 12;

export function countUsers(): number {
  const row = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  return row.c;
}

export function hasAdminUser(): boolean {
  return countUsers() > 0;
}

export function getUserById(id: number): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

function getUserByLogin(login: string): UserRow | undefined {
  return db
    .prepare('SELECT * FROM users WHERE username = ? OR email = ?')
    .get(login, login.toLowerCase()) as UserRow | undefined;
}

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    last_login_at: user.last_login_at,
  };
}

export async function createAdminUser(
  username: string,
  email: string,
  password: string,
): Promise<UserRow> {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const result = db
    .prepare(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES (?, ?, ?, 'admin')`,
    )
    .run(username, email.toLowerCase(), passwordHash);
  return getUserById(Number(result.lastInsertRowid)) as UserRow;
}

/**
 * Verify credentials. Returns the user on success, or null on failure.
 * Always runs a bcrypt comparison (even for unknown users) to reduce timing
 * differences between "user not found" and "wrong password".
 */
export async function verifyCredentials(
  login: string,
  password: string,
): Promise<UserRow | null> {
  const user = getUserByLogin(login);
  const hash = user?.password_hash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok) return null;
  return user;
}

export function recordLogin(userId: number): void {
  db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
}
