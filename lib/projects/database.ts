import { Pool } from "pg"
import { randomInt } from "node:crypto"

import { normalizePostgresConnectionString } from "@/lib/database/connection-string"

export type ProjectPriority = "high" | "medium" | "low"
export type TaskStatus = "todo" | "in_progress" | "waiting" | "done"

export type Project = {
  id: string
  code: string
  name: string
  area: string
  owner: string
  client_user_id: string | null
  client_name: string | null
  client_email: string | null
  responsible_user_id: string | null
  responsible_name: string | null
  priority: ProjectPriority
  deadline: string | null
  objective: string
  task_count: number
  completed_count: number
  progress: number
  created_at: Date
  updated_at: Date
}

export type ProjectTask = {
  id: string
  code: string
  project_id: string
  parent_task_id: string | null
  title: string
  description: string
  owner: string
  priority: ProjectPriority
  due_date: string | null
  status: TaskStatus
  position: number
  created_at: Date
  updated_at: Date
}

export type ChatTargetType = "project" | "task"

export type ChatMessage = {
  id: string
  target_type: ChatTargetType
  target_id: string
  author_id: string
  author_name: string
  author_role: "admin" | "client"
  body: string
  attachment_name: string | null
  attachment_type: string | null
  attachment_size: number | null
  created_at: Date
}

export type ChatUnread = {
  target_type: ChatTargetType
  target_id: string
  count: number
}

const CODE_LETTERS = "ACDEHJKMNPQRTUVWXY"
const CODE_DIGITS = "347"
const CODE_ALPHABET = `${CODE_LETTERS}${CODE_DIGITS}`

function createReadableCode() {
  const characters = [
    CODE_LETTERS[randomInt(CODE_LETTERS.length)],
    CODE_DIGITS[randomInt(CODE_DIGITS.length)],
    ...Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]),
  ]
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const other = randomInt(index + 1)
    ;[characters[index], characters[other]] = [characters[other], characters[index]]
  }
  return characters.join("")
}

const globalForProjects = globalThis as unknown as {
  gbqProjectsPool?: Pool
  gbqProjectsReady?: Promise<void>
}

function getPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL não configurada")

  globalForProjects.gbqProjectsPool ??= new Pool({
    connectionString: normalizePostgresConnectionString(connectionString),
    application_name: "gbq-projects",
    max: 5,
    connectionTimeoutMillis: 5_000,
  })

  return globalForProjects.gbqProjectsPool
}

async function initializeProjects() {
  const pool = getPool()

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      area text NOT NULL DEFAULT '',
      owner text NOT NULL DEFAULT '',
      client_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
      responsible_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
      priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
      deadline date,
      objective text NOT NULL DEFAULT '',
      created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  await pool.query(`
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS responsible_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS code text;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_tasks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title text NOT NULL,
      description text NOT NULL DEFAULT '',
      owner text NOT NULL DEFAULT '',
      priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
      due_date date,
      status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'waiting', 'done')),
      position integer NOT NULL DEFAULT 0,
      created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  await pool.query(`ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS code text`)
  await pool.query(`ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES project_tasks(id) ON DELETE CASCADE`)
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS projects_code_unique_idx ON projects (code) WHERE code IS NOT NULL`)
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS project_tasks_code_unique_idx ON project_tasks (code) WHERE code IS NOT NULL`)
  await backfillCodes("projects")
  await backfillCodes("project_tasks")
  await pool.query(`ALTER TABLE projects ALTER COLUMN code SET NOT NULL`)
  await pool.query(`ALTER TABLE project_tasks ALTER COLUMN code SET NOT NULL`)

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_code_format_check') THEN
        ALTER TABLE projects ADD CONSTRAINT projects_code_format_check CHECK (code ~ '^[ACDEHJKMNPQRTUVWXY347]{6}$' AND code ~ '[ACDEHJKMNPQRTUVWXY]' AND code ~ '[347]');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_tasks_code_format_check') THEN
        ALTER TABLE project_tasks ADD CONSTRAINT project_tasks_code_format_check CHECK (code ~ '^[ACDEHJKMNPQRTUVWXY347]{6}$' AND code ~ '[ACDEHJKMNPQRTUVWXY]' AND code ~ '[347]');
      END IF;
    END $$;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_chat_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      task_id uuid REFERENCES project_tasks(id) ON DELETE CASCADE,
      author_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
      body text NOT NULL DEFAULT '',
      attachment_name text,
      attachment_type text,
      attachment_size integer,
      attachment_data bytea,
      created_at timestamptz NOT NULL DEFAULT now(),
      CHECK (length(trim(body)) > 0 OR attachment_data IS NOT NULL),
      CHECK (attachment_size IS NULL OR attachment_size BETWEEN 1 AND 10485760)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_chat_reads (
      user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      target_type text NOT NULL CHECK (target_type IN ('project', 'task')),
      target_id uuid NOT NULL,
      read_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, target_type, target_id)
    )
  `)

  await pool.query(`CREATE INDEX IF NOT EXISTS project_tasks_project_status_idx ON project_tasks (project_id, status, position, created_at)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS project_chat_messages_target_idx ON project_chat_messages (project_id, task_id, created_at)`)
}

