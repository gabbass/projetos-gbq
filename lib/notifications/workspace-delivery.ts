import { randomUUID } from "node:crypto"

import { App3ApiError } from "../app3/errors.ts"
import { normalizeWhatsappPhone, type WorkspaceNotificationEvent } from "./workspace-event-builders.ts"

export type WorkspaceNotificationDependencies = {
  createNotification: (input: {
    externalEventId: string
    userId: string
    title: string
    body: string
    projectId: string
    metadata: Record<string, unknown>
  }) => Promise<unknown>
  sendTemplate: (input: {
    to: string
    templateName: string
    language: string
    parameters: string[]
  }) => Promise<unknown>
}

export async function deliverWorkspaceNotificationWith(
  event: WorkspaceNotificationEvent,
  dependencies: WorkspaceNotificationDependencies,
) {
  if (event.recipient.id === event.actorId) return
  const eventId = `workspace_${randomUUID()}`
  await dependencies.createNotification({
    externalEventId: eventId,
    userId: event.recipient.id,
    title: event.title,
    body: event.body,
    projectId: event.projectId,
    metadata: { ...event.metadata, event: event.kind },
  })

  const phone = normalizeWhatsappPhone(event.recipient.phone)
  if (!phone) return
  await dependencies.sendTemplate({
    to: phone,
    templateName: event.templateName,
    language: "pt_BR",
    parameters: event.templateParameters,
  })
}

export function workspaceNotificationErrorDetails(event: WorkspaceNotificationEvent, error: unknown) {
  return {
    kind: event.kind,
    projectId: event.projectId,
    templateName: event.templateName,
    parameterCount: event.templateParameters.length,
    code: error instanceof App3ApiError ? error.code : "UNKNOWN",
    status: error instanceof App3ApiError ? error.status : null,
    message: error instanceof App3ApiError ? error.message : "Falha inesperada ao entregar a notificação.",
  }
}
