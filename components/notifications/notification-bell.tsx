"use client"

import { useCallback, useEffect, useState } from "react"
import { Bell, CheckCheck, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import type { AppNotification, NotificationPage } from "@/lib/notifications/types"

export function NotificationBell({ enabled }: { enabled: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(enabled)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(async (append = false) => {
    if (!enabled) return
    if (!append) setLoading(true)
    try {
      const cursor = append && nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : ""
      const response = await fetch(`/api/notifications?limit=20${cursor}`, { cache: "no-store" })
      if (!response.ok) throw new Error("NOTIFICATIONS_UNAVAILABLE")
      const page = await response.json() as NotificationPage
      setItems((current) => append ? [...current, ...page.data] : page.data)
      setUnreadCount(page.unreadCount)
      setNextCursor(page.nextCursor)
      toast.dismiss("notifications-load")
    } catch {
      toast.error("Não foi possível carregar as notificações.", { id: "notifications-load", duration: Infinity })
    } finally { setLoading(false) }
  }, [enabled, nextCursor])

  useEffect(() => {
    if (!enabled) return
    const initialLoad = window.setTimeout(() => void load(), 0)
    const interval = window.setInterval(() => void load(), 45_000)
    const onFocus = () => void load()
    window.addEventListener("focus", onFocus)
    return () => { window.clearTimeout(initialLoad); window.clearInterval(interval); window.removeEventListener("focus", onFocus) }
  }, [enabled, load])

  async function markRead(notification: AppNotification) {
    if (!notification.readAt) {
      setItems((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item))
      setUnreadCount((count) => Math.max(0, count - 1))
      try {
        const response = await fetch("/api/notifications/read", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: notification.id }) })
        if (!response.ok) throw new Error("MARK_READ_FAILED")
      } catch {
        toast.error("Não foi possível marcar a notificação como lida.", { duration: Infinity })
        void load()
      }
    }
    if (notification.href) { setOpen(false); router.push(notification.href) }
  }

  async function markAllRead() {
    setMarkingAll(true)
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })))
    setUnreadCount(0)
    try {
      const response = await fetch("/api/notifications/read-all", { method: "POST" })
      if (!response.ok) throw new Error("MARK_ALL_FAILED")
      toast.success("Todas as notificações foram marcadas como lidas.")
    } catch {
      toast.error("Não foi possível marcar todas as notificações como lidas.", { duration: Infinity })
      void load()
    } finally {
      setMarkingAll(false)
    }
  }

  return <SidebarMenuItem>
    <Sheet open={open} onOpenChange={(value) => { setOpen(value); if (value) void load() }}>
      <SheetTrigger asChild>
        <SidebarMenuButton tooltip="Notificações" disabled={!enabled} className="relative">
          <Bell />
          <span>Notificações</span>
          {unreadCount > 0 ? <Badge variant="destructive" className="ms-auto min-w-5 justify-center px-1.5 text-[10px] group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:-end-1 group-data-[collapsible=icon]:-top-1">{unreadCount > 99 ? "99+" : unreadCount}</Badge> : null}
        </SidebarMenuButton>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-5">
          <div className="flex items-start justify-between gap-4">
            <div><SheetTitle>Notificações</SheetTitle><SheetDescription>Atualizações do seu workspace.</SheetDescription></div>
            <Button variant="ghost" size="sm" disabled={unreadCount === 0 || markingAll} onClick={() => void markAllRead()}>{markingAll ? <Spinner /> : <CheckCheck />}{markingAll ? "Marcando..." : "Marcar todas"}</Button>
          </div>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          {loading ? <div className="flex min-h-64 items-center justify-center"><Spinner className="size-6" /></div> : items.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground"><span className="flex size-11 items-center justify-center rounded-2xl bg-muted"><Bell className="size-5" /></span><p className="text-sm">Nenhuma notificação por enquanto.</p></div> : <div>{items.map((notification, index) => <div key={notification.id}>{index > 0 ? <Separator /> : null}<button type="button" onClick={() => void markRead(notification)} className="flex w-full gap-3 p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted"><MessageCircle className="size-4" /></span><span className="min-w-0 flex-1"><span className="flex items-start gap-2"><span className="flex-1 text-sm font-medium">{notification.title}</span>{!notification.readAt ? <span className="mt-1.5 size-2 rounded-full bg-primary" aria-label="Não lida" /> : null}</span><span className="mt-1 line-clamp-2 text-sm text-muted-foreground">{notification.body}</span><span className="mt-2 block text-xs text-muted-foreground">{formatRelativeTime(notification.createdAt)}</span></span></button></div>)}</div>}
          {nextCursor && !loading ? <div className="border-t p-4"><Button variant="outline" className="w-full" onClick={() => void load(true)}>Carregar mais</Button></div> : null}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  </SidebarMenuItem>
}

function formatRelativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return "Agora"
  if (seconds < 3600) return `Há ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `Há ${Math.floor(seconds / 3600)} h`
  if (seconds < 604800) return `Há ${Math.floor(seconds / 86400)} d`
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value))
}
