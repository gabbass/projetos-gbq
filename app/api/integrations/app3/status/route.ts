import { getCurrentUser } from "@/lib/auth/session"
import { App3ApiError } from "@/lib/app3/errors"
import { getWhatsappStatus } from "@/lib/app3/whatsapp"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin") return Response.json({ error: "Acesso negado." }, { status: 403 })
  try { return Response.json(await getWhatsappStatus()) } catch (error) { return app3Error(error) }
}

function app3Error(error: unknown) {
  const status = error instanceof App3ApiError && error.status === 429 ? 429 : 503
  console.error("[app3] Falha ao consultar status", { code: error instanceof App3ApiError ? error.code : "UNKNOWN", status })
  return Response.json({ error: "O WhatsApp está indisponível no momento." }, { status })
}
