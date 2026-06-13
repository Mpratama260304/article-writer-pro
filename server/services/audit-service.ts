import type { Request } from 'express';

import db from '../database.js';

/**
 * Append an entry to the audit log. Best-effort: never throws into the request
 * path (failures are swallowed to avoid breaking the primary action).
 */
export function audit(params: {
  userId?: number | null;
  action: string;
  entityType?: string;
  entityId?: number | null;
  req?: Request;
  metadata?: Record<string, unknown>;
}): void {
  try {
    const ip = params.req?.ip ?? null;
    const ua = params.req?.get('user-agent') ?? null;
    db.prepare(
      `INSERT INTO audit_logs
        (user_id, action, entity_type, entity_id, ip_address, user_agent, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      params.userId ?? null,
      params.action,
      params.entityType ?? '',
      params.entityId ?? null,
      ip,
      ua,
      JSON.stringify(params.metadata ?? {}),
    );
  } catch {
    /* non-fatal: auditing must never break the request */
  }
}
