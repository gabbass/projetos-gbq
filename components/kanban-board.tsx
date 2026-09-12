"use client"

import { useActionState, useOptimistic, useState, useTransition } from "react"
import { useFormStatus } from "react-dom"
import { CalendarDays, ChevronRight, CircleDashed, Clock3, FolderKanban, LoaderCircle, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"

import { createTaskAction, deleteTaskAction, moveTaskAction, updateTaskAction, type ProjectActionState } from "@/app/project-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { Project, ProjectTask, TaskStatus } from "@/lib/projects/database"

const initialState: ProjectActionState = {}
const columns: Array<{ status: TaskStatus; title: string; dot: string; surface: string }> = [
  { status: "todo", title: "A fazer", dot: "bg-red-500", surface: "border-red-200/80 bg-red-50/60 dark:border-red-950 dark:bg-red-950/20" },
  { status: "in_progress", title: "Em andamento", dot: "bg-amber-500", surface: "border-amber-200/80 bg-amber-50/60 dark:border-amber-950 dark:bg-amber-950/20" },
  { status: "waiting", title: "Aguardando", dot: "bg-blue-500", surface: "border-blue-200/80 bg-blue-50/60 dark:border-blue-950 dark:bg-blue-950/20" },
  { status: "done", title: "Concluído", dot: "bg-emerald-500", surface: "border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-950 dark:bg-emerald-950/20" },
]
const priorityLabel = { high: "Alta", medium: "Média", low: "Baixa" }

function Feedback({ state }: { state: ProjectActionState }) {
  return state.message ? <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-600"}>{state.message}</p> : null
}

function Submit({ children, destructive = false }: { children: React.ReactNode; destructive?: boolean }) {
  const { pending } = useFormStatus()
  return <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : null}{pending ? "Salvando..." : children}</Button>
}

