import { AlertCircle, CheckCircle2, CircleGauge, FolderKanban } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { requireAdministrator } from "@/lib/auth/session"
import { listProjects, listTasks } from "@/lib/projects/database"

export const dynamic = "force-dynamic"
export const metadata = { title: "Progresso" }

export default async function ProgressPage() {
  const user = await requireAdministrator()
  const [projects, tasks] = await Promise.all([listProjects(user), listTasks(user)])
  const completed = tasks.filter((task) => task.status === "done").length
  const waiting = tasks.filter((task) => task.status === "waiting").length
  const overall = tasks.length ? Math.round((completed / tasks.length) * 100) : 0
  const finishedProjects = projects.filter((project) => project.task_count > 0 && project.progress === 100).length

  const metrics = [
    { label: "Progresso geral", value: `${overall}%`, note: `${completed} de ${tasks.length} tarefas concluídas`, icon: CircleGauge, color: "text-primary bg-primary/10" },
    { label: "Projetos concluídos", value: `${finishedProjects}`, note: `de ${projects.length} projetos cadastrados`, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
    { label: "Tarefas aguardando", value: `${waiting}`, note: "itens que dependem de uma ação", icon: AlertCircle, color: "text-blue-600 bg-blue-500/10" },
    { label: "Total de tarefas", value: `${tasks.length}`, note: "em todos os projetos", icon: FolderKanban, color: "text-amber-600 bg-amber-500/10" },
  ]

  return <div className="flex flex-col gap-6">
    <div><Badge variant="secondary" className="mb-3"><CircleGauge />Indicadores</Badge><h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Progresso</h1><p className="mt-1 text-muted-foreground">Acompanhe o avanço real calculado a partir das tarefas concluídas.</p></div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <Card key={metric.label} size="sm"><CardHeader><CardDescription>{metric.label}</CardDescription><CardAction><span className={`flex size-9 items-center justify-center rounded-xl ${metric.color}`}><metric.icon className="size-4" /></span></CardAction><CardTitle className="font-sans text-3xl font-semibold tabular-nums">{metric.value}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{metric.note}</p></CardContent></Card>)}</section>
    <Card><CardHeader><CardTitle>Avanço por projeto</CardTitle><CardDescription>Cada tarefa concluída representa uma parcela igual do progresso do projeto.</CardDescription><CardAction><Badge variant="outline">{projects.length} projetos</Badge></CardAction></CardHeader><CardContent>
      {projects.length === 0 ? <div className="flex min-h-52 items-center justify-center text-center text-sm text-muted-foreground">Cadastre projetos e tarefas para visualizar os indicadores.</div> : <div className="grid gap-4 lg:grid-cols-2">{projects.map((project) => <div key={project.id} className="space-y-3 rounded-2xl border p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-medium">{project.name}</p><p className="text-xs text-muted-foreground">{project.area} · {project.owner}</p></div><Badge variant={project.progress === 100 ? "default" : "outline"}>{project.progress}%</Badge></div><Progress value={project.progress} className="h-2.5 [&_[data-slot=progress-indicator]]:bg-emerald-500" /><div className="flex justify-between text-xs text-muted-foreground"><span>{project.completed_count} concluídas</span><span>{project.task_count - project.completed_count} pendentes</span></div></div>)}</div>}
    </CardContent></Card>
  </div>
}
