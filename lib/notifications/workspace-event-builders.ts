import type { ProjectNotificationContext, ProjectStatus, TaskNotificationContext, TaskStatus } from "../projects/database.ts"

export type NotificationRecipient = { id: string; name: string; phone: string }

export type WorkspaceNotificationEvent = {
  kind: "task_created" | "task_updated" | "task_status_changed" | "project_updated" | "project_status_changed" | "task_message_created"
  recipient: NotificationRecipient
  actorId: string
  projectId: string
  title: string
  body: string
  templateName: string
  templateParameters: string[]
  metadata: Record<string, unknown>
}

const statusLabels: Record<TaskStatus, string> = { todo: "A fazer", in_progress: "Em andamento", waiting: "Aguardando", done: "Concluído" }
const projectStatusLabels: Record<ProjectStatus, string> = { approach: "Abordagem", negotiation: "Negociação", contract: "Contrato", execution: "Execução", validation: "Validação", go_live: "Go Live", finished: "Finalizado" }
const fieldLabels: Record<string, string> = {
  name: "nome", area: "área", client: "cliente", responsible: "responsável", priority: "prioridade",
  deadline: "prazo", objective: "objetivo", title: "título", description: "descrição", owner: "responsável", dueDate: "prazo",
}

export function clientRecipient(context: ProjectNotificationContext | TaskNotificationContext) { return context.client }
export function messageRecipient(context: TaskNotificationContext, actorRole: "admin" | "client") { return actorRole === "client" ? context.responsible : context.client }

export function taskCreatedEvent(context: TaskNotificationContext, actorId: string): WorkspaceNotificationEvent | null {
  const recipient = clientRecipient(context)
  if (!recipient || recipient.id === actorId) return null
  const item = context.parentTaskId ? "Subtarefa" : "Tarefa"
  return {
    kind: "task_created", recipient, actorId, projectId: context.projectId,
    title: `${item} criada em ${context.projectName}`,
    body: `${item} #${context.taskCode} — ${context.taskTitle}\nStatus: ${statusLabels[context.status]}`,
    templateName: "gbq_tarefa_criada_v2",
    templateParameters: templateParameters(context.projectName, context.taskCode, context.taskTitle, statusLabels[context.status]),
    metadata: taskMetadata(context),
  }
}

export function taskChangedEvent(input: { before: TaskNotificationContext; current: TaskNotificationContext; actorId: string }): WorkspaceNotificationEvent | null {
  const recipient = clientRecipient(input.current)
  if (!recipient || recipient.id === input.actorId) return null
  const statusChanged = input.before.status !== input.current.status
  const changes = changedTaskFields(input.before, input.current)
  if (!statusChanged && !changes.length) return null
  const item = input.current.parentTaskId ? "Subtarefa" : "Tarefa"
  const lines = [`${item} #${input.current.taskCode} — ${input.current.taskTitle}`]
  if (statusChanged) lines.push(`Status: ${statusLabels[input.before.status]} → ${statusLabels[input.current.status]}`)
  if (changes.length) lines.push(`Alterações: ${joinLabels(changes)}`)
  return {
    kind: statusChanged ? "task_status_changed" : "task_updated", recipient, actorId: input.actorId, projectId: input.current.projectId,
    title: `${statusChanged ? "Status alterado" : `${item} atualizada`} em ${input.current.projectName}`,
    body: lines.join("\n"),
    templateName: statusChanged ? "gbq_status_tarefa_v2" : "gbq_tarefa_atualizada_v2",
    templateParameters: statusChanged
      ? templateParameters(input.current.projectName, input.current.taskCode, input.current.taskTitle, statusLabels[input.before.status], statusLabels[input.current.status])
      : templateParameters(input.current.projectName, input.current.taskCode, input.current.taskTitle, joinLabels(changes)),
    metadata: { ...taskMetadata(input.current), changes: statusChanged ? ["status", ...changes] : changes },
  }
}

