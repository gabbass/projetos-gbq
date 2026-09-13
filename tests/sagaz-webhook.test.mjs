import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import test from "node:test"

import { parseSagazWebhook, verifySagazWebhook } from "../lib/sagaz/webhook.ts"

const now = 1_800_000_000_000
const secret = "segredo-de-teste"
const event = { id: "evt_1", event: "whatsapp.message.received", createdAt: now, data: { contactWaId: "5511999999999", messageId: "wamid.1", type: "text", text: "Olá" } }
const rawBody = JSON.stringify(event)
const signature = `sha256=${createHmac("sha256", secret).update(`${now}.${rawBody}`).digest("hex")}`

test("aceita assinatura válida e schema de mensagem recebida", () => {
  assert.equal(verifySagazWebhook({ rawBody, timestamp: String(now), signature, secret, now }), true)
  assert.deepEqual(parseSagazWebhook(rawBody), { kind: "known", event })
})

test("rejeita assinatura inválida ou timestamp expirado", () => {
  assert.equal(verifySagazWebhook({ rawBody, timestamp: String(now), signature: `${signature}0`, secret, now }), false)
  assert.equal(verifySagazWebhook({ rawBody, timestamp: String(now - 600_000), signature, secret, now }), false)
})

test("valida evento de status e ignora evento futuro com segurança", () => {
  const status = { id: "evt_2", event: "whatsapp.message.status", createdAt: now, data: { contactWaId: "5511", messageId: "wamid.2", status: "delivered" } }
  assert.deepEqual(parseSagazWebhook(JSON.stringify(status)), { kind: "known", event: status })
  assert.deepEqual(parseSagazWebhook(JSON.stringify({ ...status, event: "whatsapp.future" })), { kind: "unknown", id: "evt_2", event: "whatsapp.future" })
})

test("rejeita JSON e payloads conhecidos malformados", () => {
  assert.equal(parseSagazWebhook("{"), null)
  assert.equal(parseSagazWebhook(JSON.stringify({ ...event, data: {} })), null)
})

