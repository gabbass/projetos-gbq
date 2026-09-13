import { getCurrentUser } from "@/lib/auth/session"
import { markNotificationRead } from "@/lib/notifications/repository"

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 })
  const body: unknown = await request.json().catch(() => null)
  const id = body && typeof body === "object" && "id" in body && typeof body.id === "string" ? body.id : ""
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Notificação inválida." }, { status: 422 })
  const found = await markNotificationRead(user.id, id)
  return found ? Response.json({ success: true }) : Response.json({ error: "Notificação não encontrada." }, { status: 404 })
}

