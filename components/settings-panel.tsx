"use client"

import Image from "next/image"
import Link from "next/link"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import {
  LoaderCircle,
  DatabaseZap,
  LockKeyhole,
  Moon,
  Pencil,
  ShieldCheck,
  Sun,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"

import {
  createUserAction,
  deleteUserAction,
  updateAppearanceAction,
  updateOwnProfileAction,
  updateThemeAction,
  updateUserAction,
  type SettingsActionState,
} from "@/app/configuracoes/actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type UserItem = {
  id: string
  name: string
  email: string
  phone: string
  role: "admin" | "client"
  area: string
  mustChangePassword: boolean
}

type AppearanceSettings = {
  userTheme: "light" | "dark"
  userName: string
  userEmail: string
  userPhone: string
  userArea: string
  userRole: "admin" | "client"
  siteName: string
  siteSubtitle: string
  hasLogo: boolean
  hasFavicon: boolean
  version: string
}

type TeamAccessPanelProps = {
  users: UserItem[]
  currentUserId: string
  isAdmin: boolean
}

const initialState: SettingsActionState = {}

function initials(name: string, email: string) {
  const source = name.trim() || email
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
}

function ActionFeedback({ state }: { state: SettingsActionState }) {
  if (!state.message) return null
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
    >
      {state.message}
    </p>
  )
}

function SubmitButton({ children, variant = "default", name, value, disabled }: {
  children: React.ReactNode
  variant?: "default" | "outline" | "destructive"
  name?: string
  value?: string
  disabled?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant={variant} name={name} value={value} disabled={pending || disabled}>
      {pending ? <LoaderCircle className="animate-spin" /> : null}
      {pending ? "Salvando..." : children}
    </Button>
  )
}

function UserFields({ user }: { user?: UserItem }) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor={user ? `name-${user.id}` : "new-name"}>Nome completo</Label>
        <Input id={user ? `name-${user.id}` : "new-name"} name="name" defaultValue={user?.name} required minLength={2} maxLength={100} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={user ? `email-${user.id}` : "new-email"}>E-mail</Label>
        <Input id={user ? `email-${user.id}` : "new-email"} name="email" type="email" defaultValue={user?.email} required maxLength={254} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={user ? `phone-${user.id}` : "new-phone"}>Celular com DDD</Label>
        <Input id={user ? `phone-${user.id}` : "new-phone"} name="phone" type="tel" inputMode="tel" defaultValue={user?.phone} required minLength={10} maxLength={20} placeholder="11999999999" />
        {!user ? <p className="text-xs text-muted-foreground">O número será a chave do primeiro acesso, junto com o e-mail.</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={user ? `role-${user.id}` : "new-role"}>Perfil</Label>
          <Select name="role" defaultValue={user?.role ?? "client"}>
            <SelectTrigger id={user ? `role-${user.id}` : "new-role"}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="client">Cliente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={user ? `area-${user.id}` : "new-area"}>Área</Label>
          <Input id={user ? `area-${user.id}` : "new-area"} name="area" defaultValue={user?.area} required maxLength={100} />
        </div>
      </div>
    </>
  )
}

function CreateUserForm() {
  const [state, action] = useActionState(createUserAction, initialState)
  return (
    <form action={action} className="grid gap-5">
      <UserFields />
      <ActionFeedback state={state} />
      <div><SubmitButton>Cadastrar usuário</SubmitButton></div>
    </form>
  )
}

function ProfileForm({ settings }: { settings: AppearanceSettings }) {
  const [state, action] = useActionState(updateOwnProfileAction, initialState)
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-2"><Label htmlFor="profile-name">Nome completo</Label><Input id="profile-name" name="name" defaultValue={settings.userName} required minLength={2} maxLength={100} /></div>
      <div className="grid gap-2"><Label htmlFor="profile-email">E-mail</Label><Input id="profile-email" name="email" type="email" defaultValue={settings.userEmail} required maxLength={254} /></div>
      <div className="grid gap-2"><Label htmlFor="profile-phone">Celular com DDD</Label><Input id="profile-phone" name="phone" type="tel" inputMode="tel" defaultValue={settings.userPhone} required minLength={10} maxLength={20} placeholder="11999999999" /></div>
      <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 text-sm"><p><span className="text-muted-foreground">Perfil:</span> {settings.userRole === "admin" ? "Administrador" : "Cliente"}</p><p><span className="text-muted-foreground">Área:</span> {settings.userArea || "Não informada"}</p></div>
      <ActionFeedback state={state} />
      <div><SubmitButton>Salvar minhas informações</SubmitButton></div>
    </form>
  )
}

