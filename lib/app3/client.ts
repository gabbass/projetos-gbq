import { App3ApiError } from "./errors.ts"

const DEFAULT_TIMEOUT_MS = 10_000

export async function app3Fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.APP3_API_URL?.trim().replace(/\/$/, "")
  const token = process.env.APP3_SERVICE_TOKEN?.trim()
  if (!baseUrl || !token) throw new App3ApiError("APP3_NOT_CONFIGURED", 503)
  if (!path.startsWith("/")) throw new App3ApiError("INVALID_PATH", 500)

  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      cache: "no-store",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        ...options.headers,
      },
      signal: options.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    })
  } catch (error) {
    const code = error instanceof Error && error.name === "TimeoutError" ? "APP3_TIMEOUT" : "APP3_NETWORK_ERROR"
    throw new App3ApiError(code, 503)
  }

  const text = await response.text()
  let body: unknown = null
  if (text) {
    try { body = JSON.parse(text) } catch { throw new App3ApiError("APP3_INVALID_JSON", 502) }
  }
  if (!response.ok) {
    const remoteCode = isRecord(body) && isRecord(body.error) && typeof body.error.code === "string" ? body.error.code : "APP3_API_ERROR"
    const remoteMessage = isRecord(body) && isRecord(body.error) && typeof body.error.message === "string"
      ? sanitizeRemoteMessage(body.error.message)
      : undefined
    throw new App3ApiError(remoteCode, response.status, remoteMessage)
  }
  return body as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function sanitizeRemoteMessage(value: string) {
  const message = value.trim().slice(0, 500)
  if (!message) return undefined
  return message
    .replace(/\bBearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/\bapp3_(?:live|test)_[A-Za-z0-9_-]+\b/g, "[REDACTED]")
    .replace(/\b\d{12,15}\b/g, "[REDACTED]")
}
