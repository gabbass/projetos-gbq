import { createHmac, timingSafeEqual } from "node:crypto"

export const SESSION_COOKIE = "gbq_session"
export const SESSION_MAX_AGE = 60 * 60 * 8

export type SessionPayload = {
  userId: string
  email: string
  mustChangePassword: boolean
  onboardingCompleted: boolean
  expiresAt: number
}

function getSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.DATABASE_URL

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET não configurado")
  }

  return secret ?? "gbq-local-development-secret"
}

function signature(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url")
}

export function createSessionToken(payload: Omit<SessionPayload, "expiresAt">) {
  const data = Buffer.from(JSON.stringify({
    ...payload,
    expiresAt: Date.now() + SESSION_MAX_AGE * 1000,
  })).toString("base64url")

  return `${data}.${signature(data)}`
}

export function verifySessionToken(token?: string): SessionPayload | null {
  if (!token) return null

  const [data, receivedSignature] = token.split(".")
  if (!data || !receivedSignature) return null

  const expectedSignature = signature(data)
  const received = Buffer.from(receivedSignature)
  const expected = Buffer.from(expectedSignature)

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload
    return payload.expiresAt > Date.now() ? payload : null
  } catch {
    return null
  }
}
