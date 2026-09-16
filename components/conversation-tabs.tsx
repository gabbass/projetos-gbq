"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { Bell, Download, FileText, LoaderCircle, MessageCircle, Paperclip, RefreshCw, Send, Smartphone } from "lucide-react"
import Image from "next/image"

import { markChatReadAction, sendChatMessageAction, type ProjectActionState } from "@/app/project-actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { ChatMessage, ChatTargetType } from "@/lib/projects/database"
import type { App3Message, App3Page, App3WhatsappStatus } from "@/lib/app3/types"

const initialState: ProjectActionState = {}

export function ConversationTabs({
  targetType,
  targetId,
  messages,
  unread,
  currentUserId,
  whatsappContact,
  details,
}: {
  targetType: ChatTargetType
  targetId: string
  messages: ChatMessage[]
  unread: number
  currentUserId: string
  whatsappContact?: string | null
  details: React.ReactNode
}) {
  const [unreadCount, setUnreadCount] = useState(unread)

  function selectTab(value: string) {
    if (value !== "chat") return
    setUnreadCount(0)
    void markChatReadAction(targetType, targetId)
  }

  const normalizedContact = whatsappContact?.replace(/\D/g, "") || null
  return <Tabs defaultValue="details" onValueChange={selectTab} className="min-h-0 flex-1 px-6 pb-6">
    <TabsList className={`grid w-full ${normalizedContact ? "grid-cols-3" : "grid-cols-2"}`}>
      <TabsTrigger value="details"><FileText />Detalhes</TabsTrigger>
      <TabsTrigger value="chat" className="relative"><MessageCircle />Chat{unreadCount > 0 ? <Badge className="ms-1 min-w-5 justify-center px-1.5">{unreadCount}</Badge> : null}</TabsTrigger>
      {normalizedContact ? <TabsTrigger value="whatsapp"><Smartphone />WhatsApp</TabsTrigger> : null}
    </TabsList>
    <TabsContent value="details" className="min-h-0 pt-4">
      <ScrollArea className="h-full pe-3">
        <div className="pb-1">{details}</div>
      </ScrollArea>
    </TabsContent>
    <TabsContent value="chat" className="min-h-0 pt-4">
      <ChatPanel targetType={targetType} targetId={targetId} messages={messages} currentUserId={currentUserId} />
    </TabsContent>
    {normalizedContact ? <TabsContent value="whatsapp" className="min-h-0 pt-4"><WhatsappPanel contactWaId={normalizedContact} /></TabsContent> : null}
  </Tabs>
}

export function UnreadBadge({ count }: { count: number }) {
  return count > 0 ? <Badge variant="destructive" className="gap-1"><Bell />{count}</Badge> : null
}

function ChatPanel({ targetType, targetId, messages, currentUserId }: { targetType: ChatTargetType; targetId: string; messages: ChatMessage[]; currentUserId: string }) {
  const [state, action, pending] = useActionState(sendChatMessageAction.bind(null, targetType, targetId), initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset()
  }, [state])

  return <div className="flex min-h-[34rem] flex-col gap-4">
    <ScrollArea className="h-[24rem] rounded-2xl border bg-muted/20">
      <div className="space-y-4 p-4">
        {messages.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center text-muted-foreground"><span className="flex size-11 items-center justify-center rounded-2xl bg-muted"><MessageCircle className="size-5" /></span><div><p className="font-medium text-foreground">Comece a conversa</p><p className="text-xs">Compartilhe uma atualização ou anexe um arquivo de até 10 MB.</p></div></div> : messages.map((message) => <MessageItem key={message.id} message={message} own={message.author_id === currentUserId} />)}
      </div>
    </ScrollArea>
    <form ref={formRef} action={action} className="grid gap-3">
      <div className="grid gap-2"><Label htmlFor={`chat-message-${targetId}`}>Mensagem</Label><Textarea id={`chat-message-${targetId}`} name="message" maxLength={4000} placeholder="Escreva uma atualização..." className="min-h-20" /></div>
      <div className="grid gap-2"><Label htmlFor={`chat-file-${targetId}`}><Paperclip />Anexo opcional</Label><Input id={`chat-file-${targetId}`} name="attachment" type="file" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip" /></div>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">1 arquivo por mensagem · máximo de 10 MB</p><Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Send />}{pending ? "Enviando..." : "Enviar"}</Button></div>
      {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-600"}>{state.message}</p> : null}
    </form>
  </div>
}

