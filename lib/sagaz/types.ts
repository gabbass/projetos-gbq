export type SagazWhatsappStatus = {
  connected: boolean
  status: string
  paymentStatus: string | null
  historySyncStatus: string | null
  phone: { displayPhoneNumber: string | null; verifiedName: string | null } | null
}

export type SagazConversation = {
  contactWaId: string
  name: string | null
  lastMessage: { text: string | null; direction: "inbound" | "outbound"; createdAt: number } | null
}

export type SagazMessage = {
  id: string
  providerMessageId: string | null
  direction: "inbound" | "outbound"
  type: string
  text: string | null
  status: string | null
  createdAt: number
}

export type SagazTemplate = { id: string; name: string; language: string; status: string; category: string }
export type SagazPage<T> = { data: T[]; nextCursor: string | null }
export type SagazSendResult = { success: true; message: { id: string; providerMessageId: string | null } }

export type SagazMessageReceivedEvent = {
  id: string
  event: "whatsapp.message.received"
  createdAt: number
  data: { contactWaId: string; messageId: string; providerMessageId?: string; type: string; text: string | null }
}

export type SagazMessageStatusEvent = {
  id: string
  event: "whatsapp.message.status"
  createdAt: number
  data: { contactWaId: string; messageId: string; providerMessageId?: string; status: string }
}

export type SagazWebhookEvent = SagazMessageReceivedEvent | SagazMessageStatusEvent

