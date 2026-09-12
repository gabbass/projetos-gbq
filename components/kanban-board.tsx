"use client"

import { useActionState, useCallback, useOptimistic, useState, useSyncExternalStore, useTransition } from "react"
import { useFormStatus } from "react-dom"
import { CalendarDays, CheckCircle2, ChevronRight, CircleDashed, Clock3, Eye, FolderKanban, ListTodo, LoaderCircle, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"

import { createBoardItemAction, createSubtaskAction, createTaskAction, deleteTaskAction, moveTaskAction, updateSubtaskStatusAction, updateTaskAction, type ProjectActionState } from "@/app/project-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { ConversationTabs, UnreadBadge } from "@/components/conversation-tabs"
import type { ChatMessage, ChatUnread, Project, ProjectTask, TaskStatus } from "@/lib/projects/database"

const initialState: ProjectActionState = {}
const columns: Array<{ status: TaskStatus; title: string; dot: string; surface: string }> = [
  { status: "todo", title: "A fazer", dot: "bg-red-500", surface: "border-red-200/80 bg-red-50/60 dark:border-red-950 dark:bg-red-950/20" },
  { status: "in_progress", title: "Em andamento", dot: "bg-amber-500", surface: "border-amber-200/80 bg-amber-50/60 dark:border-amber-950 dark:bg-amber-950/20" },
  { status: "waiting", title: "Aguardando", dot: "bg-blue-500", surface: "border-blue-200/80 bg-blue-50/60 dark:border-blue-950 dark:bg-blue-950/20" },
  { status: "done", title: "Concluído", dot: "bg-emerald-500", surface: "border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-950 dark:bg-emerald-950/20" },
]
const priorityLabel = { high: "Alta", medium: "Média", low: "Baixa" }
const projectFilterChangeEvent = "dashboard-project-filter-change"
const memoryProjectFilters = new Map<string, string>()

function usePersistedProjectFilter(storageKey: string) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("storage", onStoreChange)
    window.addEventListener(projectFilterChangeEvent, onStoreChange)
    return () => {
      window.removeEventListener("storage", onStoreChange)
      window.removeEventListener(projectFilterChangeEvent, onStoreChange)
    }
  }, [])
  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(storageKey) ?? memoryProjectFilters.get(storageKey) ?? ""
    } catch {
      return memoryProjectFilters.get(storageKey) ?? ""
    }
  }, [storageKey])
  const setValue = useCallback((value: string) => {
    memoryProjectFilters.set(storageKey, value)
    try {
      window.localStorage.setItem(storageKey, value)
    } catch {}
    window.dispatchEvent(new Event(projectFilterChangeEvent))
  }, [storageKey])
  return [useSyncExternalStore(subscribe, getSnapshot, () => ""), setValue] as const
}

function Feedback({ state }: { state: ProjectActionState }) {
  return state.message ? <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-600"}>{state.message}</p> : null
}

function Submit({ children, destructive = false }: { children: React.ReactNode; destructive?: boolean }) {
  const { pending } = useFormStatus()
  return <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : null}{pending ? "Salvando..." : children}</Button>
}

