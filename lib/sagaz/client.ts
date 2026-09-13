import { SagazApiError } from "./errors.ts"

const DEFAULT_TIMEOUT_MS = 10_000

export async function sagazFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.SAGAZ_API_URL?.trim().replace(/\/$/, "")
  const token = process.env.SAGAZ_SERVICE_TOKEN?.trim()
  if (!baseUrl || !token) throw new SagazApiError("SAGAZ_NOT_CONFIGURED", 503)
  if (!path.startsWith("/")) throw new SagazApiError("INVALID_PATH", 500)

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
    const code = error instanceof Error && error.name === "TimeoutError" ? "SAGAZ_TIMEOUT" : "SAGAZ_NETWORK_ERROR"
    throw new SagazApiError(code, 503)
  }

  const text = await response.text()
  let body: unknown = null
  if (text) {
    try { body = JSON.parse(text) } catch { throw new SagazApiError("SAGAZ_INVALID_JSON", 502) }
  }
  if (!response.ok) {
    const remoteCode = isRecord(body) && isRecord(body.error) && typeof body.error.code === "string" ? body.error.code : "SAGAZ_API_ERROR"
    throw new SagazApiError(remoteCode, response.status)
  }
  return body as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
