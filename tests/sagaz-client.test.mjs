import assert from "node:assert/strict"
import test from "node:test"

import { sagazFetch } from "../lib/sagaz/client.ts"
import { SagazApiError } from "../lib/sagaz/errors.ts"

process.env.SAGAZ_API_URL = "https://sagaz.test"
process.env.SAGAZ_SERVICE_TOKEN = "sgz_live_testtoken123456"

async function rejectsWith(code, status, action) {
  await assert.rejects(action, (error) => error instanceof SagazApiError && error.code === code && error.status === status)
}

test("interpreta resposta 200 e envia Bearer sem expor token no resultado", async () => {
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.authorization, `Bearer ${process.env.SAGAZ_SERVICE_TOKEN}`)
    return new Response(JSON.stringify({ connected: true }), { status: 200 })
  }
  assert.deepEqual(await sagazFetch("/status"), { connected: true })
})

for (const status of [401, 403, 429, 500]) {
  test(`padroniza erro HTTP ${status}`, async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: `REMOTE_${status}` } }), { status })
    await rejectsWith(`REMOTE_${status}`, status, () => sagazFetch("/status"))
  })
}

test("trata JSON inválido", async () => {
  globalThis.fetch = async () => new Response("não-json", { status: 200 })
  await rejectsWith("SAGAZ_INVALID_JSON", 502, () => sagazFetch("/status"))
})

test("trata timeout/rede sem vazar detalhe técnico", async () => {
  globalThis.fetch = async () => { throw new DOMException("aborted", "TimeoutError") }
  await rejectsWith("SAGAZ_TIMEOUT", 503, () => sagazFetch("/status"))
})
