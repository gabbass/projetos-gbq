import { getCurrentUser } from "@/lib/auth/session"
import { getChatAttachment } from "@/lib/projects/database"

export async function GET(_request: Request, context: RouteContext<"/api/chat/attachments/[messageId]">) {
  const user = await getCurrentUser()
  if (!user) return new Response("Não autorizado", { status: 401 })

  try {
    const { messageId } = await context.params
    const attachment = await getChatAttachment(user, messageId)
    const safeName = (attachment.attachment_name ?? "arquivo").replace(/[\r\n"\\]/g, "_")
    return new Response(new Uint8Array(attachment.attachment_data!), {
      headers: {
        "Content-Type": attachment.attachment_type ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return new Response("Arquivo não encontrado", { status: 404 })
  }
}
