import { Pool } from "pg"

export type ProjectPriority = "high" | "medium" | "low"
export type TaskStatus = "todo" | "in_progress" | "waiting" | "done"

export type Project = {
  id: string
  name: string
  area: string
  owner: string
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
  project_id: string
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

const globalForProjects = globalThis as unknown as {
  gbqProjectsPool?: Pool
  gbqProjectsReady?: Promise<void>
}

function getPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL não configurada")

  globalForProjects.gbqProjectsPool ??= new Pool({
    connectionString,
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
      priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
      deadline date,
      objective text NOT NULL DEFAULT '',
      created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
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

  await pool.query(`CREATE INDEX IF NOT EXISTS project_tasks_project_status_idx ON project_tasks (project_id, status, position, created_at)`)
}

async function ensureProjectsDatabase() {
  globalForProjects.gbqProjectsReady ??= initializeProjects().catch((error) => {
    globalForProjects.gbqProjectsReady = undefined
    throw error
  })
  await globalForProjects.gbqProjectsReady
}

export async function listProjects(): Promise<Project[]> {
  await ensureProjectsDatabase()
  const result = await getPool().query<Project>(`
    SELECT p.id, p.name, p.area, p.owner, p.priority,
      p.deadline::text AS deadline, p.objective, p.created_at, p.updated_at,
      count(t.id)::int AS task_count,
      count(t.id) FILTER (WHERE t.status = 'done')::int AS completed_count,
      CASE WHEN count(t.id) = 0 THEN 0
        ELSE round(100.0 * count(t.id) FILTER (WHERE t.status = 'done') / count(t.id))::int
      END AS progress
    FROM projects p
    LEFT JOIN project_tasks t ON t.project_id = p.id
    GROUP BY p.id
    ORDER BY p.updated_at DESC, lower(p.name)
  `)
  return result.rows
}

export async function listTasks(): Promise<ProjectTask[]> {
  await ensureProjectsDatabase()
  const result = await getPool().query<ProjectTask>(`
    SELECT id, project_id, title, description, owner, priority, due_date::text AS due_date,
      status, position, created_at, updated_at
    FROM project_tasks
    ORDER BY position, created_at
  `)
  return result.rows
}

export async function createProject(input: {
  name: string
  area: string
  owner: string
  priority: ProjectPriority
  deadline: string | null
  objective: string
  createdBy: string
}) {
  await ensureProjectsDatabase()
  await getPool().query(
    `INSERT INTO projects (name, area, owner, priority, deadline, objective, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [input.name, input.area, input.owner, input.priority, input.deadline, input.objective, input.createdBy],
  )
}

export async function updateProject(projectId: string, input: Omit<Parameters<typeof createProject>[0], "createdBy">) {
  await ensureProjectsDatabase()
  const result = await getPool().query(
    `UPDATE projects SET name = $1, area = $2, owner = $3, priority = $4, deadline = $5,
      objective = $6, updated_at = now() WHERE id = $7`,
    [input.name, input.area, input.owner, input.priority, input.deadline, input.objective, projectId],
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
  await getPool().query(
    `INSERT INTO project_tasks (project_id, title, description, owner, priority, due_date, status, position, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7,
       COALESCE((SELECT max(position) + 1 FROM project_tasks WHERE project_id = $1 AND status = $7), 0), $8)`,
    [input.projectId, input.title, input.description, input.owner, input.priority, input.dueDate, input.status, input.createdBy],
  )
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
