import { getCurrentUser } from "@/lib/auth/session"
import { publicApp3ErrorMessage, App3ApiError } from "@/lib/app3/errors"
import { sendWhatsappText } from "@/lib/app3/whatsapp"

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin") return Response.json({ error: "Acesso negado." }, { status: 403 })
  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return Response.json({ error: "Dados inválidos." }, { status: 422 })
  const to = "to" in body && typeof body.to === "string" ? body.to.replace(/\D/g, "") : ""
  const text = "text" in body && typeof body.text === "string" ? body.text.trim() : ""
  if (!/^\d{8,15}$/.test(to) || !text || text.length > 4096) return Response.json({ error: "Telefone ou mensagem inválidos." }, { status: 422 })
  try { return Response.json(await sendWhatsappText({ to, text }), { status: 201 }) }
  catch (error) {
    console.error("[app3] Falha ao enviar texto", { code: error instanceof App3ApiError ? error.code : "UNKNOWN" })
    return Response.json({ error: publicApp3ErrorMessage(error) }, { status: error instanceof App3ApiError && error.status === 429 ? 429 : 503 })
  }
}
