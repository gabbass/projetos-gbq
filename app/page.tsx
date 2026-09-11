import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleGauge,
  Clock3,
  MoreHorizontal,
  TrendingUp,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const columns = [
  {
    title: "Backlog",
    count: 2,
    badge: "secondary" as const,
    cards: [
      { title: "Portal do cliente", owner: "Ana", initials: "AB", priority: "Alta", date: "18 set" },
      { title: "Integração com financeiro", owner: "Rafael", initials: "RL", priority: "Média", date: "24 set" },
    ],
  },
  {
    title: "Em andamento",
    count: 2,
    badge: "default" as const,
    cards: [
      { title: "Aplicativo mobile", owner: "Maya", initials: "MS", priority: "Alta", date: "20 set" },
      { title: "Dashboard executivo", owner: "João", initials: "JP", priority: "Baixa", date: "02 out" },
    ],
  },
  {
    title: "Concluído",
    count: 1,
    badge: "outline" as const,
    cards: [
      { title: "Onboarding de fornecedores", owner: "Lina", initials: "LS", priority: "Média", date: "09 set" },
    ],
  },
]

const metrics = [
  { title: "Progresso geral", value: "68%", note: "+6% no período", progress: 68, icon: CircleGauge },
  { title: "Entregas no prazo", value: "21 de 24", note: "87,5% de previsibilidade", progress: 88, icon: CheckCircle2 },
  { title: "Pontos de atenção", value: "3", note: "1 item crítico", progress: 25, icon: AlertTriangle, warning: true },
]

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            Quarta-feira, 10 de setembro
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Visão geral</h1>
          <p className="mt-1 text-muted-foreground">Acompanhe o ritmo da operação e aja onde importa.</p>
        </div>
        <Tabs defaultValue="semana">
          <TabsList>
            <TabsTrigger value="semana">Esta semana</TabsTrigger>
            <TabsTrigger value="mes">Este mês</TabsTrigger>
            <TabsTrigger value="trimestre">Trimestre</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.title} size="sm">
            <CardHeader>
              <CardDescription>{metric.title}</CardDescription>
              <CardAction>
                <div className={`flex size-9 items-center justify-center rounded-xl ${metric.warning ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                  <metric.icon className="size-4" />
                </div>
              </CardAction>
              <CardTitle className="font-sans text-2xl font-semibold tabular-nums">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={metric.progress} className={metric.warning ? "h-1.5 [&_[data-slot=progress-indicator]]:bg-destructive" : "h-1.5"} />
              <p className="text-xs text-muted-foreground">{metric.note}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Quadro de projetos</CardTitle>
          <CardDescription>Prioridades, responsáveis e andamento das principais frentes</CardDescription>
          <CardAction>
            <Button variant="outline" size="sm">Ver portfólio<ArrowUpRight /></Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 xl:grid-cols-3">
            {columns.map((column) => (
              <Card key={column.title} size="sm" className="bg-muted/30">
                <CardHeader>
                  <CardTitle>{column.title}</CardTitle>
                  <CardAction><Badge variant={column.badge}>{column.count} itens</Badge></CardAction>
                </CardHeader>
                <CardContent className="space-y-3">
                  {column.cards.map((card) => (
                    <Card key={card.title} size="sm" className="bg-background">
                      <CardHeader>
                        <CardTitle className="pr-6 text-sm">{card.title}</CardTitle>
                        <CardAction>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Ações de ${card.title}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end"><DropdownMenuLabel>Ações</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem>Abrir projeto</DropdownMenuItem><DropdownMenuItem>Editar tarefa</DropdownMenuItem><DropdownMenuItem>Mover etapa</DropdownMenuItem></DropdownMenuContent>
                          </DropdownMenu>
                        </CardAction>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7"><AvatarFallback className="text-[10px]">{card.initials}</AvatarFallback></Avatar>
                            <span className="text-sm text-muted-foreground">{card.owner}</span>
                          </div>
                          <Badge variant={card.priority === "Alta" ? "destructive" : "outline"}>{card.priority}</Badge>
                        </div>
                        <Separator />
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3.5" />Entrega em {card.date}</p>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saúde do portfólio</CardTitle>
          <CardDescription>Distribuição dos 12 projetos ativos</CardDescription>
          <CardAction><Badge variant="outline"><TrendingUp />+4,2%</Badge></CardAction>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-3">
          <Health label="No prazo" value={8} total={12} color="[&_[data-slot=progress-indicator]]:bg-emerald-500" />
          <Health label="Em atenção" value={3} total={12} color="[&_[data-slot=progress-indicator]]:bg-amber-500" />
          <Health label="Em risco" value={1} total={12} color="[&_[data-slot=progress-indicator]]:bg-rose-500" />
        </CardContent>
      </Card>
    </div>
  )
}

function Health({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between"><span className="font-medium">{label}</span><span className="text-sm text-muted-foreground">{value} projetos</span></div>
      <Progress value={(value / total) * 100} className={`h-2 ${color}`} />
    </div>
  )
}
