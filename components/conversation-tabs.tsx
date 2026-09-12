"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { Bell, Download, FileText, LoaderCircle, MessageCircle, Paperclip, Send } from "lucide-react"
import Image from "next/image"

import { markChatReadAction, sendChatMessageAction, type ProjectActionState } from "@/app/project-actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { ChatMessage, ChatTargetType } from "@/lib/projects/database"

const initialState: ProjectActionState = {}

export function ConversationTabs({
  targetType,
  targetId,
  messages,
  unread,
  currentUserId,
  details,
}: {
  targetType: ChatTargetType
  targetId: string
  messages: ChatMessage[]
  unread: number
  currentUserId: string
  details: React.ReactNode
}) {
  const [unreadCount, setUnreadCount] = useState(unread)

  function selectTab(value: string) {
    if (value !== "chat") return
    setUnreadCount(0)
    void markChatReadAction(targetType, targetId)
  }

  return <Tabs defaultValue="details" onValueChange={selectTab} className="min-h-0 flex-1 px-6 pb-6">
    <TabsList className="grid w-full grid-cols-2">
      <TabsTrigger value="details"><FileText />Detalhes</TabsTrigger>
      <TabsTrigger value="chat" className="relative"><MessageCircle />Chat{unreadCount > 0 ? <Badge className="ms-1 min-w-5 justify-center px-1.5">{unreadCount}</Badge> : null}</TabsTrigger>
    </TabsList>
    <TabsContent value="details" className="min-h-0 overflow-y-auto pt-4">{details}</TabsContent>
    <TabsContent value="chat" className="min-h-0 pt-4">
      <ChatPanel targetType={targetType} targetId={targetId} messages={messages} currentUserId={currentUserId} />
    </TabsContent>
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

function initials(name: string) {
  return (name || "U").split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatMessageDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}
