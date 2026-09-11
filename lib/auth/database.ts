import { Pool } from "pg"

import { hashPassword } from "@/lib/auth/password"

export type AuthUser = {
  id: string
  email: string
  password_hash: string
  must_change_password: boolean
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
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      must_change_password boolean NOT NULL DEFAULT true,
      role text NOT NULL DEFAULT 'admin',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  const initialPasswordHash = await hashPassword("12345678")
  await pool.query(
    `INSERT INTO app_users (email, password_hash, must_change_password, role)
     VALUES ($1, $2, true, 'admin')
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
    `SELECT id, email, password_hash, must_change_password
     FROM app_users WHERE lower(email) = lower($1) LIMIT 1`,
    [email],
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
