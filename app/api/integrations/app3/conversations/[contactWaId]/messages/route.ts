import { getCurrentUser } from "@/lib/auth/session"
import { App3ApiError } from "@/lib/app3/errors"
import { getWhatsappMessages } from "@/lib/app3/whatsapp"

export async function GET(request: Request, context: { params: Promise<{ contactWaId: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin") return Response.json({ error: "Acesso negado." }, { status: 403 })
  const { contactWaId } = await context.params
  const url = new URL(request.url)
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50) || 50))
  try { return Response.json(await getWhatsappMessages(contactWaId, { limit, cursor: url.searchParams.get("cursor") ?? undefined })) }
  catch (error) {
    const status = error instanceof App3ApiError && error.status === 429 ? 429 : 503
    return Response.json({ error: "Não foi possível carregar as mensagens." }, { status })
  }
}
