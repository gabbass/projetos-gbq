"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import {
  Bell,
  ChevronDown,
  DatabaseZap,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  Target,
  Users,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

const items = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/projetos", label: "Projetos", icon: FolderKanban, badge: "12" },
  { href: "/configuracoes", label: "Equipe e acessos", icon: Users, badge: "27" },
  { href: "/diagnostico", label: "Diagnóstico", icon: DatabaseZap },
]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon" variant="inset">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" tooltip="GBQ Projetos" asChild>
                  <Link href="/">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Target className="size-4" />
                    </span>
                    <span className="grid flex-1 text-left leading-tight">
                      <span className="truncate font-heading font-semibold">GBQ Projetos</span>
                      <span className="truncate text-xs text-muted-foreground">Gestão à vista</span>
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                          <Link href={item.href} aria-current={active ? "page" : undefined}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                        {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Projetos recentes</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {[
                    ["Portal do cliente", "bg-blue-500"],
                    ["Aplicativo mobile", "bg-amber-500"],
                    ["Dashboard executivo", "bg-emerald-500"],
                  ].map(([label, color]) => (
                    <SidebarMenuItem key={label}>
                      <SidebarMenuButton tooltip={label}>
                        <span className={`size-2.5 shrink-0 rounded-full ${color}`} />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Configurações">
                  <Link href="/configuracoes">
                    <Settings />
                    <span>Configurações</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" tooltip="Gabriel Souza">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary">GS</AvatarFallback>
                  </Avatar>
                  <span className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-medium">Gabriel Souza</span>
                    <span className="truncate text-xs text-muted-foreground">Administrador</span>
                  </span>
                  <ChevronDown className="ml-auto" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-5" />
            <div className="relative hidden w-full max-w-sm sm:block">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Buscar" className="pl-9" placeholder="Buscar projetos, pessoas..." />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="icon" aria-label="Notificações">
                <Bell />
              </Button>
              <Button asChild aria-label="Novo projeto">
                <Link href="/projetos">
                  <Plus />
                  <span className="hidden sm:inline">Novo projeto</span>
                </Link>
              </Button>
            </div>
          </header>
          <main className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
