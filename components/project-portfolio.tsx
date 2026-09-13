"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { CalendarDays, Eye, FolderPlus, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react"

import {
  createProjectAction,
  deleteProjectAction,
  updateProjectAction,
  type ProjectActionState,
} from "@/app/project-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ConversationTabs, UnreadBadge } from "@/components/conversation-tabs"
import type { ChatMessage, ChatUnread, Project } from "@/lib/projects/database"

const initialState: ProjectActionState = {}
const priorityLabel = { high: "Alta", medium: "Média", low: "Baixa" }
type UserOption = { id: string; name: string; email: string }

function Feedback({ state }: { state: ProjectActionState }) {
  return state.message ? <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-600"}>{state.message}</p> : null
}

function Submit({ children, destructive = false }: { children: React.ReactNode; destructive?: boolean }) {
  const { pending } = useFormStatus()
  return <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : null}{pending ? "Salvando..." : children}</Button>
}

function ProjectFields({ project, clients, responsibles }: { project?: Project; clients: UserOption[]; responsibles: UserOption[] }) {
  const suffix = project?.id ?? "new"
  return <>
    <div className="grid gap-2"><Label htmlFor={`project-name-${suffix}`}>Nome do projeto</Label><Input id={`project-name-${suffix}`} name="name" defaultValue={project?.name} required minLength={2} maxLength={120} /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2"><Label htmlFor={`project-area-${suffix}`}>Área responsável</Label><Input id={`project-area-${suffix}`} name="area" defaultValue={project?.area} required maxLength={100} /></div>
      <div className="grid gap-2"><Label htmlFor={`project-client-${suffix}`}>Cliente</Label><Select name="clientUserId" defaultValue={project?.client_user_id ?? undefined} required><SelectTrigger id={`project-client-${suffix}`} className="w-full"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger><SelectContent>{clients.map((user) => <SelectItem key={user.id} value={user.id}>{user.name || user.email}</SelectItem>)}</SelectContent></Select></div>
    </div>
    <div className="grid gap-2"><Label htmlFor={`project-responsible-${suffix}`}>Responsável</Label><Select name="responsibleUserId" defaultValue={project?.responsible_user_id ?? undefined} required><SelectTrigger id={`project-responsible-${suffix}`} className="w-full"><SelectValue placeholder="Selecione quem não é cliente" /></SelectTrigger><SelectContent>{responsibles.map((user) => <SelectItem key={user.id} value={user.id}>{user.name || user.email}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Somente usuários que não são clientes podem assumir esta função.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2"><Label htmlFor={`project-priority-${suffix}`}>Prioridade</Label><Select name="priority" defaultValue={project?.priority ?? "medium"}><SelectTrigger id={`project-priority-${suffix}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">Alta</SelectItem><SelectItem value="medium">Média</SelectItem><SelectItem value="low">Baixa</SelectItem></SelectContent></Select></div>
      <div className="grid gap-2"><Label htmlFor={`project-date-${suffix}`}>Prazo previsto</Label><div className="relative"><CalendarDays className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input id={`project-date-${suffix}`} name="deadline" type="date" className="pl-9" defaultValue={project?.deadline ?? ""} /></div></div>
    </div>
    <div className="grid gap-2"><Label htmlFor={`project-objective-${suffix}`}>Objetivo</Label><Textarea id={`project-objective-${suffix}`} name="objective" className="min-h-28" defaultValue={project?.objective} maxLength={1500} /></div>
  </>
}

function NewProjectSheet({ clients, responsibles }: { clients: UserOption[]; responsibles: UserOption[] }) {
  const [state, action] = useActionState(createProjectAction, initialState)
  return <Sheet>
    <SheetTrigger asChild><Button><Plus />Novo projeto</Button></SheetTrigger>
    <SheetContent className="overflow-hidden sm:max-w-xl lg:max-w-2xl"><SheetHeader><SheetTitle>Novo projeto</SheetTitle><SheetDescription>Vincule o cliente e a pessoa responsável pela execução.</SheetDescription></SheetHeader><ScrollArea className="min-h-0 flex-1"><form action={action} className="grid gap-5 px-6 pb-6"><ProjectFields clients={clients} responsibles={responsibles} /><Feedback state={state} /><div><Submit>Salvar projeto</Submit></div></form></ScrollArea></SheetContent>
  </Sheet>
}

function EditProjectSheet({ project, clients, responsibles, messages, unread, currentUserId }: { project: Project; clients: UserOption[]; responsibles: UserOption[]; messages: ChatMessage[]; unread: number; currentUserId: string }) {
  const [updateState, updateAction] = useActionState(updateProjectAction.bind(null, project.id), initialState)
  const [deleteState, deleteAction] = useActionState(deleteProjectAction.bind(null, project.id), initialState)
  return <Sheet>
    <SheetTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Abrir ${project.name}`}><Pencil /></Button></SheetTrigger>
    <SheetContent className="overflow-hidden sm:max-w-3xl lg:max-w-4xl"><SheetHeader><div className="flex items-center gap-2"><SheetTitle>{project.name}</SheetTitle><Badge variant="outline" className="font-mono">#{project.code}</Badge></div><SheetDescription>Edite os dados do projeto ou converse com o cliente.</SheetDescription></SheetHeader><ConversationTabs targetType="project" targetId={project.id} messages={messages} unread={unread} currentUserId={currentUserId} details={<div className="space-y-8"><form action={updateAction} className="grid gap-5"><ProjectFields project={project} clients={clients} responsibles={responsibles} /><Feedback state={updateState} /><div><Submit>Salvar alterações</Submit></div></form><SheetFooter className="border-t px-0"><div><p className="font-medium">Excluir projeto</p><p className="text-xs text-muted-foreground">Também remove definitivamente todas as tarefas vinculadas.</p></div><form action={deleteAction}><Submit destructive><Trash2 />Excluir projeto</Submit></form><Feedback state={deleteState} /></SheetFooter></div>} /></SheetContent>
  </Sheet>
}

function ViewProjectSheet({ project, messages, unread, currentUserId }: { project: Project; messages: ChatMessage[]; unread: number; currentUserId: string }) {
  return <Sheet><SheetTrigger asChild><Button variant="ghost" size="sm"><Eye />Abrir<UnreadBadge count={unread} /></Button></SheetTrigger><SheetContent className="overflow-hidden sm:max-w-3xl lg:max-w-4xl"><SheetHeader><div className="flex items-center gap-2"><SheetTitle>{project.name}</SheetTitle><Badge variant="outline" className="font-mono">#{project.code}</Badge></div><SheetDescription>Os dados são somente para visualização. Você pode interagir pelo chat.</SheetDescription></SheetHeader><ConversationTabs targetType="project" targetId={project.id} messages={messages} unread={unread} currentUserId={currentUserId} details={<ProjectReadOnly project={project} />} /></SheetContent></Sheet>
}

function ProjectReadOnly({ project }: { project: Project }) {
  const items = [
    ["Área", project.area], ["Cliente", project.client_name ?? "Não definido"], ["Responsável", project.responsible_name ?? project.owner],
    ["Prazo", project.deadline ? formatDate(project.deadline) : "Sem prazo"], ["Prioridade", priorityLabel[project.priority]], ["Progresso", `${project.progress}%`],
  ]
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2">{items.map(([label, value]) => <Card size="sm" key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></CardContent></Card>)}</div><Card size="sm"><CardHeader><CardTitle>Objetivo</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm text-muted-foreground">{project.objective || "Nenhum objetivo informado."}</p></CardContent></Card></div>
}

export function ProjectPortfolio({ projects, clients, responsibles, isAdmin, currentUserId, chat }: { projects: Project[]; clients: UserOption[]; responsibles: UserOption[]; isAdmin: boolean; currentUserId: string; chat: { messages: ChatMessage[]; unread: ChatUnread[] } }) {
  return <div className="flex flex-col gap-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Badge variant="secondary" className="mb-3"><FolderPlus />Portfólio</Badge><h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Projetos</h1><p className="mt-1 text-muted-foreground">{isAdmin ? "Cadastre, edite e organize as iniciativas do workspace." : "Acompanhe somente os projetos em que você é o cliente."}</p></div>{isAdmin ? <NewProjectSheet clients={clients} responsibles={responsibles} /> : null}</div>
    <Card><CardHeader><CardTitle>Projetos cadastrados</CardTitle><CardDescription>O avanço de cada projeto é a proporção de tarefas concluídas.</CardDescription><CardAction><Badge variant="outline">{projects.length} {projects.length === 1 ? "registro" : "registros"}</Badge></CardAction></CardHeader><CardContent className="overflow-x-auto px-0">
      {projects.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center"><span className="flex size-12 items-center justify-center rounded-2xl bg-muted"><FolderPlus className="size-5 text-muted-foreground" /></span><div><p className="font-medium">Nenhum projeto disponível</p><p className="text-sm text-muted-foreground">{isAdmin ? "Crie o primeiro projeto para começar a organizar as tarefas." : "Você ainda não foi vinculado como cliente de um projeto."}</p></div></div> : <Table><TableHeader><TableRow><TableHead className="pl-6">Projeto</TableHead>{isAdmin ? <TableHead>Cliente</TableHead> : null}<TableHead>Responsável</TableHead><TableHead>Tarefas</TableHead><TableHead>Progresso</TableHead><TableHead>Prioridade</TableHead><TableHead className="pr-6 text-right">Abrir</TableHead></TableRow></TableHeader><TableBody>{projects.map((project) => { const messages = chat.messages.filter((item) => item.target_type === "project" && item.target_id === project.id); const unread = chat.unread.find((item) => item.target_type === "project" && item.target_id === project.id)?.count ?? 0; return <TableRow key={project.id}><TableCell className="pl-6"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{project.name}</p><Badge variant="outline" className="font-mono text-[10px]">#{project.code}</Badge></div><p className="text-xs text-muted-foreground">{project.area}{project.deadline ? ` · até ${formatDate(project.deadline)}` : ""}</p></TableCell>{isAdmin ? <TableCell>{project.client_name ?? "Não definido"}</TableCell> : null}<TableCell>{project.responsible_name ?? project.owner}</TableCell><TableCell className="tabular-nums">{project.completed_count}/{project.task_count}</TableCell><TableCell><div className="flex min-w-36 items-center gap-2"><Progress value={project.progress} className="h-2 [&_[data-slot=progress-indicator]]:bg-emerald-500" /><span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{project.progress}%</span></div></TableCell><TableCell><Badge variant={project.priority === "high" ? "destructive" : "outline"}>{priorityLabel[project.priority]}</Badge></TableCell><TableCell className="pr-6 text-right">{isAdmin ? <div className="inline-flex items-center gap-2"><UnreadBadge count={unread} /><EditProjectSheet project={project} clients={clients} responsibles={responsibles} messages={messages} unread={unread} currentUserId={currentUserId} /></div> : <ViewProjectSheet project={project} messages={messages} unread={unread} currentUserId={currentUserId} />}</TableCell></TableRow> })}</TableBody></Table>}
    </CardContent></Card>
  </div>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
}
