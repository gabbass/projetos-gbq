import { getCurrentUser } from "@/lib/auth/session"
import { listNotifications } from "@/lib/notifications/repository"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 })
  const url = new URL(request.url)
  const limitValue = Number(url.searchParams.get("limit") ?? 20)
  const limit = Number.isInteger(limitValue) ? Math.min(50, Math.max(1, limitValue)) : 20
  const page = await listNotifications(user.id, { limit, cursor: url.searchParams.get("cursor") ?? undefined })
  return Response.json(page)
}
