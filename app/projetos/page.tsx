"use client"

import type { FormEvent } from "react"
import { CalendarDays, FolderPlus, MoreHorizontal, Plus } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

const projects = [
  { name: "Portal do cliente", sponsor: "Diretoria comercial", owner: "Ana Beatriz", initials: "AB", progress: 62, status: "Em andamento", variant: "default" as const },
  { name: "Aplicativo mobile", sponsor: "Produto", owner: "Maya Silva", initials: "MS", progress: 28, status: "Backlog", variant: "secondary" as const },
  { name: "Onboarding de fornecedores", sponsor: "Operações", owner: "Lina Souza", initials: "LS", progress: 100, status: "Concluído", variant: "outline" as const },
]

export default function ProjectsPage() {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-3"><FolderPlus />Portfólio</Badge>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Projetos</h1>
          <p className="mt-1 text-muted-foreground">Cadastre novas iniciativas e acompanhe a carteira atual.</p>
        </div>
        <Button><Plus />Novo projeto</Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar projeto</CardTitle>
            <CardDescription>Informe os dados essenciais para iniciar o acompanhamento.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="project-name">Nome do projeto</Label>
                <Input id="project-name" defaultValue="Novo portal de parceiros" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-area">Área responsável</Label>
                <Input id="project-area" defaultValue="Transformação digital" />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="project-priority">Prioridade</Label>
                  <Select defaultValue="alta">
                    <SelectTrigger id="project-priority"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent><SelectItem value="alta">Alta</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="baixa">Baixa</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="project-date">Prazo previsto</Label>
                  <div className="relative"><CalendarDays className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="project-date" type="date" className="pl-9" defaultValue="2026-11-30" /></div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-goal">Objetivo</Label>
                <Textarea id="project-goal" className="min-h-28" defaultValue="Centralizar o acompanhamento comercial e reduzir o tempo de resposta ao cliente." />
              </div>
              <Button type="submit" className="justify-self-start">Salvar projeto</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projetos cadastrados</CardTitle>
            <CardDescription>Carteira atual e andamento das iniciativas.</CardDescription>
            <CardAction><Badge variant="outline">{projects.length} registros</Badge></CardAction>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader><TableRow><TableHead className="pl-6">Projeto</TableHead><TableHead>Responsável</TableHead><TableHead>Progresso</TableHead><TableHead>Status</TableHead><TableHead className="pr-6 text-right">Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.name}>
                    <TableCell className="pl-6"><p className="font-medium">{project.name}</p><p className="text-xs text-muted-foreground">{project.sponsor}</p></TableCell>
                    <TableCell><div className="flex items-center gap-2"><Avatar className="size-7"><AvatarFallback className="text-[10px]">{project.initials}</AvatarFallback></Avatar><span className="hidden 2xl:inline">{project.owner}</span></div></TableCell>
                    <TableCell><div className="flex min-w-28 items-center gap-2"><Progress value={project.progress} className="h-1.5" /><span className="text-xs tabular-nums text-muted-foreground">{project.progress}%</span></div></TableCell>
                    <TableCell><Badge variant={project.variant}>{project.status}</Badge></TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Ações de ${project.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem>Abrir projeto</DropdownMenuItem><DropdownMenuItem>Editar</DropdownMenuItem><DropdownMenuItem>Gerar equipe</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                    </TableCell>
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