function EditUserSheet({ user, currentUserId }: { user: UserItem; currentUserId: string }) {
  const update = updateUserAction.bind(null, user.id)
  const remove = deleteUserAction.bind(null, user.id)
  const [updateState, updateAction] = useActionState(update, initialState)
  const [deleteState, deleteAction] = useActionState(remove, initialState)

  return (
    <Sheet>
      <SheetTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Editar ${user.name || user.email}`}><Pencil /></Button></SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Editar usuário</SheetTitle>
          <SheetDescription>Atualize os dados e o nível de acesso ao workspace.</SheetDescription>
        </SheetHeader>
        <form action={updateAction} className="grid gap-5 px-6">
          <UserFields user={user} />
          <ActionFeedback state={updateState} />
          <div><SubmitButton>Salvar alterações</SubmitButton></div>
        </form>
        <SheetFooter className="mt-8 border-t">
          <div className="space-y-1">
            <p className="font-medium">Excluir acesso</p>
            <p className="text-xs text-muted-foreground">Remove definitivamente este usuário do workspace.</p>
          </div>
          <form action={deleteAction}>
            <SubmitButton variant="destructive" value="delete" disabled={user.id === currentUserId}><Trash2 />Excluir usuário</SubmitButton>
          </form>
          {user.id === currentUserId ? <p className="text-xs text-muted-foreground">Seu próprio acesso não pode ser excluído.</p> : null}
          <ActionFeedback state={deleteState} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function AppearanceForm({ settings }: { settings: AppearanceSettings }) {
  const [state, action] = useActionState(updateAppearanceAction, initialState)
  const version = encodeURIComponent(settings.version)
  return (
    <form action={action} className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="site-name">Nome do site</Label>
          <Input id="site-name" name="siteName" defaultValue={settings.siteName} required minLength={2} maxLength={80} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="site-subtitle">Subtítulo</Label>
          <Input id="site-subtitle" name="siteSubtitle" defaultValue={settings.siteSubtitle} required minLength={2} maxLength={120} />
        </div>
      </div>

      <div className="grid gap-3">
        <Label htmlFor="logo">Logo</Label>
        {settings.hasLogo ? (
          <div className="flex items-center gap-4 rounded-xl border p-3">
            <Image src={`/api/branding/logo?v=${version}`} alt="Logo atual" width={160} height={48} unoptimized className="h-12 w-auto max-w-40 object-contain" />
            <Button type="submit" name="intent" value="remove-logo" variant="outline" size="sm"><Trash2 />Remover</Button>
          </div>
        ) : null}
        <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" />
        <p className="text-xs text-muted-foreground">PNG, JPG, WebP ou SVG de até 750 KB.</p>
      </div>

      <div className="grid gap-3">
        <Label htmlFor="favicon">Favicon</Label>
        {settings.hasFavicon ? (
          <div className="flex items-center gap-4 rounded-xl border p-3">
            <Image src={`/api/branding/favicon?v=${version}`} alt="Favicon atual" width={32} height={32} unoptimized className="size-8 object-contain" />
            <Button type="submit" name="intent" value="remove-favicon" variant="outline" size="sm"><Trash2 />Remover</Button>
          </div>
        ) : null}
        <Input id="favicon" name="favicon" type="file" accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml" />
        <p className="text-xs text-muted-foreground">Prefira uma imagem quadrada em PNG, SVG ou ICO.</p>
      </div>

      <ActionFeedback state={state} />
      <div><SubmitButton>Salvar aparência</SubmitButton></div>
    </form>
  )
}

function ThemeForm({ theme }: { theme: "light" | "dark" }) {
  const [state, action] = useActionState(updateThemeAction, initialState)
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="theme">Esquema de cores</Label>
        <Select name="theme" defaultValue={theme}>
          <SelectTrigger id="theme" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="light"><Sun />Claro</SelectItem>
            <SelectItem value="dark"><Moon />Escuro</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Esta escolha vale somente para a sua conta.</p>
      </div>
      <ActionFeedback state={state} />
      <div><SubmitButton>Salvar meu tema</SubmitButton></div>
    </form>
  )
}

export function TeamAccessPanel({ users, currentUserId, isAdmin }: TeamAccessPanelProps) {
  const admins = users.filter((user) => user.role === "admin").length
  const clients = users.length - admins

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Badge variant="secondary" className="mb-3"><Users />Workspace</Badge>
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Equipe e acessos</h1>
        <p className="mt-1 text-muted-foreground">Gerencie os usuários e os níveis de acesso ao workspace.</p>
      </div>

      {!isAdmin ? (
        <Card size="sm"><CardHeader><CardTitle className="flex items-center gap-2"><LockKeyhole className="size-4" />Acesso somente leitura</CardTitle><CardDescription>Clientes podem consultar estas informações. Alterações são reservadas aos administradores.</CardDescription></CardHeader></Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        {[["Usuários", users.length], ["Administradores", admins], ["Clientes", clients]].map(([label, value]) => (
          <Card key={String(label)} size="sm"><CardHeader><CardDescription>{label}</CardDescription><CardTitle className="font-sans text-2xl font-semibold">{value}</CardTitle></CardHeader></Card>
        ))}
      </section>

      <div className={isAdmin ? "grid gap-6 xl:grid-cols-[0.78fr_1.5fr]" : "grid gap-6"}>
        {isAdmin ? (
          <Card>
            <CardHeader><CardTitle>Novo usuário</CardTitle><CardDescription>Cadastre uma pessoa e defina suas permissões.</CardDescription><CardAction><UserPlus className="size-5 text-primary" /></CardAction></CardHeader>
            <CardContent><CreateUserForm /></CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader><CardTitle>Usuários cadastrados</CardTitle><CardDescription>Equipe e permissões atuais da plataforma.</CardDescription><CardAction><Badge variant="outline">{users.length} registros</Badge></CardAction></CardHeader>
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader><TableRow><TableHead className="pl-6">Pessoa</TableHead><TableHead>Área</TableHead><TableHead>Acesso</TableHead>{isAdmin ? <TableHead className="pr-6 text-right">Ações</TableHead> : null}</TableRow></TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="pl-6"><div className="flex items-center gap-3"><Avatar><AvatarFallback>{initials(user.name, user.email)}</AvatarFallback></Avatar><div><p className="font-medium">{user.name || "Sem nome"}</p><p className="text-xs text-muted-foreground">{user.email}{user.phone ? ` · ${user.phone}` : ""}{user.mustChangePassword ? " · primeiro acesso pendente" : ""}</p></div></div></TableCell>
                    <TableCell className="text-muted-foreground">{user.area || "—"}</TableCell>
                    <TableCell><Badge variant={user.role === "admin" ? "default" : "outline"}>{user.role === "admin" ? "Administrador" : "Cliente"}</Badge></TableCell>
                    {isAdmin ? <TableCell className="pr-6 text-right"><EditUserSheet user={user} currentUserId={currentUserId} /></TableCell> : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function AppearanceSettingsPanel({ isAdmin, settings }: { isAdmin: boolean; settings: AppearanceSettings }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Badge variant="secondary" className="mb-3"><ShieldCheck />Administração</Badge>
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Configurações</h1>
        <p className="mt-1 text-muted-foreground">Defina a identidade visual e o esquema de cores da aplicação.</p>
      </div>

      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Minhas informações</CardTitle><CardDescription>Dados da sua própria conta.</CardDescription></CardHeader>
          <CardContent><ProfileForm settings={settings} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Meu tema</CardTitle><CardDescription>Escolha como a aplicação aparece para você.</CardDescription></CardHeader>
          <CardContent><ThemeForm theme={settings.userTheme} /></CardContent>
        </Card>

        {isAdmin ? (
          <Card>
            <CardHeader><CardTitle>Identidade visual</CardTitle><CardDescription>Defina nome, subtítulo, logo e favicon compartilhados pela aplicação.</CardDescription></CardHeader>
            <CardContent><AppearanceForm settings={settings} /></CardContent>
          </Card>
        ) : null}
        {isAdmin ? (
          <Card>
            <CardHeader><CardTitle>Diagnóstico</CardTitle><CardDescription>Consulte o ambiente de execução e a conexão com o banco de dados.</CardDescription><CardAction><DatabaseZap className="size-5 text-primary" /></CardAction></CardHeader>
            <CardContent><Button asChild variant="outline"><Link href="/configuracoes/diagnostico"><DatabaseZap />Abrir diagnóstico</Link></Button></CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
