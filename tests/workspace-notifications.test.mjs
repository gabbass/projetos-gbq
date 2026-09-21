import assert from "node:assert/strict"
import test from "node:test"

import {
  projectChangedEvent,
  normalizeWhatsappPhone,
  taskChangedEvent,
  taskCreatedEvent,
  taskMessageEvent,
} from "../lib/notifications/workspace-event-builders.ts"
import { deliverWorkspaceNotificationWith, workspaceNotificationErrorDetails } from "../lib/notifications/workspace-delivery.ts"
import { App3ApiError } from "../lib/app3/errors.ts"

const client = { id: "client-1", name: "Cliente", phone: "+55 (11) 99999-9999" }
const responsible = { id: "admin-2", name: "Responsável", phone: "+55 (11) 98888-8888" }

function project(overrides = {}) {
  return {
    projectId: "project-1",
    projectCode: "A3CDEF",
    projectName: "Implantação GBQ",
    area: "Operações",
    projectPriority: "medium",
    deadline: "2026-10-01",
    objective: "Implantar o sistema",
    client,
    responsible,
    ...overrides,
  }
}

function taskContext(overrides = {}) {
  return {
    ...project(),
    taskId: "task-1",
    taskCode: "T3CDEF",
    parentTaskId: null,
    taskTitle: "Configurar domínio",
    description: "Configurar o DNS",
    owner: "Responsável",
    taskPriority: "medium",
    dueDate: "2026-09-30",
    status: "in_progress",
    ...overrides,
  }
}

