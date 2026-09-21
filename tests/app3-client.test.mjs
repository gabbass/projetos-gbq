import assert from "node:assert/strict"
import test from "node:test"

import { app3Fetch } from "../lib/app3/client.ts"
import { App3ApiError } from "../lib/app3/errors.ts"

process.env.APP3_API_URL = "https://app3.test"
process.env.APP3_SERVICE_TOKEN = "app3_live_testtoken123456"

async function rejectsWith(code, status, action) {
  await assert.rejects(action, (error) => error instanceof App3ApiError && error.code === code && error.status === status)
}

test("interpreta resposta 200 e envia Bearer sem expor token no resultado", async () => {
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.authorization, `Bearer ${process.env.APP3_SERVICE_TOKEN}`)
    return new Response(JSON.stringify({ connected: true }), { status: 200 })
  }
  assert.deepEqual(await app3Fetch("/status"), { connected: true })
})

for (const status of [401, 403, 429, 500]) {
  test(`padroniza erro HTTP ${status}`, async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: `REMOTE_${status}` } }), { status })
    await rejectsWith(`REMOTE_${status}`, status, () => app3Fetch("/status"))
  })
}

test("trata JSON inválido", async () => {
  globalThis.fetch = async () => new Response("não-json", { status: 200 })
  await rejectsWith("APP3_INVALID_JSON", 502, () => app3Fetch("/status"))
})

test("trata timeout/rede sem vazar detalhe técnico", async () => {
  globalThis.fetch = async () => { throw new DOMException("aborted", "TimeoutError") }
  await rejectsWith("APP3_TIMEOUT", 503, () => app3Fetch("/status"))
})

test("preserva mensagem remota sanitizada", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: {
      code: "TEMPLATE_NOT_FOUND",
      message: "Modelo ausente para 5511999999999 com app3_live_segredo123",
    },
  }), { status: 404 })
  await assert.rejects(
    () => app3Fetch("/status"),
    (error) => error instanceof App3ApiError
      && error.message === "Modelo ausente para [REDACTED] com [REDACTED]"
      && !error.message.includes("5511999999999")
      && !error.message.includes("app3_live_segredo123"),
  )
})
