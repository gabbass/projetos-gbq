import { finishIntegrationEvent } from "@/lib/notifications/repository"
import { processApp3WebhookEvent } from "@/lib/notifications/service"
import { parseApp3Webhook, verifyApp3Webhook } from "@/lib/app3/webhook"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const secret = process.env.APP3_WEBHOOK_SECRET?.trim()
  if (!secret) return Response.json({ error: "Webhook não configurado." }, { status: 503 })

  const rawBody = await request.text()
  const eventId = request.headers.get("x-app3-event-id")
  const valid = verifyApp3Webhook({
    rawBody,
    timestamp: request.headers.get("x-app3-timestamp"),
    signature: request.headers.get("x-app3-signature"),
    secret,
  })
  if (!valid) return Response.json({ error: "Assinatura inválida." }, { status: 401 })

  const parsed = parseApp3Webhook(rawBody)
  const parsedEventId = parsed?.kind === "known" ? parsed.event.id : parsed?.id
  if (!parsed || !eventId || parsedEventId !== eventId) return Response.json({ error: "Evento inválido." }, { status: 422 })
  if (parsed.kind === "unknown") {
    const claimed = await import("@/lib/notifications/repository").then(({ claimIntegrationEvent }) => claimIntegrationEvent(parsed.id, parsed.event))
    if (claimed) await finishIntegrationEvent(parsed.id, "ignored")
    return Response.json({ received: true, ignored: true })
  }

  try {
    const result = await processApp3WebhookEvent(parsed.event)
    return Response.json({ received: true, duplicate: result.duplicate })
  } catch (error) {
    console.error("[app3-webhook] Falha ao processar evento", { eventId, error })
    return Response.json({ error: "Falha temporária ao processar evento." }, { status: 503 })
  }
}
