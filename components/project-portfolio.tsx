"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { CalendarDays, FolderPlus, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react"

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
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { Project } from "@/lib/projects/database"

const initialState: ProjectActionState = {}
const priorityLabel = { high: "Alta", medium: "Média", low: "Baixa" }

function Feedback({ state }: { state: ProjectActionState }) {
  return state.message ? <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-600"}>{state.message}</p> : null
}

function Submit({ children, destructive = false }: { children: React.ReactNode; destructive?: boolean }) {
  const { pending } = useFormStatus()
  return <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : null}{pending ? "Salvando..." : children}</Button>
}

function ProjectFields({ project }: { project?: Project }) {
  const suffix = project?.id ?? "new"
  return <>
    <div className="grid gap-2"><Label htmlFor={`project-name-${suffix}`}>Nome do projeto</Label><Input id={`project-name-${suffix}`} name="name" defaultValue={project?.name} required minLength={2} maxLength={120} /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2"><Label htmlFor={`project-area-${suffix}`}>Área responsável</Label><Input id={`project-area-${suffix}`} name="area" defaultValue={project?.area} required maxLength={100} /></div>
      <div className="grid gap-2"><Label htmlFor={`project-owner-${suffix}`}>Responsável</Label><Input id={`project-owner-${suffix}`} name="owner" defaultValue={project?.owner} required maxLength={100} /></div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2"><Label htmlFor={`project-priority-${suffix}`}>Prioridade</Label><Select name="priority" defaultValue={project?.priority ?? "medium"}><SelectTrigger id={`project-priority-${suffix}`} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">Alta</SelectItem><SelectItem value="medium">Média</SelectItem><SelectItem value="low">Baixa</SelectItem></SelectContent></Select></div>
      <div className="grid gap-2"><Label htmlFor={`project-date-${suffix}`}>Prazo previsto</Label><div className="relative"><CalendarDays className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input id={`project-date-${suffix}`} name="deadline" type="date" className="pl-9" defaultValue={project?.deadline ?? ""} /></div></div>
    </div>
    <div className="grid gap-2"><Label htmlFor={`project-objective-${suffix}`}>Objetivo</Label><Textarea id={`project-objective-${suffix}`} name="objective" className="min-h-28" defaultValue={project?.objective} maxLength={1500} /></div>
  </>
}

function NewProjectSheet() {
  const [state, action] = useActionState(createProjectAction, initialState)
  return <Sheet>
    <SheetTrigger asChild><Button><Plus />Novo projeto</Button></SheetTrigger>
    <SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>Novo projeto</SheetTitle><SheetDescription>Cadastre a iniciativa. O progresso será calculado pelas tarefas concluídas.</SheetDescription></SheetHeader><form action={action} className="grid gap-5 px-6"><ProjectFields /><Feedback state={state} /><div><Submit>Salvar projeto</Submit></div></form></SheetContent>
  </Sheet>
}

function EditProjectSheet({ project }: { project: Project }) {
  const [updateState, updateAction] = useActionState(updateProjectAction.bind(null, project.id), initialState)
  const [deleteState, deleteAction] = useActionState(deleteProjectAction.bind(null, project.id), initialState)
  return <Sheet>
    <SheetTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Editar ${project.name}`}><Pencil /></Button></SheetTrigger>
    <SheetContent className="overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>Editar projeto</SheetTitle><SheetDescription>Atualize os dados gerais sem alterar o progresso calculado.</SheetDescription></SheetHeader><form action={updateAction} className="grid gap-5 px-6"><ProjectFields project={project} /><Feedback state={updateState} /><div><Submit>Salvar alterações</Submit></div></form><SheetFooter className="mt-8 border-t"><div><p className="font-medium">Excluir projeto</p><p className="text-xs text-muted-foreground">Também remove definitivamente todas as tarefas vinculadas.</p></div><form action={deleteAction}><Submit destructive><Trash2 />Excluir projeto</Submit></form><Feedback state={deleteState} /></SheetFooter></SheetContent>
  </Sheet>
}

export function ProjectPortfolio({ projects }: { projects: Project[] }) {
  return <div className="flex flex-col gap-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Badge variant="secondary" className="mb-3"><FolderPlus />Portfólio</Badge><h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Projetos</h1><p className="mt-1 text-muted-foreground">Cadastre, edite e organize as iniciativas do workspace.</p></div><NewProjectSheet /></div>
    <Card><CardHeader><CardTitle>Projetos cadastrados</CardTitle><CardDescription>O avanço de cada projeto é a proporção de tarefas concluídas.</CardDescription><CardAction><Badge variant="outline">{projects.length} {projects.length === 1 ? "registro" : "registros"}</Badge></CardAction></CardHeader><CardContent className="overflow-x-auto px-0">
      {projects.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center"><span className="flex size-12 items-center justify-center rounded-2xl bg-muted"><FolderPlus className="size-5 text-muted-foreground" /></span><div><p className="font-medium">Nenhum projeto cadastrado</p><p className="text-sm text-muted-foreground">Crie o primeiro projeto para começar a organizar as tarefas.</p></div></div> : <Table><TableHeader><TableRow><TableHead className="pl-6">Projeto</TableHead><TableHead>Responsável</TableHead><TableHead>Tarefas</TableHead><TableHead>Progresso</TableHead><TableHead>Prioridade</TableHead><TableHead className="pr-6 text-right">Ações</TableHead></TableRow></TableHeader><TableBody>{projects.map((project) => <TableRow key={project.id}><TableCell className="pl-6"><p className="font-medium">{project.name}</p><p className="text-xs text-muted-foreground">{project.area}{project.deadline ? ` · até ${formatDate(project.deadline)}` : ""}</p></TableCell><TableCell>{project.owner}</TableCell><TableCell className="tabular-nums">{project.completed_count}/{project.task_count}</TableCell><TableCell><div className="flex min-w-36 items-center gap-2"><Progress value={project.progress} className="h-2 [&_[data-slot=progress-indicator]]:bg-emerald-500" /><span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{project.progress}%</span></div></TableCell><TableCell><Badge variant={project.priority === "high" ? "destructive" : "outline"}>{priorityLabel[project.priority]}</Badge></TableCell><TableCell className="pr-6 text-right"><EditProjectSheet project={project} /></TableCell></TableRow>)}</TableBody></Table>}
    </CardContent></Card>
  </div>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
}
