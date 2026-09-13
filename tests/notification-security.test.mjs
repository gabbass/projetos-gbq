import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const repository = await readFile(new URL("../lib/notifications/repository.ts", import.meta.url), "utf8")

test("listagem, contador e paginação permanecem vinculados ao usuário da sessão", () => {
  assert.match(repository, /WHERE user_id = \$1 AND \(\$2::timestamptz IS NULL/)
  assert.match(repository, /WHERE user_id = \$1 AND read_at IS NULL/)
  assert.match(repository, /\(created_at, id\) < \(\$2::timestamptz, \$3::uuid\)/)
})

test("marcar uma notificação não permite atingir outro usuário", () => {
  assert.match(repository, /WHERE id = \$1 AND user_id = \$2/)
})

test("marcar todas como lidas limita a atualização ao usuário atual", () => {
  assert.match(repository, /WHERE user_id = \$1 AND read_at IS NULL/)
})

test("eventos e notificações por destinatário são idempotentes", () => {
  assert.match(repository, /external_event_id text NOT NULL UNIQUE/)
  assert.match(repository, /notifications_event_user_unique_idx/)
  assert.match(repository, /ON CONFLICT \(external_event_id, user_id\)/)
})

test("links persistidos são limitados a caminhos internos", () => {
  assert.match(repository, /notifications_internal_href CHECK \(href IS NULL OR href LIKE '\/%'\)/)
  assert.match(repository, /!href\.startsWith\("\/\/"\)/)
})