function TaskFields({ task, projectId }: { task?: ProjectTask; projectId?: string }) {
  const suffix = task?.id ?? "new"
  return <>
    {projectId ? <input type="hidden" name="projectId" value={projectId} /> : null}
    <div className="grid gap-2"><Label htmlFor={`task-title-${suffix}`}>Título da tarefa</Label><Input id={`task-title-${suffix}`} name="title" defaultValue={task?.title} required minLength={2} maxLength={160} /></div>
    <div className="grid gap-2"><Label htmlFor={`task-description-${suffix}`}>Descrição</Label><Textarea id={`task-description-${suffix}`} name="description" defaultValue={task?.description} className="min-h-24" maxLength={1500} /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2"><Label htmlFor={`task-owner-${suffix}`}>Responsável</Label><Input id={`task-owner-${suffix}`} name="owner" defaultValue={task?.owner} required maxLength={100} /></div>
      <div className="grid gap-2"><Label htmlFor={`task-date-${suffix}`}>Prazo</Label><Input id={`task-date-${suffix}`} name="dueDate" type="date" defaultValue={task?.due_date ?? ""} /></div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2"><Label htmlFor={`task-priority-${suffix}`}>Prioridade</Label><Select name="priority" defaultValue={task?.priority ?? "medium"}><SelectTrigger id={`task-priority-${suffix}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">Alta</SelectItem><SelectItem value="medium">Média</SelectItem><SelectItem value="low">Baixa</SelectItem></SelectContent></Select></div>
      <div className="grid gap-2"><Label htmlFor={`task-status-${suffix}`}>Status</Label><Select name="status" defaultValue={task?.status ?? "todo"}><SelectTrigger id={`task-status-${suffix}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{columns.map((column) => <SelectItem key={column.status} value={column.status}><span className={`size-2 rounded-full ${column.dot}`} />{column.title}</SelectItem>)}</SelectContent></Select></div>
    </div>
  </>
}

function NewTaskSheet({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [state, action] = useActionState(createTaskAction, initialState)
  return <Sheet><SheetTrigger asChild><Button><Plus />Nova tarefa</Button></SheetTrigger><SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>Nova tarefa</SheetTitle><SheetDescription>Adicione uma tarefa a {projectName}.</SheetDescription></SheetHeader><form action={action} className="grid gap-5 px-6"><TaskFields projectId={projectId} /><Feedback state={state} /><div><Submit>Salvar tarefa</Submit></div></form></SheetContent></Sheet>
}

function EditTaskSheet({ task }: { task: ProjectTask }) {
  const [state, action] = useActionState(updateTaskAction.bind(null, task.id), initialState)
  const [deleteState, deleteAction] = useActionState(deleteTaskAction.bind(null, task.id), initialState)
  return <Sheet><SheetTrigger asChild><DropdownMenuItem onSelect={(event) => event.preventDefault()}><Pencil />Editar tarefa</DropdownMenuItem></SheetTrigger><SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>Editar tarefa</SheetTitle><SheetDescription>Atualize os dados ou altere a coluna desta tarefa.</SheetDescription></SheetHeader><form action={action} className="grid gap-5 px-6"><TaskFields task={task} /><Feedback state={state} /><div><Submit>Salvar alterações</Submit></div></form><SheetFooter className="mt-8 border-t"><div><p className="font-medium">Excluir tarefa</p><p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita.</p></div><form action={deleteAction}><Submit destructive><Trash2 />Excluir tarefa</Submit></form><Feedback state={deleteState} /></SheetFooter></SheetContent></Sheet>
}

function TaskCard({ task, dragging, canEdit, onDragStart, onDragEnd }: { task: ProjectTask; dragging: boolean; canEdit: boolean; onDragStart: (task: ProjectTask, event: React.DragEvent) => void; onDragEnd: () => void }) {
  return <Card size="sm" draggable={canEdit} onDragStart={(event) => canEdit && onDragStart(task, event)} onDragEnd={onDragEnd} className={`${canEdit ? "cursor-grab active:cursor-grabbing" : ""} bg-background shadow-sm transition-[opacity,transform,box-shadow] ${dragging ? "scale-[0.98] opacity-40 shadow-none" : "hover:-translate-y-0.5 hover:shadow-md"}`}><CardHeader><CardTitle className={canEdit ? "pr-7 text-sm leading-snug" : "text-sm leading-snug"}>{task.title}</CardTitle>{canEdit ? <CardAction><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Ações de ${task.title}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Ações</DropdownMenuLabel><DropdownMenuSeparator /><EditTaskSheet task={task} /><DropdownMenuSeparator /><DropdownMenuLabel>Mover para</DropdownMenuLabel>{columns.filter((column) => column.status !== task.status).map((column) => <form action={async () => { await moveTaskAction(task.id, column.status) }} key={column.status}><DropdownMenuItem asChild><button type="submit" className="w-full"><span className={`size-2 rounded-full ${column.dot}`} />{column.title}</button></DropdownMenuItem></form>)}</DropdownMenuContent></DropdownMenu></CardAction> : null}</CardHeader><CardContent className="space-y-3">{task.description ? <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{task.description}</p> : null}<div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium">{task.owner}</span><Badge variant={task.priority === "high" ? "destructive" : "outline"}>{priorityLabel[task.priority]}</Badge></div>{task.due_date ? <p className="flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground"><Clock3 className="size-3.5" />{formatDate(task.due_date)}</p> : null}</CardContent></Card>
}

export function KanbanBoard({ projects, tasks, canEdit }: { projects: Project[]; tasks: ProjectTask[]; canEdit: boolean }) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? "")
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null)
  const [moveError, setMoveError] = useState("")
  const [, startMoveTransition] = useTransition()
  const [optimisticTasks, moveOptimisticTask] = useOptimistic(tasks, (currentTasks, change: { taskId: string; status: TaskStatus }) => currentTasks.map((task) => task.id === change.taskId ? { ...task, status: change.status } : task))
  const project = projects.find((item) => item.id === selectedId) ?? projects[0]
  const projectTasks = project ? optimisticTasks.filter((task) => task.project_id === project.id) : []
  const completedTasks = projectTasks.filter((task) => task.status === "done").length
  const projectProgress = projectTasks.length ? Math.round((completedTasks / projectTasks.length) * 100) : 0

  function beginDrag(task: ProjectTask, event: React.DragEvent) {
    setDraggingId(task.id)
    setMoveError("")
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", task.id)
  }

  function dropTask(status: TaskStatus, event: React.DragEvent) {
    event.preventDefault()
    if (!canEdit) return
    const taskId = event.dataTransfer.getData("text/plain") || draggingId
    const task = optimisticTasks.find((item) => item.id === taskId)
    setDraggingId(null)
    setDropTarget(null)
    if (!task || task.status === status) return
    startMoveTransition(async () => {
      moveOptimisticTask({ taskId: task.id, status })
      const result = await moveTaskAction(task.id, status)
      if (result.status === "error") setMoveError(result.message ?? "Não foi possível mover a tarefa.")
    })
  }

  return <div className="flex flex-col gap-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" />Tarefas organizadas por etapa</div><h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Visão geral</h1><p className="mt-1 text-muted-foreground">{canEdit ? "Mova as tarefas entre as colunas para atualizar o avanço do projeto." : "Acompanhe as tarefas e o avanço dos seus projetos como cliente."}</p></div>{project ? <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><Select value={project.id} onValueChange={setSelectedId}><SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger><SelectContent>{projects.map((item) => <SelectItem key={item.id} value={item.id}><FolderKanban />{item.name}</SelectItem>)}</SelectContent></Select>{canEdit ? <NewTaskSheet projectId={project.id} projectName={project.name} /> : null}</div> : null}</div>
    {!project ? <Card><CardContent className="flex min-h-80 flex-col items-center justify-center gap-3 text-center"><span className="flex size-12 items-center justify-center rounded-2xl bg-muted"><CircleDashed className="size-5 text-muted-foreground" /></span><div><p className="font-medium">Nenhum projeto disponível</p><p className="text-sm text-muted-foreground">{canEdit ? "Crie um projeto para começar." : "Você ainda não foi vinculado como cliente de um projeto."}</p></div><Button asChild variant="outline"><a href="/projetos">Ir para Projetos<ChevronRight /></a></Button></CardContent></Card> : <><Card size="sm"><CardHeader><CardDescription>{project.area} · Responsável: {project.responsible_name ?? project.owner}</CardDescription><CardTitle>{project.name}</CardTitle><CardAction><Badge variant="outline">{completedTasks}/{projectTasks.length} concluídas · {projectProgress}%</Badge></CardAction></CardHeader></Card>{moveError ? <p role="alert" className="text-sm text-destructive">{moveError}</p> : null}<div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-4">{columns.map((column) => { const items = projectTasks.filter((task) => task.status === column.status); return <Card key={column.status} onDragOver={(event) => { if (canEdit) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTarget(column.status) } }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null) }} onDrop={(event) => dropTask(column.status, event)} className={`min-h-72 transition-[box-shadow,transform] ${column.surface} ${dropTarget === column.status && draggingId ? "scale-[1.01] ring-2 ring-primary/50 ring-offset-2" : ""}`}><CardHeader><CardTitle className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${column.dot}`} />{column.title}</CardTitle><CardAction><Badge variant="outline" className="bg-background/70">{items.length}</Badge></CardAction></CardHeader><CardContent className="space-y-3">{items.length ? items.map((task) => <TaskCard key={task.id} task={task} canEdit={canEdit} dragging={draggingId === task.id} onDragStart={beginDrag} onDragEnd={() => { setDraggingId(null); setDropTarget(null) }} />) : <div className={`flex min-h-32 items-center justify-center rounded-xl border border-dashed bg-background/30 px-4 text-center text-xs text-muted-foreground transition-colors ${dropTarget === column.status && draggingId ? "border-primary bg-primary/5 text-primary" : ""}`}>{draggingId ? "Solte a tarefa aqui" : "Nenhuma tarefa nesta etapa"}</div>}</CardContent></Card> })}</div></>}
  </div>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
}
