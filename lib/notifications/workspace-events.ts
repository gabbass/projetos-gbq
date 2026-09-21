import { sendWhatsappTemplate } from "@/lib/app3/whatsapp"
import type { WorkspaceNotificationEvent } from "@/lib/notifications/workspace-event-builders"
import { deliverWorkspaceNotificationWith } from "@/lib/notifications/workspace-delivery"
import { createWorkspaceNotification } from "@/lib/notifications/repository"

export { workspaceNotificationErrorDetails } from "@/lib/notifications/workspace-delivery"

export function deliverWorkspaceNotification(event: WorkspaceNotificationEvent) {
  return deliverWorkspaceNotificationWith(event, {
    createNotification: createWorkspaceNotification,
    sendTemplate: sendWhatsappTemplate,
  })
}
