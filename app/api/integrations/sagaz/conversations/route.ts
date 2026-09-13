import { getCurrentUser } from "@/lib/auth/session"
import { SagazApiError } from "@/lib/sagaz/errors"
import { getWhatsappConversations } from "@/lib/sagaz/whatsapp"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin") return Response.json({ error: "Acesso negado." }, { status: 403 })
  const url = new URL(request.url)
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50) || 50))
  try { return Response.json(await getWhatsappConversations({ limit, cursor: url.searchParams.get("cursor") ?? undefined })) }
  catch (error) {
    const status = error instanceof SagazApiError && error.status === 429 ? 429 : 503
    return Response.json({ error: "Não foi possível carregar as conversas." }, { status })
  }
}
