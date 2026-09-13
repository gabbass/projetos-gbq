import { getCurrentUser } from "@/lib/auth/session"
import { markAllNotificationsRead } from "@/lib/notifications/repository"

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 })
  await markAllNotificationsRead(user.id)
  return Response.json({ success: true })
}
