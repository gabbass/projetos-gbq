import { claimIntegrationEvent, createEventNotifications, finishIntegrationEvent, resolveWhatsappRecipients } from "@/lib/notifications/repository"
import type { SagazWebhookEvent } from "@/lib/sagaz/types"

export async function processSagazWebhookEvent(event: SagazWebhookEvent) {
  if (!await claimIntegrationEvent(event.id, event.event)) return { duplicate: true }
  try {
    if (event.event === "whatsapp.message.received") {
      const recipients = await resolveWhatsappRecipients(event.data.contactWaId)
      const preview = messagePreview(event.data.text, event.data.type)
      await createEventNotifications({
        externalEventId: event.id,
        recipients,
        type: "whatsapp_message",
        title: `Nova mensagem de ${recipients[0]?.contact_name?.trim() || formatContact(event.data.contactWaId)}`,
        body: preview,
        metadata: { contactWaId: event.data.contactWaId, messageId: event.data.messageId, messageType: event.data.type },
      })
    }
    await finishIntegrationEvent(event.id, "processed")
    return { duplicate: false }
  } catch (error) {
    await finishIntegrationEvent(event.id, "failed").catch(() => undefined)
    throw error
  }
}

function messagePreview(text: string | null, type: string) {
  const value = text?.trim() || `Mensagem do tipo ${type}`
  return value.length > 160 ? `${value.slice(0, 157)}...` : value
}

function formatContact(value: string) {
  const digits = value.replace(/\D/g, "")
  return digits.length > 4 ? `•••• ${digits.slice(-4)}` : "cliente"
}
