import { randomUUID } from "node:crypto"

import { sendWhatsappText } from "@/lib/app3/whatsapp"
import { normalizeWhatsappPhone, type WorkspaceNotificationEvent } from "@/lib/notifications/workspace-event-builders"
import { createWorkspaceNotification } from "@/lib/notifications/repository"

export async function deliverWorkspaceNotification(event: WorkspaceNotificationEvent) {
  if (event.recipient.id === event.actorId) return
  const eventId = `workspace_${randomUUID()}`
  await createWorkspaceNotification({
    externalEventId: eventId,
    userId: event.recipient.id,
    title: event.title,
    body: event.body,
    projectId: event.projectId,
    metadata: { ...event.metadata, event: event.kind },
  })

  const phone = normalizeWhatsappPhone(event.recipient.phone)
  if (!phone) return
  await sendWhatsappText({ to: phone, text: `${event.title}\n\n${event.body}` })
}
