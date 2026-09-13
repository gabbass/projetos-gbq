import { sagazFetch } from "@/lib/sagaz/client"
import type { SagazConversation, SagazMessage, SagazPage, SagazSendResult, SagazTemplate, SagazWhatsappStatus } from "@/lib/sagaz/types"

const API = "/api/integrations/v1/whatsapp"

function pageQuery(input: { limit?: number; cursor?: string } = {}) {
  const query = new URLSearchParams({ limit: String(Math.min(100, Math.max(1, input.limit ?? 50))) })
  if (input.cursor) query.set("cursor", input.cursor)
  return query.toString()
}

export function getWhatsappStatus() {
  return sagazFetch<SagazWhatsappStatus>(`${API}/status`)
}

export function getWhatsappConversations(input?: { limit?: number; cursor?: string }) {
  return sagazFetch<SagazPage<SagazConversation>>(`${API}/conversations?${pageQuery(input)}`)
}

export function getWhatsappMessages(contactWaId: string, input?: { limit?: number; cursor?: string }) {
  return sagazFetch<SagazPage<SagazMessage>>(`${API}/conversations/${encodeURIComponent(contactWaId)}/messages?${pageQuery(input)}`)
}

export function getWhatsappTemplates(cursor?: string) {
  return sagazFetch<SagazPage<SagazTemplate>>(`${API}/templates${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`)
}

export function sendWhatsappText(input: { to: string; text: string }) {
  return sagazFetch<SagazSendResult>(`${API}/messages/text`, jsonPost(input))
}

export function sendWhatsappTemplate(input: { to: string; templateName: string; language?: string }) {
  return sagazFetch<SagazSendResult>(`${API}/messages/template`, jsonPost(input))
}

export function sendWhatsappMedia(input: { to: string; file: File; caption?: string }) {
  const form = new FormData()
  form.set("to", input.to)
  form.set("file", input.file)
  if (input.caption) form.set("caption", input.caption)
  return sagazFetch<SagazSendResult>(`${API}/messages/media`, { method: "POST", body: form })
}

function jsonPost(body: unknown): RequestInit {
  return { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
}
