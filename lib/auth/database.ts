import { Pool } from "pg"

import { hashPassword } from "@/lib/auth/password"

export type AuthUser = {
  id: string
  name: string
  email: string
  password_hash: string
  must_change_password: boolean
  role: UserRole
  area: string
  theme: "light" | "dark"
  created_at: Date
  updated_at: Date
}

export type UserRole = "admin" | "client"

export type WorkspaceSettings = {
  site_name: string
  site_subtitle: string
  logo_type: string | null
  favicon_type: string | null
  updated_at: Date
}

const globalForDb = globalThis as unknown as { gbqAuthPool?: Pool; gbqAuthReady?: Promise<void> }

function getPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL não configurada")

  globalForDb.gbqAuthPool ??= new Pool({
    connectionString,
    application_name: "gbq-auth",
    max: 5,
    connectionTimeoutMillis: 5_000,
  })

  return globalForDb.gbqAuthPool
}

async function initializeAuth() {
  const pool = getPool()

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL DEFAULT '',
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      must_change_password boolean NOT NULL DEFAULT true,
      role text NOT NULL DEFAULT 'admin',
      area text NOT NULL DEFAULT '',
      theme text NOT NULL DEFAULT 'light',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  await pool.query(`
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS area text NOT NULL DEFAULT '';
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'light';
    UPDATE app_users SET theme = 'light' WHERE theme NOT IN ('light', 'dark');
    UPDATE app_users SET role = 'client' WHERE role NOT IN ('admin', 'client');
    UPDATE app_users SET name = 'Administrador' WHERE name = '' AND lower(email) = 'admin@gmail.com';
    UPDATE app_users SET area = 'Administração' WHERE area = '' AND lower(email) = 'admin@gmail.com';
  `)

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_users_role_check') THEN
        ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN ('admin', 'client'));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_users_theme_check') THEN
        ALTER TABLE app_users ADD CONSTRAINT app_users_theme_check CHECK (theme IN ('light', 'dark'));
      END IF;
    END $$;
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspace_settings (
      id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      theme text NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
      site_name text NOT NULL DEFAULT 'GBQ Projetos',
      site_subtitle text NOT NULL DEFAULT 'Gestão à vista',
      logo_data bytea,
      logo_type text,
      favicon_data bytea,
      favicon_type text,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  await pool.query(`
    ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS site_name text NOT NULL DEFAULT 'GBQ Projetos';
    ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS site_subtitle text NOT NULL DEFAULT 'Gestão à vista';
  `)

  await pool.query(`INSERT INTO workspace_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`)

  const initialPasswordHash = await hashPassword("12345678")
  await pool.query(
    `INSERT INTO app_users (name, email, password_hash, must_change_password, role, area)
     VALUES ('Administrador', $1, $2, true, 'admin', 'Administração')
     ON CONFLICT (email) DO NOTHING`,
    ["admin@gmail.com", initialPasswordHash],
  )
}

export async function ensureAuthDatabase() {
  globalForDb.gbqAuthReady ??= initializeAuth().catch((error) => {
    globalForDb.gbqAuthReady = undefined
    throw error
  })

  await globalForDb.gbqAuthReady
}

export async function findUserByEmail(email: string) {
  await ensureAuthDatabase()
  const result = await getPool().query<AuthUser>(
    `SELECT id, name, email, password_hash, must_change_password, role, area, theme, created_at, updated_at
     FROM app_users WHERE lower(email) = lower($1) LIMIT 1`,
    [email],
  )

  return result.rows[0] ?? null
}

export async function findUserById(userId: string) {
  await ensureAuthDatabase()
  const result = await getPool().query<AuthUser>(
    `SELECT id, name, email, password_hash, must_change_password, role, area, theme, created_at, updated_at
     FROM app_users WHERE id = $1 LIMIT 1`,
    [userId],
  )

  return result.rows[0] ?? null
}

export async function listUsers() {
  await ensureAuthDatabase()
  const result = await getPool().query<Omit<AuthUser, "password_hash">>(
    `SELECT id, name, email, must_change_password, role, area, theme, created_at, updated_at
     FROM app_users
     ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, lower(name), lower(email)`,
  )
  return result.rows
}

export async function createUser(input: {
  name: string
  email: string
  passwordHash: string
  role: UserRole
  area: string
}) {
  await ensureAuthDatabase()
  await getPool().query(
    `INSERT INTO app_users (name, email, password_hash, must_change_password, role, area)
     VALUES ($1, $2, $3, true, $4, $5)`,
    [input.name, input.email, input.passwordHash, input.role, input.area],
  )
}

