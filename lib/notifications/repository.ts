import { Pool, type PoolClient } from "pg"

import { normalizePostgresConnectionString } from "@/lib/database/connection-string"
import type { NotificationPage, NotificationType } from "@/lib/notifications/types"

const globalForNotifications = globalThis as unknown as { gbqNotificationsPool?: Pool; gbqNotificationsReady?: Promise<void> }

function getPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL não configurada")
  globalForNotifications.gbqNotificationsPool ??= new Pool({
    connectionString: normalizePostgresConnectionString(connectionString),
    application_name: "gbq-notifications",
    max: 5,
    connectionTimeoutMillis: 5_000,
  })
  return globalForNotifications.gbqNotificationsPool
}

async function initializeNotifications() {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS integration_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      external_event_id text NOT NULL UNIQUE,
      event_type text NOT NULL,
      received_at timestamptz NOT NULL DEFAULT now(),
      processed_at timestamptz,
      status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'failed', 'ignored'))
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      external_event_id text,
      type text NOT NULL,
      title text NOT NULL,
      body text NOT NULL DEFAULT '',
      href text,
      read_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
      CONSTRAINT notifications_internal_href CHECK (href IS NULL OR href LIKE '/%')
    );
    CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_user_unique_idx ON notifications (external_event_id, user_id) WHERE external_event_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS notifications_user_read_created_idx ON notifications (user_id, read_at, created_at DESC);
    CREATE INDEX IF NOT EXISTS integration_events_external_event_idx ON integration_events (external_event_id);
  `)
}

async function ensureNotificationsDatabase() {
  globalForNotifications.gbqNotificationsReady ??= initializeNotifications().catch((error) => {
    globalForNotifications.gbqNotificationsReady = undefined
    throw error
  })
  await globalForNotifications.gbqNotificationsReady
}

export async function claimIntegrationEvent(externalEventId: string, eventType: string) {
  await ensureNotificationsDatabase()
  const result = await getPool().query(`
    INSERT INTO integration_events (external_event_id, event_type, status)
    VALUES ($1, $2, 'processing')
    ON CONFLICT (external_event_id) DO UPDATE SET status = 'processing', received_at = now()
      WHERE integration_events.status = 'failed'
    RETURNING id
  `, [externalEventId, eventType])
  return Boolean(result.rowCount)
}

export async function finishIntegrationEvent(externalEventId: string, status: "processed" | "failed" | "ignored") {
  await ensureNotificationsDatabase()
  await getPool().query(`UPDATE integration_events SET status = $2, processed_at = CASE WHEN $2 = 'failed' THEN NULL ELSE now() END WHERE external_event_id = $1`, [externalEventId, status])
}

export async function resolveWhatsappRecipients(contactWaId: string) {
  await ensureNotificationsDatabase()
  const normalized = contactWaId.replace(/\D/g, "")
  const result = await getPool().query<{ user_id: string; project_id: string | null; project_name: string | null; contact_name: string | null }>(`
    WITH matched_clients AS (
      SELECT id, name FROM app_users WHERE role = 'client'
        AND regexp_replace(phone, '\\D', '', 'g') <> ''
        AND right($1, length(regexp_replace(phone, '\\D', '', 'g'))) = regexp_replace(phone, '\\D', '', 'g')
    ), matched_projects AS (
      SELECT p.id, p.name, p.responsible_user_id, c.name contact_name FROM projects p JOIN matched_clients c ON c.id = p.client_user_id
    ), recipients AS (
      SELECT u.id user_id, mp.id project_id, mp.name project_name, mp.contact_name FROM app_users u LEFT JOIN matched_projects mp ON true WHERE u.role = 'admin'
      UNION
      SELECT responsible_user_id, id, name, contact_name FROM matched_projects WHERE responsible_user_id IS NOT NULL
    )
    SELECT DISTINCT ON (user_id) user_id, project_id, project_name, contact_name FROM recipients ORDER BY user_id, project_id NULLS LAST
  `, [normalized])
  return result.rows
}

export async function createEventNotifications(input: { externalEventId: string; recipients: Array<{ user_id: string; project_id: string | null; project_name: string | null; contact_name: string | null }>; type: NotificationType; title: string; body: string; metadata: Record<string, unknown> }) {
  await ensureNotificationsDatabase()
  if (!input.recipients.length) return
  const client = await getPool().connect()
  try {
    await client.query("BEGIN")
    for (const recipient of input.recipients) {
      await insertNotification(client, { ...input, recipient })
    }
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally { client.release() }
}

async function insertNotification(client: PoolClient, input: { externalEventId: string; recipient: { user_id: string; project_id: string | null; project_name: string | null; contact_name: string | null }; type: NotificationType; title: string; body: string; metadata: Record<string, unknown> }) {
  const href = input.recipient.project_id ? `/projetos?project=${encodeURIComponent(input.recipient.project_id)}` : "/projetos"
  await client.query(`
    INSERT INTO notifications (user_id, external_event_id, type, title, body, href, metadata_json)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    ON CONFLICT (external_event_id, user_id) WHERE external_event_id IS NOT NULL DO NOTHING
  `, [input.recipient.user_id, input.externalEventId, input.type, input.title, input.body, href, JSON.stringify({ ...input.metadata, projectId: input.recipient.project_id, projectName: input.recipient.project_name })])
}

export async function listNotifications(userId: string, input: { limit: number; cursor?: string }): Promise<NotificationPage> {
  await ensureNotificationsDatabase()
  const cursor = decodeCursor(input.cursor)
  const result = await getPool().query<{
    id: string; type: NotificationType; title: string; body: string; href: string | null; read_at: Date | null; created_at: Date; metadata_json: Record<string, unknown>
  }>(`
    SELECT id, type, title, body, href, read_at, created_at, metadata_json FROM notifications
    WHERE user_id = $1 AND ($2::timestamptz IS NULL OR (created_at, id) < ($2::timestamptz, $3::uuid))
    ORDER BY created_at DESC, id DESC LIMIT $4
  `, [userId, cursor?.createdAt ?? null, cursor?.id ?? null, input.limit + 1])
  const unread = await getPool().query<{ count: number }>(`SELECT count(*)::int count FROM notifications WHERE user_id = $1 AND read_at IS NULL`, [userId])
  const hasMore = result.rows.length > input.limit
  const rows = result.rows.slice(0, input.limit)
  return {
    data: rows.map((row) => ({ id: row.id, type: row.type, title: row.title, body: row.body, href: safeInternalHref(row.href), readAt: row.read_at?.toISOString() ?? null, createdAt: row.created_at.toISOString(), metadata: row.metadata_json ?? {} })),
    nextCursor: hasMore && rows.length ? encodeCursor(rows[rows.length - 1]) : null,
    unreadCount: unread.rows[0]?.count ?? 0,
  }
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await ensureNotificationsDatabase()
  const result = await getPool().query(`UPDATE notifications SET read_at = COALESCE(read_at, now()) WHERE id = $1 AND user_id = $2`, [notificationId, userId])
  return Boolean(result.rowCount)
}

export async function markAllNotificationsRead(userId: string) {
  await ensureNotificationsDatabase()
  await getPool().query(`UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`, [userId])
}

function safeInternalHref(href: string | null) { return href?.startsWith("/") && !href.startsWith("//") ? href : null }
function encodeCursor(row: { created_at: Date; id: string }) { return Buffer.from(JSON.stringify([row.created_at.toISOString(), row.id])).toString("base64url") }
function decodeCursor(cursor?: string) {
  if (!cursor) return null
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    if (Array.isArray(value) && value.length === 2 && typeof value[0] === "string" && typeof value[1] === "string") return { createdAt: value[0], id: value[1] }
  } catch { /* invalid cursors are treated as the first page */ }
  return null
}
