export type NotificationType = "whatsapp_message" | "whatsapp_status" | "system"

export type AppNotification = {
  id: string
  type: NotificationType
  title: string
  body: string
  href: string | null
  readAt: string | null
  createdAt: string
  metadata: Record<string, unknown>
}

export type NotificationPage = { data: AppNotification[]; nextCursor: string | null; unreadCount: number }