async function backfillCodes(table: "projects" | "project_tasks") {
  const pool = getPool()
  const result = await pool.query<{ id: string }>(`SELECT id FROM ${table} WHERE code IS NULL`)
  for (const row of result.rows) {
    for (;;) {
      try {
        const update = await pool.query(`UPDATE ${table} SET code = $1 WHERE id = $2 AND code IS NULL`, [createReadableCode(), row.id])
        if (update.rowCount) break
        break
      } catch (error) {
        if (!(error && typeof error === "object" && "code" in error && error.code === "23505")) throw error
      }
    }
  }
}

async function ensureProjectsDatabase() {
  globalForProjects.gbqProjectsReady ??= initializeProjects().catch((error) => {
    globalForProjects.gbqProjectsReady = undefined
    throw error
  })
  await globalForProjects.gbqProjectsReady
}

export async function listProjects(user?: { id: string; role: "admin" | "client" }): Promise<Project[]> {
  await ensureProjectsDatabase()
  const result = await getPool().query<Project>(`
    SELECT p.id, p.code, p.name, p.area, p.owner, p.client_user_id, client.name AS client_name,
      client.email AS client_email, p.responsible_user_id, responsible.name AS responsible_name, p.priority,
      p.deadline::text AS deadline, p.objective, p.created_at, p.updated_at,
      count(t.id)::int AS task_count,
      count(t.id) FILTER (WHERE t.status = 'done')::int AS completed_count,
      CASE WHEN count(t.id) = 0 THEN 0
        ELSE round(100.0 * count(t.id) FILTER (WHERE t.status = 'done') / count(t.id))::int
      END AS progress
    FROM projects p
    LEFT JOIN app_users client ON client.id = p.client_user_id
    LEFT JOIN app_users responsible ON responsible.id = p.responsible_user_id
    LEFT JOIN project_tasks t ON t.project_id = p.id
    WHERE ($1::boolean OR p.client_user_id = $2::uuid)
    GROUP BY p.id, client.id, responsible.id
    ORDER BY p.updated_at DESC, lower(p.name)
  `, [!user || user.role === "admin", user?.id ?? null])
  return result.rows
}

export async function listTasks(user?: { id: string; role: "admin" | "client" }): Promise<ProjectTask[]> {
  await ensureProjectsDatabase()
  const result = await getPool().query<ProjectTask>(`
    SELECT t.id, t.code, t.project_id, t.parent_task_id, t.title, t.description, t.owner, t.priority, t.due_date::text AS due_date,
      t.status, t.position, t.created_at, t.updated_at
    FROM project_tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE ($1::boolean OR p.client_user_id = $2::uuid)
    ORDER BY t.position, t.created_at
  `, [!user || user.role === "admin", user?.id ?? null])
  return result.rows
}

export async function createProject(input: {
  name: string
  area: string
  clientUserId: string
  responsibleUserId: string
  priority: ProjectPriority
  deadline: string | null
  objective: string
  createdBy: string
}) {
  await ensureProjectsDatabase()
  for (;;) {
    try {
      const result = await getPool().query(
        `INSERT INTO projects (code, name, area, owner, client_user_id, responsible_user_id, priority, deadline, objective, created_by)
         SELECT $1, $2, $3, responsible.name, client.id, responsible.id, $6, $7, $8, $9
         FROM app_users client, app_users responsible
         WHERE client.id = $4 AND client.role = 'client' AND responsible.id = $5 AND responsible.role <> 'client'`,
        [createReadableCode(), input.name, input.area, input.clientUserId, input.responsibleUserId, input.priority, input.deadline, input.objective, input.createdBy],
      )
      if (result.rowCount !== 1) throw new Error("INVALID_PROJECT_PARTICIPANTS")
      return
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "23505")) throw error
    }
  }
}

