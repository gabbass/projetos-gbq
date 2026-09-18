import { app3Fetch } from "@/lib/app3/client"
import type { App3Conversation, App3Message, App3Page, App3SendResult, App3Template, App3TemplateProvisionResult, App3WhatsappStatus } from "@/lib/app3/types"

const API = "/api/integrations/v1/whatsapp"

function pageQuery(input: { limit?: number; cursor?: string } = {}) {
  const query = new URLSearchParams({ limit: String(Math.min(100, Math.max(1, input.limit ?? 50))) })
  if (input.cursor) query.set("cursor", input.cursor)
  return query.toString()
}

export function getWhatsappStatus() {
  return app3Fetch<App3WhatsappStatus>(`${API}/status`)
}

export function getWhatsappConversations(input?: { limit?: number; cursor?: string }) {
  return app3Fetch<App3Page<App3Conversation>>(`${API}/conversations?${pageQuery(input)}`)
}

export function getWhatsappMessages(contactWaId: string, input?: { limit?: number; cursor?: string }) {
  return app3Fetch<App3Page<App3Message>>(`${API}/conversations/${encodeURIComponent(contactWaId)}/messages?${pageQuery(input)}`)
}

export function getWhatsappTemplates(cursor?: string) {
  return app3Fetch<App3Page<App3Template>>(`${API}/templates${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`)
}

export function sendWhatsappText(input: { to: string; text: string }) {
  return app3Fetch<App3SendResult>(`${API}/messages/text`, jsonPost(input))
}

export function sendWhatsappTemplate(input: { to: string; templateName: string; language?: string; parameters?: string[] }) {
  return app3Fetch<App3SendResult>(`${API}/messages/template`, jsonPost(input))
}

export function provisionGbqTemplates() {
  return app3Fetch<App3TemplateProvisionResult>(`${API}/templates/gbq`, jsonPost({}))
}

export function sendWhatsappMedia(input: { to: string; file: File; caption?: string }) {
  const form = new FormData()
  form.set("to", input.to)
  form.set("file", input.file)
  if (input.caption) form.set("caption", input.caption)
  return app3Fetch<App3SendResult>(`${API}/messages/media`, { method: "POST", body: form })
}

function jsonPost(body: unknown): RequestInit {
  return { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
}