function MessageItem({ message, own }: { message: ChatMessage; own: boolean }) {
  const attachmentUrl = `/api/chat/attachments/${message.id}`
  return <div className={`flex gap-3 ${own ? "flex-row-reverse" : ""}`}>
    <Avatar size="sm"><AvatarFallback>{initials(message.author_name)}</AvatarFallback></Avatar>
    <Card size="sm" className={`max-w-[85%] shadow-none ${own ? "border-primary/20 bg-primary/5" : ""}`}>
      <CardContent className="space-y-2 p-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-xs font-medium">{own ? "Você" : message.author_name}</span><span className="text-[11px] text-muted-foreground">{formatMessageDate(message.created_at)}</span></div>
        {message.body ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p> : null}
        {message.attachment_type?.startsWith("image/") ? <a href={attachmentUrl} target="_blank" rel="noreferrer"><Image src={attachmentUrl} alt={message.attachment_name ?? "Imagem anexada"} width={640} height={360} unoptimized className="max-h-56 w-auto rounded-xl border object-contain" /></a> : null}
        {message.attachment_type?.startsWith("video/") ? <video src={attachmentUrl} controls preload="metadata" className="max-h-56 w-full rounded-xl border" /> : null}
        {message.attachment_name ? <Button asChild variant="outline" size="sm" className="max-w-full"><a href={attachmentUrl} target="_blank" rel="noreferrer"><Download /><span className="truncate">{message.attachment_name}</span>{message.attachment_size ? <span className="text-muted-foreground">· {formatBytes(message.attachment_size)}</span> : null}</a></Button> : null}
      </CardContent>
    </Card>
  </div>
}

function WhatsappPanel({ contactWaId }: { contactWaId: string }) {
  const [messages, setMessages] = useState<App3Message[]>([])
  const [status, setStatus] = useState<App3WhatsappStatus | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const formRef = useRef<HTMLFormElement>(null)

  async function load(append = false) {
    if (!append) setLoading(true)
    setError("")
    try {
      const cursor = append && nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : ""
      const [statusResponse, messagesResponse] = await Promise.all([
        fetch("/api/integrations/app3/status", { cache: "no-store" }),
        fetch(`/api/integrations/app3/conversations/${encodeURIComponent(contactWaId)}/messages?limit=50${cursor}`, { cache: "no-store" }),
      ])
      if (!statusResponse.ok || !messagesResponse.ok) throw new Error("UNAVAILABLE")
      const statusData = await statusResponse.json() as App3WhatsappStatus
      const page = await messagesResponse.json() as App3Page<App3Message>
      setStatus(statusData)
      setMessages((current) => append ? [...current, ...page.data] : page.data)
      setNextCursor(page.nextCursor)
    } catch { setError("Não foi possível carregar o WhatsApp agora.") }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timeout)
    // A troca do contato recria a fonte remota desta aba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactWaId])

  async function send(form: FormData) {
    const text = String(form.get("text") ?? "").trim()
    if (!text) return
    setSending(true)
    setError("")
    try {
      const response = await fetch("/api/integrations/app3/messages/text", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to: contactWaId, text }) })
      const body = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(body.error || "SEND_FAILED")
      formRef.current?.reset()
      await load()
    } catch (sendError) { setError(sendError instanceof Error && sendError.message !== "SEND_FAILED" ? sendError.message : "Não foi possível enviar a mensagem agora. Tente novamente.") }
    finally { setSending(false) }
  }

  if (loading) return <div className="space-y-3"><SkeletonRows /></div>
  return <div className="flex min-h-[34rem] flex-col gap-4">
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-2"><div className="min-w-0"><p className="text-sm font-medium">{formatPhone(contactWaId)}</p><p className="text-xs text-muted-foreground">{status?.connected ? "WhatsApp conectado" : "WhatsApp desconectado"}</p></div><Button variant="ghost" size="icon-sm" onClick={() => void load()} aria-label="Atualizar WhatsApp"><RefreshCw /></Button></div>
    <ScrollArea className="h-[23rem] rounded-2xl border bg-muted/20"><div className="space-y-3 p-4">{nextCursor ? <Button variant="ghost" size="sm" className="w-full" onClick={() => void load(true)}>Carregar mensagens anteriores</Button> : null}{messages.length === 0 ? <p className="py-24 text-center text-sm text-muted-foreground">Nenhuma mensagem encontrada.</p> : [...messages].reverse().map((message) => <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl border px-3 py-2 ${message.direction === "outbound" ? "border-primary/20 bg-primary/5" : "bg-card"}`}><p className="whitespace-pre-wrap text-sm">{message.text || `Mensagem do tipo ${message.type}`}</p><p className="mt-1 text-[11px] text-muted-foreground">{formatApp3Date(message.createdAt)}{message.status ? ` · ${message.status}` : ""}</p></div></div>)}</div></ScrollArea>
    <form ref={formRef} action={send} className="grid gap-3"><Textarea name="text" maxLength={4096} placeholder="Responder pelo WhatsApp..." disabled={!status?.connected || sending} /><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">O envio é processado pelo App3.</p><Button type="submit" disabled={!status?.connected || sending}>{sending ? <LoaderCircle className="animate-spin" /> : <Send />}{sending ? "Enviando..." : "Enviar"}</Button></div>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}</form>
  </div>
}

function SkeletonRows() { return <>{Array.from({ length: 5 }, (_, index) => <div key={index} className={`flex ${index % 2 ? "justify-end" : "justify-start"}`}><div className="w-2/3 space-y-2 rounded-2xl border p-3"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/2" /></div></div>)}</> }
function formatPhone(value: string) { return value.length > 4 ? `WhatsApp •••• ${value.slice(-4)}` : "WhatsApp" }
function formatApp3Date(value: number) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) }

function initials(name: string) {
  return (name || "U").split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatMessageDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}