test("criação identifica projeto, código e título da tarefa", () => {
  const event = taskCreatedEvent(taskContext(), "admin-1")
  assert.equal(event?.recipient.id, client.id)
  assert.match(event?.title ?? "", /Implantação GBQ/)
  assert.match(event?.body ?? "", /#T3CDEF — Configurar domínio/)
  assert.equal(event?.templateName, "gbq_tarefa_criada_v2")
  assert.deepEqual(event?.templateParameters, ["Implantação GBQ", "T3CDEF", "Configurar domínio", "Em andamento"])
  assert.equal(event?.templateParameters.length, 4)
})

test("mudança de status informa estado anterior e novo sem duplicar evento de edição", () => {
  const event = taskChangedEvent({ before: taskContext(), current: taskContext({ status: "done" }), actorId: "admin-1" })
  assert.equal(event?.kind, "task_status_changed")
  assert.match(event?.body ?? "", /Em andamento → Concluído/)
  assert.equal(event?.templateName, "gbq_status_tarefa_v2")
  assert.deepEqual(event?.templateParameters, ["Implantação GBQ", "T3CDEF", "Configurar domínio", "Em andamento", "Concluído"])
  assert.equal(event?.templateParameters.length, 5)
})

test("edição lista somente campos realmente alterados e ignora ausência de mudanças", () => {
  assert.equal(taskChangedEvent({ before: taskContext(), current: taskContext(), actorId: "admin-1" }), null)
  const event = taskChangedEvent({ before: taskContext(), current: taskContext({ owner: "Nova pessoa", dueDate: null }), actorId: "admin-1" })
  assert.equal(event?.kind, "task_updated")
  assert.match(event?.body ?? "", /responsável, prazo/)
  assert.equal(event?.templateName, "gbq_tarefa_atualizada_v2")
  assert.deepEqual(event?.templateParameters, ["Implantação GBQ", "T3CDEF", "Configurar domínio", "responsável, prazo"])
  assert.equal(event?.templateParameters.length, 4)
})

test("alteração de projeto informa os campos modificados", () => {
  const event = projectChangedEvent({ before: project(), current: project({ projectPriority: "high", objective: "Novo objetivo" }), actorId: "admin-1" })
  assert.equal(event?.kind, "project_updated")
  assert.match(event?.body ?? "", /prioridade, objetivo/)
  assert.equal(event?.templateName, "gbq_projeto_atualizado_v2")
  assert.deepEqual(event?.templateParameters, ["A3CDEF", "Implantação GBQ", "prioridade, objetivo"])
  assert.equal(event?.templateParameters.length, 3)
})

test("normaliza celulares brasileiros para o formato internacional do WhatsApp", () => {
  assert.equal(normalizeWhatsappPhone("(11) 99999-9999"), "5511999999999")
  assert.equal(normalizeWhatsappPhone("+55 11 99999-9999"), "5511999999999")
  assert.equal(normalizeWhatsappPhone("123"), "")
})

test("mensagem em tarefa identifica a tarefa e notifica a contraparte, nunca o autor", () => {
  const fromAdmin = taskMessageEvent({ context: taskContext(), actor: { id: "admin-1", name: "Gabriel", role: "admin" }, body: "Acesso liberado." })
  assert.equal(fromAdmin?.recipient.id, client.id)
  assert.match(fromAdmin?.title ?? "", /#T3CDEF/)
  assert.match(fromAdmin?.body ?? "", /Configurar domínio/)
  assert.equal(fromAdmin?.templateName, "gbq_mensagem_tarefa_v2")
  assert.deepEqual(fromAdmin?.templateParameters, ["Gabriel", "T3CDEF", "Configurar domínio", "Implantação GBQ"])
  assert.equal(fromAdmin?.templateParameters.length, 4)

  const fromClient = taskMessageEvent({ context: taskContext(), actor: { id: client.id, name: "Cliente", role: "client" }, body: "Obrigado!" })
  assert.equal(fromClient?.recipient.id, responsible.id)

  const selfContext = taskContext({ client: { ...client, id: "admin-1" } })
  assert.equal(taskMessageEvent({ context: selfContext, actor: { id: "admin-1", name: "Gabriel", role: "admin" }, body: "Teste" }), null)
})

test("nenhum evento usa modelo v1", () => {
  const events = [
    taskCreatedEvent(taskContext(), "admin-1"),
    taskChangedEvent({ before: taskContext(), current: taskContext({ status: "done" }), actorId: "admin-1" }),
    taskChangedEvent({ before: taskContext(), current: taskContext({ owner: "Nova pessoa" }), actorId: "admin-1" }),
    projectChangedEvent({ before: project(), current: project({ objective: "Novo objetivo" }), actorId: "admin-1" }),
    taskMessageEvent({ context: taskContext(), actor: { id: "admin-1", name: "Gabriel", role: "admin" }, body: "Teste" }),
  ]
  assert.ok(events.every((event) => event && !event.templateName.endsWith("_v1")))
})

test("telefone inválido persiste a notificação sem chamar o App3", async () => {
  const event = taskCreatedEvent(taskContext({ client: { ...client, phone: "123" } }), "admin-1")
  assert.ok(event)
  let created = 0
  let sent = 0
  await deliverWorkspaceNotificationWith(event, {
    createNotification: async () => { created += 1 },
    sendTemplate: async () => { sent += 1; return { success: true, message: { id: "message-1", providerMessageId: null } } },
  })
  assert.equal(created, 1)
  assert.equal(sent, 0)
})

test("erro remoto gera detalhes seguros sem token ou telefone", () => {
  const event = taskCreatedEvent(taskContext(), "admin-1")
  assert.ok(event)
  const details = workspaceNotificationErrorDetails(event, new App3ApiError("TEMPLATE_NOT_FOUND", 404))
  assert.deepEqual(details, {
    kind: "task_created",
    projectId: "project-1",
    templateName: "gbq_tarefa_criada_v2",
    parameterCount: 4,
    code: "TEMPLATE_NOT_FOUND",
    status: 404,
    message: "Não foi possível concluir a operação no App3.",
  })
  const serialized = JSON.stringify(details)
  assert.equal(serialized.includes("app3_live_testtoken123456"), false)
  assert.equal(serialized.includes("5511999999999"), false)
})