export async function updateUser(userId: string, input: {
  name: string
  email: string
  role: UserRole
  area: string
}) {
  await ensureAuthDatabase()
  const client = await getPool().connect()
  try {
    await client.query("BEGIN")
    await client.query("LOCK TABLE app_users IN SHARE ROW EXCLUSIVE MODE")
    const current = await client.query<{ role: UserRole }>(
      `SELECT role FROM app_users WHERE id = $1 FOR UPDATE`,
      [userId],
    )
    if (!current.rows[0]) throw new Error("USER_NOT_FOUND")
    if (current.rows[0].role === "admin" && input.role !== "admin") {
      const admins = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM app_users WHERE role = 'admin'`,
      )
      if (Number(admins.rows[0]?.count ?? 0) <= 1) throw new Error("LAST_ADMIN")
    }
    await client.query(
      `UPDATE app_users SET name = $1, email = $2, role = $3, area = $4, updated_at = now()
       WHERE id = $5`,
      [input.name, input.email, input.role, input.area, userId],
    )
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export async function deleteUser(userId: string) {
  await ensureAuthDatabase()
  const client = await getPool().connect()
  try {
    await client.query("BEGIN")
    await client.query("LOCK TABLE app_users IN SHARE ROW EXCLUSIVE MODE")
    const current = await client.query<{ role: UserRole }>(
      `SELECT role FROM app_users WHERE id = $1 FOR UPDATE`,
      [userId],
    )
    if (!current.rows[0]) throw new Error("USER_NOT_FOUND")
    if (current.rows[0].role === "admin") {
      const admins = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM app_users WHERE role = 'admin'`,
      )
      if (Number(admins.rows[0]?.count ?? 0) <= 1) throw new Error("LAST_ADMIN")
    }
    await client.query(`DELETE FROM app_users WHERE id = $1`, [userId])
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export async function getWorkspaceSettings(): Promise<WorkspaceSettings> {
  await ensureAuthDatabase()
  const result = await getPool().query<WorkspaceSettings>(
    `SELECT site_name, site_subtitle, logo_type, favicon_type, updated_at FROM workspace_settings WHERE id = 1`,
  )
  return result.rows[0] ?? { site_name: "GBQ Projetos", site_subtitle: "Gestão à vista", logo_type: null, favicon_type: null, updated_at: new Date(0) }
}

export async function updateWorkspaceSettings(input: {
  siteName: string
  siteSubtitle: string
  logo?: { data: Buffer; type: string } | null
  favicon?: { data: Buffer; type: string } | null
}) {
  await ensureAuthDatabase()
  const updates = ["site_name = $1", "site_subtitle = $2", "updated_at = now()"]
  const values: unknown[] = [input.siteName, input.siteSubtitle]

  if (input.logo !== undefined) {
    values.push(input.logo?.data ?? null, input.logo?.type ?? null)
    updates.push(`logo_data = $${values.length - 1}`, `logo_type = $${values.length}`)
  }
  if (input.favicon !== undefined) {
    values.push(input.favicon?.data ?? null, input.favicon?.type ?? null)
    updates.push(`favicon_data = $${values.length - 1}`, `favicon_type = $${values.length}`)
  }

  await getPool().query(`UPDATE workspace_settings SET ${updates.join(", ")} WHERE id = 1`, values)
}

export async function updateUserTheme(userId: string, theme: "light" | "dark") {
  await ensureAuthDatabase()
  await getPool().query(
    `UPDATE app_users SET theme = $1, updated_at = now() WHERE id = $2`,
    [theme, userId],
  )
}

export async function getBrandingAsset(asset: "logo" | "favicon") {
  await ensureAuthDatabase()
  const dataColumn = asset === "logo" ? "logo_data" : "favicon_data"
  const typeColumn = asset === "logo" ? "logo_type" : "favicon_type"
  const result = await getPool().query<{ data: Buffer | null; type: string | null; updated_at: Date }>(
    `SELECT ${dataColumn} AS data, ${typeColumn} AS type, updated_at FROM workspace_settings WHERE id = 1`,
  )
  return result.rows[0] ?? null
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  await ensureAuthDatabase()
  await getPool().query(
    `UPDATE app_users
     SET password_hash = $1, must_change_password = false, updated_at = now()
     WHERE id = $2`,
    [passwordHash, userId],
  )
}
