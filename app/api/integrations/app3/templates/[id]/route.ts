import { getCurrentUser } from "@/lib/auth/session"
import { App3ApiError, publicApp3ErrorMessage } from "@/lib/app3/errors"
import { getWhatsappTemplate, updateWhatsappTemplate, deleteWhatsappTemplate } from "@/lib/app3/whatsapp"
import type { App3TemplateUpdateInput } from "@/lib/app3/types"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin") return Response.json({ error: "Acesso negado." }, { status: 403 })

  const { id } = await context.params
  if (!id) return Response.json({ error: "ID do modelo não informado." }, { status: 422 })

  try {
    return Response.json(await getWhatsappTemplate(id))
  } catch (error) {
    const status = error instanceof App3ApiError && error.status === 429 ? 429 : 503
    console.error("[app3] Falha ao buscar modelo", { templateId: id, code: error instanceof App3ApiError ? error.code : "UNKNOWN" })
    return Response.json({ error: "Não foi possível carregar o modelo." }, { status })
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin") return Response.json({ error: "Acesso negado." }, { status: 403 })

  const { id } = await context.params
  if (!id) return Response.json({ error: "ID do modelo não informado." }, { status: 422 })

  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return Response.json({ error: "Dados inválidos." }, { status: 422 })

  const input: App3TemplateUpdateInput = {}

  if ("components" in body && Array.isArray(body.components)) {
    input.components = body.components
    if (!input.components.length) {
      return Response.json({ error: "Pelo menos um componente é obrigatório." }, { status: 422 })
    }
  }

  if ("status" in body && typeof body.status === "string") {
    input.status = body.status.trim().toUpperCase()
  }

  if (!Object.keys(input).length) {
    return Response.json({ error: "Nenhum campo válido para atualização." }, { status: 422 })
  }

  try {
    return Response.json(await updateWhatsappTemplate(id, input))
  } catch (error) {
    console.error("[app3] Falha ao atualizar modelo", { templateId: id, code: error instanceof App3ApiError ? error.code : "UNKNOWN" })
    return Response.json(
      { error: publicApp3ErrorMessage(error) },
      { status: error instanceof App3ApiError && error.status === 429 ? 429 : 503 },
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 })
  if (user.role !== "admin") return Response.json({ error: "Acesso negado." }, { status: 403 })

  const { id } = await context.params
  if (!id) return Response.json({ error: "ID do modelo não informado." }, { status: 422 })

  try {
    await deleteWhatsappTemplate(id)
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("[app3] Falha ao excluir modelo", { templateId: id, code: error instanceof App3ApiError ? error.code : "UNKNOWN" })
    return Response.json(
      { error: publicApp3ErrorMessage(error) },
      { status: error instanceof App3ApiError && error.status === 429 ? 429 : 503 },
    )
  }
}