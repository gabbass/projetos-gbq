import { getCurrentUser } from "@/lib/auth/session"
import { SagazApiError } from "@/lib/sagaz/errors"
import { getWhatsappStatus } from "@/lib/sagaz/whatsapp"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin") return Response.json({ error: "Acesso negado." }, { status: 403 })
  try { return Response.json(await getWhatsappStatus()) } catch (error) { return sagazError(error) }
}

function sagazError(error: unknown) {
  const status = error instanceof SagazApiError && error.status === 429 ? 429 : 503
  console.error("[sagaz] Falha ao consultar status", { code: error instanceof SagazApiError ? error.code : "UNKNOWN", status })
  return Response.json({ error: "O WhatsApp está indisponível no momento." }, { status })
}

