"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import {
  Bell,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  Target,
  Users,
  LogOut,
} from "lucide-react"

import { logoutAction } from "@/app/auth-actions"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

const items = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/projetos", label: "Projetos", icon: FolderKanban },
  { href: "/progresso", label: "Progresso", icon: ChartNoAxesColumnIncreasing, adminOnly: true },
  { href: "/equipe", label: "Equipe e acessos", icon: Users, adminOnly: true },
]

export function AppShell({
  children,
  currentUser,
  hasLogo,
  brandingVersion,
  siteName,
  siteSubtitle,
}: {
  children: ReactNode
  currentUser: { name: string; email: string; role: "admin" | "client" } | null
  hasLogo: boolean
  brandingVersion: string
  siteName: string
  siteSubtitle: string
}) {
  const pathname = usePathname()

  if (pathname === "/login" || pathname === "/alterar-senha") return children

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon" variant="inset">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" tooltip={siteName} asChild>
                  <Link href="/">
                    {hasLogo ? (
                      <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background">
                        <Image src={`/api/branding/logo?v=${encodeURIComponent(brandingVersion)}`} alt={`Logo de ${siteName}`} width={32} height={32} unoptimized className="size-8 object-contain" />
                      </span>
                    ) : (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Target className="size-4" /></span>
                    )}
                    <span className="grid flex-1 text-left leading-tight">
                      <span className="truncate font-heading font-semibold">{siteName}</span>
                      <span className="truncate text-xs text-muted-foreground">{siteSubtitle}</span>
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
                  {items.filter((item) => !item.adminOnly || currentUser?.role === "admin").map((item) => {
                    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                          <Link href={item.href} aria-current={active ? "page" : undefined}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton size="lg" tooltip={currentUser?.role === "admin" ? "Administrador" : "Cliente"}>
                      <Avatar className="size-8 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary">{getInitials(currentUser?.name, currentUser?.email)}</AvatarFallback>
                      </Avatar>
                      <span className="grid flex-1 text-left leading-tight">
                        <span className="truncate font-medium">{currentUser?.name || (currentUser?.role === "client" ? "Cliente" : "Administrador")}</span>
                        <span className="truncate text-xs text-muted-foreground">{currentUser?.email}</span>
                      </span>
                      <ChevronDown className="ml-auto" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="end" className="w-56">
                    <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <form action={logoutAction}>
                      <DropdownMenuItem asChild>
                        <button type="submit" className="w-full">
                          <LogOut />
                          Sair
                        </button>
                      </DropdownMenuItem>
                    </form>
                  </DropdownMenuContent>
                </DropdownMenu>
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
              <Input aria-label="Buscar" className="pl-9" placeholder="Buscar projetos, tarefas..." />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="icon" aria-label="Notificações">
                <Bell />
              </Button>
              {currentUser?.role === "admin" ? (
                <Button asChild aria-label="Novo projeto">
                  <Link href="/projetos">
                    <Plus />
                    <span className="hidden sm:inline">Novo projeto</span>
                  </Link>
                </Button>
              ) : null}
            </div>
          </header>
          <main className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

function getInitials(name?: string, email?: string) {
  const source = name?.trim() || email || "Usuário"
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
}