export async function updateProject(projectId: string, input: Omit<Parameters<typeof createProject>[0], "createdBy">) {
  await ensureProjectsDatabase()
  const result = await getPool().query(
    `UPDATE projects p SET name = $1, area = $2, owner = responsible.name,
      client_user_id = client.id, responsible_user_id = responsible.id, priority = $5, deadline = $6,
      objective = $7, updated_at = now()
     FROM app_users client, app_users responsible
     WHERE p.id = $8 AND client.id = $3 AND client.role = 'client'
       AND responsible.id = $4 AND responsible.role <> 'client'`,
    [input.name, input.area, input.clientUserId, input.responsibleUserId, input.priority, input.deadline, input.objective, projectId],
  )
  if (result.rowCount === 0) throw new Error("PROJECT_NOT_FOUND")
}

export async function deleteProject(projectId: string) {
  await ensureProjectsDatabase()
  const result = await getPool().query(`DELETE FROM projects WHERE id = $1`, [projectId])
  if (result.rowCount === 0) throw new Error("PROJECT_NOT_FOUND")
}

export async function createTask(input: {
  projectId: string
  title: string
  description: string
  owner: string
  priority: ProjectPriority
  dueDate: string | null
  status: TaskStatus
  createdBy: string
}) {
  await ensureProjectsDatabase()
  for (;;) {
    try {
      await getPool().query(
        `INSERT INTO project_tasks (code, project_id, title, description, owner, priority, due_date, status, position, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
           COALESCE((SELECT max(position) + 1 FROM project_tasks WHERE project_id = $2 AND status = $8), 0), $9)`,
        [createReadableCode(), input.projectId, input.title, input.description, input.owner, input.priority, input.dueDate, input.status, input.createdBy],
      )
      return
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "23505")) throw error
    }
  }
}

export async function updateTask(taskId: string, input: {
  title: string
  description: string
  owner: string
  priority: ProjectPriority
  dueDate: string | null
  status: TaskStatus
}) {
  await ensureProjectsDatabase()
  const result = await getPool().query(
    `UPDATE project_tasks SET title = $1, description = $2, owner = $3, priority = $4,
      due_date = $5, status = $6, updated_at = now() WHERE id = $7`,
    [input.title, input.description, input.owner, input.priority, input.dueDate, input.status, taskId],
  )
  if (result.rowCount === 0) throw new Error("TASK_NOT_FOUND")
}

export async function moveTask(taskId: string, status: TaskStatus) {
  await ensureProjectsDatabase()
  const result = await getPool().query(
    `UPDATE project_tasks SET status = $1,
      position = COALESCE((SELECT max(position) + 1 FROM project_tasks WHERE status = $1), 0),
      updated_at = now() WHERE id = $2`,
    [status, taskId],
  )
  if (result.rowCount === 0) throw new Error("TASK_NOT_FOUND")
}

export async function deleteTask(taskId: string) {
  await ensureProjectsDatabase()
  const result = await getPool().query(`DELETE FROM project_tasks WHERE id = $1`, [taskId])
  if (result.rowCount === 0) throw new Error("TASK_NOT_FOUND")
}

export async function createSubtask(parentTaskId: string, title: string, createdBy: string) {
  await ensureProjectsDatabase()
  for (;;) {
    try {
      const result = await getPool().query(
        `INSERT INTO project_tasks (code, project_id, parent_task_id, title, description, owner, priority, due_date, status, position, created_by)
         SELECT $1, parent.project_id, parent.id, $2, '', parent.owner, parent.priority, parent.due_date, 'todo',
           COALESCE((SELECT max(position) + 1 FROM project_tasks WHERE parent_task_id = parent.id), 0), $3
         FROM project_tasks parent WHERE parent.id = $4 AND parent.parent_task_id IS NULL`,
        [createReadableCode(), title, createdBy, parentTaskId],
      )
      if (!result.rowCount) throw new Error("TASK_NOT_FOUND")
      return
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "23505")) throw error
    }
  }
}

export async function updateSubtaskStatus(subtaskId: string, status: TaskStatus) {
  await ensureProjectsDatabase()
  const result = await getPool().query(
    `UPDATE project_tasks SET status = $1, updated_at = now() WHERE id = $2 AND parent_task_id IS NOT NULL`,
    [status, subtaskId],
  )
  if (!result.rowCount) throw new Error("TASK_NOT_FOUND")
}