function TaskFields({ task, projectId, defaultStatus, lockStatus = false }: { task?: ProjectTask; projectId?: string; defaultStatus?: TaskStatus; lockStatus?: boolean }) {
  const suffix = task?.id ?? "new"
  const status = task?.status ?? defaultStatus ?? "todo"
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
      <div className="grid gap-2"><Label htmlFor={`task-status-${suffix}`}>Status</Label>{lockStatus ? <><input type="hidden" name="status" value={status} /><Select value={status} disabled><SelectTrigger id={`task-status-${suffix}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{columns.map((column) => <SelectItem key={column.status} value={column.status}><span className={`size-2 rounded-full ${column.dot}`} />{column.title}</SelectItem>)}</SelectContent></Select></> : <Select name="status" defaultValue={status}><SelectTrigger id={`task-status-${suffix}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{columns.map((column) => <SelectItem key={column.status} value={column.status}><span className={`size-2 rounded-full ${column.dot}`} />{column.title}</SelectItem>)}</SelectContent></Select>}</div>
    </div>
  </>
}

function NewTaskSheet({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [state, action] = useActionState(createTaskAction, initialState)
  return <Sheet><SheetTrigger asChild><Button><Plus />Nova tarefa</Button></SheetTrigger><SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>Nova tarefa</SheetTitle><SheetDescription>Adicione uma tarefa a {projectName}.</SheetDescription></SheetHeader><form action={action} className="grid gap-5 px-6"><TaskFields projectId={projectId} /><Feedback state={state} /><div><Submit>Salvar tarefa</Submit></div></form></SheetContent></Sheet>
}

function QuickCreateSheet({ project, status, tasks }: { project: Project; status: TaskStatus; tasks: ProjectTask[] }) {
  const [itemType, setItemType] = useState<"task" | "subtask">("task")
  const [state, action] = useActionState(createBoardItemAction.bind(null, status), initialState)
  const column = columns.find((item) => item.status === status)

  return <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon-xs" aria-label={`Criar item em ${column?.title}`}><Plus /></Button></SheetTrigger><SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>Novo item em {column?.title}</SheetTitle><SheetDescription>Crie uma tarefa ou subtarefa em {project.name} já com este status.</SheetDescription></SheetHeader><form action={action} className="grid gap-5 px-6"><div className="grid gap-2"><Label htmlFor={`item-type-${status}`}>Tipo</Label><Select name="itemType" value={itemType} onValueChange={(value) => setItemType(value as "task" | "subtask")}><SelectTrigger id={`item-type-${status}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="task">Tarefa</SelectItem><SelectItem value="subtask">Subtarefa</SelectItem></SelectContent></Select></div>{itemType === "task" ? <TaskFields projectId={project.id} defaultStatus={status} lockStatus /> : <><div className="grid gap-2"><Label htmlFor={`parent-task-${status}`}>Tarefa principal</Label><Select name="parentTaskId" required><SelectTrigger id={`parent-task-${status}`} className="w-full"><SelectValue placeholder="Selecione a tarefa principal" /></SelectTrigger><SelectContent>{tasks.map((task) => <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>)}</SelectContent></Select>{tasks.length === 0 ? <p className="text-xs text-muted-foreground">Crie uma tarefa principal antes de adicionar uma subtarefa.</p> : null}</div><div className="grid gap-2"><Label htmlFor={`subtask-title-${status}`}>Título da subtarefa</Label><Input id={`subtask-title-${status}`} name="subtaskTitle" required minLength={2} maxLength={160} /></div><input type="hidden" name="status" value={status} /></>}<Feedback state={state} /><div><Submit>{itemType === "task" ? "Salvar tarefa" : "Salvar subtarefa"}</Submit></div></form></SheetContent></Sheet>
}

function EditTaskSheet({ task, subtasks, messages, unread, currentUserId }: { task: ProjectTask; subtasks: ProjectTask[]; messages: ChatMessage[]; unread: number; currentUserId: string }) {
  const [state, action] = useActionState(updateTaskAction.bind(null, task.id), initialState)
  const [deleteState, deleteAction] = useActionState(deleteTaskAction.bind(null, task.id), initialState)
  return <Sheet><SheetTrigger asChild><DropdownMenuItem onSelect={(event) => event.preventDefault()}><Pencil />Abrir tarefa{unread > 0 ? <Badge variant="destructive" className="ms-auto">{unread}</Badge> : null}</DropdownMenuItem></SheetTrigger><SheetContent className="overflow-hidden sm:max-w-2xl"><SheetHeader><div className="flex items-center gap-2"><SheetTitle>{task.title}</SheetTitle><Badge variant="outline" className="font-mono">#{task.code}</Badge></div><SheetDescription>Edite a tarefa, organize subtarefas ou converse com o cliente.</SheetDescription></SheetHeader><ConversationTabs targetType="task" targetId={task.id} messages={messages} unread={unread} currentUserId={currentUserId} details={<div className="space-y-8"><form action={action} className="grid gap-5"><TaskFields task={task} /><Feedback state={state} /><div><Submit>Salvar alterações</Submit></div></form><SubtasksPanel parentId={task.id} subtasks={subtasks} canEdit /><SheetFooter className="border-t px-0"><div><p className="font-medium">Excluir tarefa</p><p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita.</p></div><form action={deleteAction}><Submit destructive><Trash2 />Excluir tarefa</Submit></form><Feedback state={deleteState} /></SheetFooter></div>} /></SheetContent></Sheet>
}

function ViewTaskSheet({ task, subtasks, messages, unread, currentUserId }: { task: ProjectTask; subtasks: ProjectTask[]; messages: ChatMessage[]; unread: number; currentUserId: string }) {
  return <Sheet><SheetTrigger asChild><Button variant="outline" size="sm" className="w-full"><Eye />Abrir tarefa<UnreadBadge count={unread} /></Button></SheetTrigger><SheetContent className="overflow-hidden sm:max-w-2xl"><SheetHeader><div className="flex items-center gap-2"><SheetTitle>{task.title}</SheetTitle><Badge variant="outline" className="font-mono">#{task.code}</Badge></div><SheetDescription>Os dados são somente para visualização. Você pode interagir pelo chat.</SheetDescription></SheetHeader><ConversationTabs targetType="task" targetId={task.id} messages={messages} unread={unread} currentUserId={currentUserId} details={<TaskReadOnly task={task} subtasks={subtasks} />} /></SheetContent></Sheet>
}

function TaskReadOnly({ task, subtasks }: { task: ProjectTask; subtasks: ProjectTask[] }) {
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2"><Card size="sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Responsável</p><p className="mt-1 font-medium">{task.owner}</p></CardContent></Card><Card size="sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Prazo</p><p className="mt-1 font-medium">{task.due_date ? formatDate(task.due_date) : "Sem prazo"}</p></CardContent></Card><Card size="sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Prioridade</p><p className="mt-1 font-medium">{priorityLabel[task.priority]}</p></CardContent></Card><Card size="sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Status</p><p className="mt-1 font-medium">{columns.find((column) => column.status === task.status)?.title}</p></CardContent></Card></div><Card size="sm"><CardHeader><CardTitle>Descrição</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm text-muted-foreground">{task.description || "Nenhuma descrição informada."}</p></CardContent></Card><SubtasksPanel parentId={task.id} subtasks={subtasks} canEdit={false} /></div>
}

function SubtasksPanel({ parentId, subtasks, canEdit }: { parentId: string; subtasks: ProjectTask[]; canEdit: boolean }) {
  const [state, action] = useActionState(createSubtaskAction.bind(null, parentId), initialState)
  return <Card size="sm"><CardHeader><CardTitle className="flex items-center gap-2"><ListTodo />Subtarefas</CardTitle><CardAction><Badge variant="outline">{subtasks.filter((item) => item.status === "done").length}/{subtasks.length}</Badge></CardAction></CardHeader><CardContent className="space-y-3">{subtasks.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma subtarefa cadastrada.</p> : subtasks.map((subtask) => <div key={subtask.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3"><CheckCircle2 className={`size-4 ${subtask.status === "done" ? "text-emerald-600" : "text-muted-foreground"}`} /><div className="min-w-0 flex-1"><p className={subtask.status === "done" ? "text-sm line-through text-muted-foreground" : "text-sm font-medium"}>{subtask.title}</p><Badge variant="outline" className="mt-1 font-mono text-[10px]">#{subtask.code}</Badge></div>{canEdit ? <form action={async () => { await updateSubtaskStatusAction(subtask.id, subtask.status === "done" ? "todo" : "done") }}><Button type="submit" variant="outline" size="sm">{subtask.status === "done" ? "Reabrir" : "Concluir"}</Button></form> : <Badge variant={subtask.status === "done" ? "default" : "secondary"}>{subtask.status === "done" ? "Concluída" : "Pendente"}</Badge>}</div>)}{canEdit ? <form action={action} className="flex flex-col gap-2 border-t pt-4 sm:flex-row"><Input name="subtaskTitle" minLength={2} maxLength={160} required placeholder="Nova subtarefa" /><Submit>Adicionar</Submit><Feedback state={state} /></form> : null}</CardContent></Card>
}

function TaskCard({ task, subtasks, dragging, canEdit, messages, unread, currentUserId, onDragStart, onDragEnd }: { task: ProjectTask; subtasks: ProjectTask[]; dragging: boolean; canEdit: boolean; messages: ChatMessage[]; unread: number; currentUserId: string; onDragStart: (task: ProjectTask, event: React.DragEvent) => void; onDragEnd: () => void }) {
  return <Card size="sm" draggable={canEdit} onDragStart={(event) => canEdit && onDragStart(task, event)} onDragEnd={onDragEnd} className={`${canEdit ? "cursor-grab active:cursor-grabbing" : ""} bg-background shadow-sm transition-[opacity,transform,box-shadow] ${dragging ? "scale-[0.98] opacity-40 shadow-none" : "hover:-translate-y-0.5 hover:shadow-md"}`}><CardHeader><div className="flex flex-wrap items-center gap-2"><CardTitle className={canEdit ? "pr-7 text-sm leading-snug" : "text-sm leading-snug"}>{task.title}</CardTitle><Badge variant="outline" className="font-mono text-[10px]">#{task.code}</Badge></div>{canEdit ? <CardAction><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Ações de ${task.title}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuLabel>Ações</DropdownMenuLabel><DropdownMenuSeparator /><EditTaskSheet task={task} subtasks={subtasks} messages={messages} unread={unread} currentUserId={currentUserId} /><DropdownMenuSeparator /><DropdownMenuLabel>Mover para</DropdownMenuLabel>{columns.filter((column) => column.status !== task.status).map((column) => <form action={async () => { await moveTaskAction(task.id, column.status) }} key={column.status}><DropdownMenuItem asChild><button type="submit" className="w-full"><span className={`size-2 rounded-full ${column.dot}`} />{column.title}</button></DropdownMenuItem></form>)}</DropdownMenuContent></DropdownMenu></CardAction> : null}</CardHeader><CardContent className="space-y-3">{task.description ? <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{task.description}</p> : null}<div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium">{task.owner}</span><div className="flex items-center gap-2"><UnreadBadge count={unread} /><Badge variant={task.priority === "high" ? "destructive" : "outline"}>{priorityLabel[task.priority]}</Badge></div></div>{subtasks.length > 0 ? <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ListTodo className="size-3.5" />{subtasks.filter((item) => item.status === "done").length}/{subtasks.length} subtarefas concluídas</p> : null}{task.due_date ? <p className="flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground"><Clock3 className="size-3.5" />{formatDate(task.due_date)}</p> : null}{!canEdit ? <ViewTaskSheet task={task} subtasks={subtasks} messages={messages} unread={unread} currentUserId={currentUserId} /> : null}</CardContent></Card>
}

export function KanbanBoard({ projects, tasks, canEdit, currentUserId, chat }: { projects: Project[]; tasks: ProjectTask[]; canEdit: boolean; currentUserId: string; chat: { messages: ChatMessage[]; unread: ChatUnread[] } }) {
  const [storedProjectId, persistProjectId] = usePersistedProjectFilter(`dashboard-project-filter:${currentUserId}`)
  const selectedId = projects.some((item) => item.id === storedProjectId) ? storedProjectId : projects[0]?.id ?? ""
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null)
  const [moveError, setMoveError] = useState("")
  const [, startMoveTransition] = useTransition()
  const [optimisticTasks, moveOptimisticTask] = useOptimistic(tasks, (currentTasks, change: { taskId: string; status: TaskStatus }) => currentTasks.map((task) => task.id === change.taskId ? { ...task, status: change.status } : task))
  const project = projects.find((item) => item.id === selectedId) ?? projects[0]
  const allProjectTasks = project ? optimisticTasks.filter((task) => task.project_id === project.id) : []
  const projectTasks = allProjectTasks.filter((task) => !task.parent_task_id)
  const completedTasks = allProjectTasks.filter((task) => task.status === "done").length
  const projectProgress = allProjectTasks.length ? Math.round((completedTasks / allProjectTasks.length) * 100) : 0
  function selectProject(projectId: string) {
    persistProjectId(projectId)
  }

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

  return <div className="flex flex-col gap-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" />Tarefas organizadas por etapa</div><h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Visão geral</h1><p className="mt-1 text-muted-foreground">{canEdit ? "Mova as tarefas entre as colunas para atualizar o avanço do projeto." : "Acompanhe as tarefas e o avanço dos seus projetos como cliente."}</p></div>{project ? <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><Label htmlFor="dashboard-project-filter" className="sr-only">Filtrar por projeto</Label><Select value={project.id} onValueChange={selectProject}><SelectTrigger id="dashboard-project-filter" aria-label="Filtrar por projeto" className="w-full sm:w-64"><SelectValue placeholder="Filtrar por projeto" /></SelectTrigger><SelectContent>{projects.map((item) => <SelectItem key={item.id} value={item.id}><FolderKanban />{item.name}</SelectItem>)}</SelectContent></Select>{canEdit ? <NewTaskSheet projectId={project.id} projectName={project.name} /> : null}</div> : null}</div>
    {!project ? <Card><CardContent className="flex min-h-80 flex-col items-center justify-center gap-3 text-center"><span className="flex size-12 items-center justify-center rounded-2xl bg-muted"><CircleDashed className="size-5 text-muted-foreground" /></span><div><p className="font-medium">Nenhum projeto disponível</p><p className="text-sm text-muted-foreground">{canEdit ? "Crie um projeto para começar." : "Você ainda não foi vinculado como cliente de um projeto."}</p></div><Button asChild variant="outline"><a href="/projetos">Ir para Projetos<ChevronRight /></a></Button></CardContent></Card> : <><Card size="sm"><CardHeader><CardDescription>{project.area} · Responsável: {project.responsible_name ?? project.owner}</CardDescription><div className="flex items-center gap-2"><CardTitle>{project.name}</CardTitle><Badge variant="outline" className="font-mono">#{project.code}</Badge></div><CardAction><Badge variant="outline">{completedTasks}/{allProjectTasks.length} itens concluídos · {projectProgress}%</Badge></CardAction></CardHeader></Card>{moveError ? <p role="alert" className="text-sm text-destructive">{moveError}</p> : null}<div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-4">{columns.map((column) => { const items = projectTasks.filter((task) => task.status === column.status); return <Card key={column.status} onDragOver={(event) => { if (canEdit) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropTarget(column.status) } }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null) }} onDrop={(event) => dropTask(column.status, event)} className={`min-h-72 transition-[box-shadow,transform] ${column.surface} ${dropTarget === column.status && draggingId ? "scale-[1.01] ring-2 ring-primary/50 ring-offset-2" : ""}`}><CardHeader><CardTitle className="flex items-center gap-2"><span className={`size-2.5 rounded-full ${column.dot}`} />{column.title}</CardTitle><CardAction><div className="flex items-center gap-1"><Badge variant="outline" className="bg-background/70">{items.length}</Badge>{canEdit ? <QuickCreateSheet project={project} status={column.status} tasks={projectTasks} /> : null}</div></CardAction></CardHeader><CardContent className="space-y-3">{items.length ? items.map((task) => { const messages = chat.messages.filter((message) => message.target_type === "task" && message.target_id === task.id); const unread = chat.unread.find((item) => item.target_type === "task" && item.target_id === task.id)?.count ?? 0; return <TaskCard key={task.id} task={task} subtasks={allProjectTasks.filter((item) => item.parent_task_id === task.id)} canEdit={canEdit} dragging={draggingId === task.id} messages={messages} unread={unread} currentUserId={currentUserId} onDragStart={beginDrag} onDragEnd={() => { setDraggingId(null); setDropTarget(null) }} /> }) : <div className={`flex min-h-32 items-center justify-center rounded-xl border border-dashed bg-background/30 px-4 text-center text-xs text-muted-foreground transition-colors ${dropTarget === column.status && draggingId ? "border-primary bg-primary/5 text-primary" : ""}`}>{draggingId ? "Solte a tarefa aqui" : "Nenhuma tarefa nesta etapa"}</div>}</CardContent></Card> })}</div></>}
  </div>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
}
