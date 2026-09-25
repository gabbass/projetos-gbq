import { getCurrentUser } from "@/lib/auth/session"
import { App3ApiError, publicApp3ErrorMessage } from "@/lib/app3/errors"
import { getWhatsappTemplates, createWhatsappTemplate } from "@/lib/app3/whatsapp"
import type { App3TemplateCreateInput } from "@/lib/app3/types"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin") return Response.json({ error: "Acesso negado." }, { status: 403 })

  const url = new URL(request.url)
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50) || 50))
  const cursor = url.searchParams.get("cursor") ?? undefined

  try {
    return Response.json(await getWhatsappTemplates({ limit, cursor }))
  } catch (error) {
    const status = error instanceof App3ApiError && error.status === 429 ? 429 : 503
    console.error("[app3] Falha ao listar modelos", { code: error instanceof App3ApiError ? error.code : "UNKNOWN" })
    return Response.json({ error: "Não foi possível carregar os modelos." }, { status })
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin") return Response.json({ error: "Acesso negado." }, { status: 403 })

  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return Response.json({ error: "Dados inválidos." }, { status: 422 })

  const name = "name" in body && typeof body.name === "string" ? body.name.trim() : ""
  const language = "language" in body && typeof body.language === "string" ? body.language.trim() : ""
  const category = "category" in body && typeof body.category === "string" ? body.category.toUpperCase() : ""
  const components = "components" in body && Array.isArray(body.components) ? body.components : []

  if (!name || !/^[a-zA-Z0-9_]{1,512}$/.test(name)) {
    return Response.json({ error: "Nome do modelo inválido. Use apenas letras, números e underscore (máx. 512 caracteres)." }, { status: 422 })
  }
  if (!language || !/^[a-z]{2}_[A-Z]{2}$/.test(language)) {
    return Response.json({ error: "Idioma inválido. Use formato como 'pt_BR'." }, { status: 422 })
  }
  if (!["UTILITY", "MARKETING", "AUTHENTICATION"].includes(category)) {
    return Response.json({ error: "Categoria inválida. Use: UTILITY, MARKETING ou AUTHENTICATION." }, { status: 422 })
  }
  if (!components.length) {
    return Response.json({ error: "Pelo menos um componente é obrigatório." }, { status: 422 })
  }

  const input: App3TemplateCreateInput = { name, language, category: category as "UTILITY" | "MARKETING" | "AUTHENTICATION", components }

  try {
    return Response.json(await createWhatsappTemplate(input), { status: 201 })
  } catch (error) {
    console.error("[app3] Falha ao criar modelo", { code: error instanceof App3ApiError ? error.code : "UNKNOWN" })
    return Response.json(
      { error: publicApp3ErrorMessage(error) },
      { status: error instanceof App3ApiError && error.status === 429 ? 429 : 503 },
    )
  }
}