export function projectChangedEvent(input: { before: ProjectNotificationContext; current: ProjectNotificationContext; actorId: string }): WorkspaceNotificationEvent | null {
  const recipient = clientRecipient(input.current)
  if (!recipient || recipient.id === input.actorId) return null
  const changes = changedProjectFields(input.before, input.current)
  if (!changes.length) return null
  const statusChanged = input.before.projectStatus !== input.current.projectStatus
  const changeSummary = changes.map((field) => field === "status"
    ? `status geral (${projectStatusLabels[input.before.projectStatus]} → ${projectStatusLabels[input.current.projectStatus]})`
    : fieldLabels[field] ?? field).join(", ")
  return {
    kind: statusChanged ? "project_status_changed" : "project_updated", recipient, actorId: input.actorId, projectId: input.current.projectId,
    title: statusChanged ? `Nova etapa do projeto #${input.current.projectCode}` : `Projeto #${input.current.projectCode} atualizado`, body: `${input.current.projectName}\nAlterações: ${changeSummary}`,
    templateName: "gbq_projeto_atualizado_v2",
    templateParameters: templateParameters(input.current.projectCode, input.current.projectName, changeSummary),
    metadata: { projectId: input.current.projectId, projectCode: input.current.projectCode, changes },
  }
}

export function taskMessageEvent(input: { context: TaskNotificationContext; actor: { id: string; name: string; role: "admin" | "client" }; body: string; attachmentName?: string }): WorkspaceNotificationEvent | null {
  const recipient = messageRecipient(input.context, input.actor.role)
  if (!recipient || recipient.id === input.actor.id) return null
  return {
    kind: "task_message_created", recipient, actorId: input.actor.id, projectId: input.context.projectId,
    title: `Nova mensagem na tarefa #${input.context.taskCode}`,
    body: `${input.context.taskTitle}\n${input.actor.name}: ${messagePreview(input.body, input.attachmentName)}\nProjeto: ${input.context.projectName}`,
    templateName: "gbq_mensagem_tarefa_v2",
    templateParameters: templateParameters(input.actor.name, input.context.taskCode, input.context.taskTitle, input.context.projectName),
    metadata: { ...taskMetadata(input.context), authorId: input.actor.id, authorName: input.actor.name },
  }
}

function taskMetadata(context: TaskNotificationContext) {
  return { projectId: context.projectId, projectCode: context.projectCode, taskId: context.taskId, taskCode: context.taskCode, parentTaskId: context.parentTaskId }
}

function changedTaskFields(before: TaskNotificationContext, current: TaskNotificationContext) {
  const fields: string[] = []
  if (before.taskTitle !== current.taskTitle) fields.push("title")
  if (before.description !== current.description) fields.push("description")
  if (before.owner !== current.owner) fields.push("owner")
  if (before.taskPriority !== current.taskPriority) fields.push("priority")
  if (before.dueDate !== current.dueDate) fields.push("dueDate")
  return fields
}

function changedProjectFields(before: ProjectNotificationContext, current: ProjectNotificationContext) {
  const fields: string[] = []
  if (before.projectName !== current.projectName) fields.push("name")
  if (before.projectStatus !== current.projectStatus) fields.push("status")
  if (before.area !== current.area) fields.push("area")
  if (before.client?.id !== current.client?.id) fields.push("client")
  if (before.responsible?.id !== current.responsible?.id) fields.push("responsible")
  if (before.projectPriority !== current.projectPriority) fields.push("priority")
  if (before.deadline !== current.deadline) fields.push("deadline")
  if (before.objective !== current.objective) fields.push("objective")
  return fields
}

function joinLabels(fields: string[]) { return fields.map((field) => fieldLabels[field] ?? field).join(", ") }
function templateParameters(...values: string[]) { return values.map((value) => value.trim().slice(0, 1024) || "Não informado") }
function messagePreview(body: string, attachmentName?: string) {
  const value = body.trim() || (attachmentName ? `Anexo: ${attachmentName}` : "Nova mensagem")
  return value.length > 180 ? `${value.slice(0, 177)}...` : value
}

export function normalizeWhatsappPhone(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits.length >= 12 && digits.length <= 15 ? digits : ""
}
