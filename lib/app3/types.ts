export type App3WhatsappStatus = {
  connected: boolean
  status: string
  paymentStatus: string | null
  historySyncStatus: string | null
  phone: { displayPhoneNumber: string | null; verifiedName: string | null } | null
}

export type App3Conversation = {
  contactWaId: string
  name: string | null
  lastMessage: { text: string | null; direction: "inbound" | "outbound"; createdAt: number } | null
}

export type App3Message = {
  id: string
  providerMessageId: string | null
  direction: "inbound" | "outbound"
  type: string
  text: string | null
  status: string | null
  createdAt: number
}

export type App3Template = { id: string; name: string; language: string; status: string; category: string }
export type App3Page<T> = { data: T[]; nextCursor: string | null }
export type App3SendResult = { success: true; message: { id: string; providerMessageId: string | null } }

export type App3MessageReceivedEvent = {
  id: string
  event: "whatsapp.message.received"
  createdAt: number
  data: { contactWaId: string; messageId: string; providerMessageId?: string; type: string; text: string | null }
}

export type App3MessageStatusEvent = {
  id: string
  event: "whatsapp.message.status"
  createdAt: number
  data: { contactWaId: string; messageId: string; providerMessageId?: string; status: string }
}

export type App3WebhookEvent = App3MessageReceivedEvent | App3MessageStatusEvent
