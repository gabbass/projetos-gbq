import { createHmac, timingSafeEqual } from "node:crypto"

import type { SagazWebhookEvent } from "./types.ts"

export const SAGAZ_WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000

export function verifySagazWebhook(input: { rawBody: string; timestamp: string | null; signature: string | null; secret: string; now?: number }) {
  const timestamp = Number(input.timestamp)
  const now = input.now ?? Date.now()
  if (!input.signature || !Number.isFinite(timestamp) || Math.abs(now - timestamp) > SAGAZ_WEBHOOK_TOLERANCE_MS) return false
  const expected = Buffer.from(`sha256=${createHmac("sha256", input.secret).update(`${timestamp}.${input.rawBody}`).digest("hex")}`)
  const actual = Buffer.from(input.signature)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function parseSagazWebhook(rawBody: string): { kind: "known"; event: SagazWebhookEvent } | { kind: "unknown"; id: string; event: string } | null {
  let value: unknown
  try { value = JSON.parse(rawBody) } catch { return null }
  if (!isRecord(value) || typeof value.id !== "string" || !value.id || typeof value.event !== "string" || typeof value.createdAt !== "number" || !isRecord(value.data)) return null
  if (value.event !== "whatsapp.message.received" && value.event !== "whatsapp.message.status") return { kind: "unknown", id: value.id, event: value.event }
  const data = value.data
  if (typeof data.contactWaId !== "string" || !data.contactWaId || typeof data.messageId !== "string" || !data.messageId) return null
  if (value.event === "whatsapp.message.received") {
    if (typeof data.type !== "string" || (data.text !== null && typeof data.text !== "string")) return null
  } else if (typeof data.status !== "string") return null
  return { kind: "known", event: value as SagazWebhookEvent }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
