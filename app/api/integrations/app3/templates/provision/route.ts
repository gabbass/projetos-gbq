import { getCurrentUser } from "@/lib/auth/session"
import { App3ApiError, publicApp3ErrorMessage } from "@/lib/app3/errors"
import { provisionGbqTemplates } from "@/lib/app3/whatsapp"

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin") return Response.json({ error: "Acesso negado." }, { status: 403 })

  try {
    return Response.json(await provisionGbqTemplates())
  } catch (error) {
    console.error("[app3] Falha ao provisionar modelos do GBQ", {
      code: error instanceof App3ApiError ? error.code : "UNKNOWN",
    })
    return Response.json(
      { error: publicApp3ErrorMessage(error) },
      { status: error instanceof App3ApiError && error.status === 429 ? 429 : 503 },
    )
  }
}
