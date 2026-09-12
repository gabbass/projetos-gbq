import { Pool } from "pg"

import { hashPassword } from "@/lib/auth/password"

export type AuthUser = {
  id: string
  name: string
  email: string
  phone: string
  password_hash: string
  must_change_password: boolean
  terms_accepted_at: Date | null
  terms_version: string | null
  security_policy_accepted_at: Date | null
  security_policy_version: string | null
  onboarding_completed_at: Date | null
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
      phone text NOT NULL DEFAULT '',
      password_hash text NOT NULL,
      must_change_password boolean NOT NULL DEFAULT true,
      terms_accepted_at timestamptz,
      terms_version text,
      security_policy_accepted_at timestamptz,
      security_policy_version text,
      onboarding_completed_at timestamptz DEFAULT now(),
      role text NOT NULL DEFAULT 'admin',
      area text NOT NULL DEFAULT '',
      theme text NOT NULL DEFAULT 'light',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  await pool.query(`
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS area text NOT NULL DEFAULT '';
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'light';
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS terms_version text;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS security_policy_accepted_at timestamptz;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS security_policy_version text;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz DEFAULT now();
    UPDATE app_users SET onboarding_completed_at = NULL WHERE must_change_password = true;
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
    `INSERT INTO app_users (name, email, password_hash, must_change_password, onboarding_completed_at, role, area)
     VALUES ('Administrador', $1, $2, true, NULL, 'admin', 'Administração')
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
    `SELECT id, name, email, phone, password_hash, must_change_password, terms_accepted_at, terms_version,
            security_policy_accepted_at, security_policy_version, onboarding_completed_at,
            role, area, theme, created_at, updated_at
     FROM app_users WHERE lower(email) = lower($1) LIMIT 1`,
    [email],
  )

  return result.rows[0] ?? null
}

export async function findUserById(userId: string) {
  await ensureAuthDatabase()
  const result = await getPool().query<AuthUser>(
    `SELECT id, name, email, phone, password_hash, must_change_password, terms_accepted_at, terms_version,
            security_policy_accepted_at, security_policy_version, onboarding_completed_at,
            role, area, theme, created_at, updated_at
     FROM app_users WHERE id = $1 LIMIT 1`,
    [userId],
  )

  return result.rows[0] ?? null
}

export async function listUsers() {
  await ensureAuthDatabase()
  const result = await getPool().query<Omit<AuthUser, "password_hash">>(
    `SELECT id, name, email, phone, must_change_password, terms_accepted_at, terms_version,
            security_policy_accepted_at, security_policy_version, onboarding_completed_at,
            role, area, theme, created_at, updated_at
     FROM app_users
     ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, lower(name), lower(email)`,
  )
  return result.rows
}

export async function createUser(input: {
  name: string
  email: string
  phone: string
  passwordHash: string
  role: UserRole
  area: string
}) {
  await ensureAuthDatabase()
  await getPool().query(
    `INSERT INTO app_users (name, email, phone, password_hash, must_change_password, onboarding_completed_at, role, area)
     VALUES ($1, $2, $3, $4, true, NULL, $5, $6)`,
    [input.name, input.email, input.phone, input.passwordHash, input.role, input.area],
  )
}

export async function updateUser(userId: string, input: {
  name: string
  email: string
  phone: string
  accessKeyHash: string
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
    if (current.rows[0].role !== input.role) {
      const projectLinksReady = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = 'projects'
           AND column_name IN ('client_user_id', 'responsible_user_id')`,
      )
      if (Number(projectLinksReady.rows[0]?.count ?? 0) === 2) {
        const linkedProject = await client.query(
          input.role === "client"
            ? `SELECT 1 FROM projects WHERE responsible_user_id = $1 LIMIT 1`
            : `SELECT 1 FROM projects WHERE client_user_id = $1 LIMIT 1`,
          [userId],
        )
        if (linkedProject.rowCount) throw new Error("ROLE_IN_USE")
      }
    }
    await client.query(
      `UPDATE app_users SET name = $1, email = $2, phone = $3,
         password_hash = CASE WHEN must_change_password THEN $4 ELSE password_hash END,
         role = $5, area = $6, updated_at = now()
       WHERE id = $7`,
      [input.name, input.email, input.phone, input.accessKeyHash, input.role, input.area, userId],
    )
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export async function updateOwnProfile(userId: string, input: { name: string; email: string; phone: string }) {
  await ensureAuthDatabase()
  const result = await getPool().query(
    `UPDATE app_users SET name = $1, email = $2, phone = $3, updated_at = now() WHERE id = $4`,
    [input.name, input.email, input.phone, userId],
  )
  if (result.rowCount !== 1) throw new Error("USER_NOT_FOUND")
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
    const projectLinksReady = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'projects'
         AND column_name IN ('client_user_id', 'responsible_user_id')`,
    )
    if (Number(projectLinksReady.rows[0]?.count ?? 0) === 2) {
      const linkedProject = await client.query(
        `SELECT 1 FROM projects WHERE client_user_id = $1 OR responsible_user_id = $1 LIMIT 1`,
        [userId],
      )
      if (linkedProject.rowCount) throw new Error("USER_IN_PROJECT")
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

export async function completeFirstAccess(userId: string, passwordHash: string, legalVersion: string) {
  await ensureAuthDatabase()
  const result = await getPool().query(
    `UPDATE app_users
     SET password_hash = $1,
         must_change_password = false,
         terms_accepted_at = now(),
         terms_version = $2,
         security_policy_accepted_at = now(),
         security_policy_version = $2,
         updated_at = now()
     WHERE id = $3 AND must_change_password = true`,
    [passwordHash, legalVersion, userId],
  )
  if (result.rowCount !== 1) throw new Error("FIRST_ACCESS_ALREADY_COMPLETE")
}

export async function completeOnboarding(userId: string) {
  await ensureAuthDatabase()
  const result = await getPool().query(
    `UPDATE app_users
     SET onboarding_completed_at = COALESCE(onboarding_completed_at, now()), updated_at = now()
     WHERE id = $1 AND must_change_password = false`,
    [userId],
  )
  if (result.rowCount !== 1) throw new Error("ONBOARDING_NOT_AVAILABLE")
}