async function resolveConversation(user: { id: string; role: "admin" | "client" }, targetType: ChatTargetType, targetId: string) {
  await ensureProjectsDatabase()
  const result = targetType === "project"
    ? await getPool().query<{ project_id: string }>(
        `SELECT p.id AS project_id FROM projects p
         WHERE p.id = $1 AND ($2::boolean OR p.client_user_id = $3 OR p.responsible_user_id = $3)`,
        [targetId, user.role === "admin", user.id],
      )
    : await getPool().query<{ project_id: string }>(
        `SELECT t.project_id FROM project_tasks t JOIN projects p ON p.id = t.project_id
         WHERE t.id = $1 AND ($2::boolean OR p.client_user_id = $3 OR p.responsible_user_id = $3)`,
        [targetId, user.role === "admin", user.id],
      )
  if (!result.rows[0]) throw new Error("CONVERSATION_NOT_FOUND")
  return result.rows[0].project_id
}

export async function listChatData(user: { id: string; role: "admin" | "client" }): Promise<{ messages: ChatMessage[]; unread: ChatUnread[] }> {
  await ensureProjectsDatabase()
  const access = user.role === "admin" ? "$1::uuid IS NOT NULL" : "p.client_user_id = $1 OR p.responsible_user_id = $1"
  const messages = await getPool().query<ChatMessage>(`
    WITH ranked AS (
      SELECT m.*, CASE WHEN m.task_id IS NULL THEN 'project' ELSE 'task' END AS target_type,
        COALESCE(m.task_id, m.project_id) AS target_id,
        row_number() OVER (PARTITION BY COALESCE(m.task_id, m.project_id) ORDER BY m.created_at DESC) AS row_number
      FROM project_chat_messages m
      JOIN projects p ON p.id = m.project_id
      WHERE ${access}
    )
    SELECT ranked.id, ranked.target_type, ranked.target_id, ranked.author_id, author.name AS author_name,
      author.role AS author_role, ranked.body, ranked.attachment_name, ranked.attachment_type,
      ranked.attachment_size, ranked.created_at
    FROM ranked JOIN app_users author ON author.id = ranked.author_id
    WHERE ranked.row_number <= 100
    ORDER BY ranked.created_at
  `, [user.id])
  const unread = await getPool().query<ChatUnread>(`
    SELECT CASE WHEN m.task_id IS NULL THEN 'project' ELSE 'task' END AS target_type,
      COALESCE(m.task_id, m.project_id) AS target_id, count(*)::int AS count
    FROM project_chat_messages m
    JOIN projects p ON p.id = m.project_id
    LEFT JOIN project_chat_reads r ON r.user_id = $1
      AND r.target_type = CASE WHEN m.task_id IS NULL THEN 'project' ELSE 'task' END
      AND r.target_id = COALESCE(m.task_id, m.project_id)
    WHERE (${access}) AND m.author_id <> $1 AND m.created_at > COALESCE(r.read_at, 'epoch'::timestamptz)
    GROUP BY target_type, target_id
  `, [user.id])
  return { messages: messages.rows, unread: unread.rows }
}

export async function addChatMessage(user: { id: string; role: "admin" | "client" }, input: {
  targetType: ChatTargetType
  targetId: string
  body: string
  attachment?: { name: string; type: string; size: number; data: Buffer }
}) {
  const projectId = await resolveConversation(user, input.targetType, input.targetId)
  await getPool().query(
    `INSERT INTO project_chat_messages
      (project_id, task_id, author_id, body, attachment_name, attachment_type, attachment_size, attachment_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [projectId, input.targetType === "task" ? input.targetId : null, user.id, input.body,
      input.attachment?.name ?? null, input.attachment?.type ?? null, input.attachment?.size ?? null,
      input.attachment?.data ?? null],
  )
}

export async function markConversationRead(user: { id: string; role: "admin" | "client" }, targetType: ChatTargetType, targetId: string) {
  await resolveConversation(user, targetType, targetId)
  await getPool().query(
    `INSERT INTO project_chat_reads (user_id, target_type, target_id, read_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id, target_type, target_id) DO UPDATE SET read_at = excluded.read_at`,
    [user.id, targetType, targetId],
  )
}

export async function getChatAttachment(user: { id: string; role: "admin" | "client" }, messageId: string) {
  await ensureProjectsDatabase()
  const result = await getPool().query<{ project_id: string; task_id: string | null; attachment_name: string | null; attachment_type: string | null; attachment_data: Buffer | null }>(
    `SELECT project_id, task_id, attachment_name, attachment_type, attachment_data
     FROM project_chat_messages WHERE id = $1`,
    [messageId],
  )
  const message = result.rows[0]
  if (!message?.attachment_data) throw new Error("ATTACHMENT_NOT_FOUND")
  await resolveConversation(user, message.task_id ? "task" : "project", message.task_id ?? message.project_id)
  return message
}
