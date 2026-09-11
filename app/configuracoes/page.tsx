"use client"

import type { FormEvent } from "react"
import { MoreHorizontal, ShieldCheck, UserPlus } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const users = [
  { name: "Ana Beatriz", initials: "AB", role: "Gestora de projetos", area: "Produto", access: "Administrador", variant: "default" as const },
  { name: "João Pedro", initials: "JP", role: "PMO", area: "Estratégia", access: "Editor", variant: "secondary" as const },
  { name: "Lina Souza", initials: "LS", role: "Analista", area: "Operações", access: "Leitura", variant: "outline" as const },
]

export default function SettingsPage() {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Badge variant="secondary" className="mb-3"><ShieldCheck />Administração</Badge>
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Equipe e acessos</h1>
        <p className="mt-1 text-muted-foreground">Gerencie os membros e os níveis de acesso ao workspace.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {[["Usuários ativos", "27"], ["Administradores", "4"], ["Convites pendentes", "2"]].map(([label, value]) => (
          <Card key={label} size="sm"><CardHeader><CardDescription>{label}</CardDescription><CardTitle className="font-sans text-2xl font-semibold">{value}</CardTitle></CardHeader></Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.5fr]">
        <Card>
          <CardHeader>
            <CardTitle>Novo usuário</CardTitle>
            <CardDescription>Cadastre uma pessoa e defina suas permissões.</CardDescription>
            <CardAction><div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserPlus className="size-4" /></div></CardAction>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <div className="grid gap-2"><Label htmlFor="user-name">Nome completo</Label><Input id="user-name" defaultValue="Marina Costa" /></div>
              <div className="grid gap-2"><Label htmlFor="user-email">E-mail</Label><Input id="user-email" type="email" defaultValue="marina@empresa.com" /></div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2"><Label htmlFor="user-profile">Perfil</Label><Select defaultValue="admin"><SelectTrigger id="user-profile"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Administrador</SelectItem><SelectItem value="editor">Editor</SelectItem><SelectItem value="reader">Leitura</SelectItem></SelectContent></Select></div>
                <div className="grid gap-2"><Label htmlFor="user-area">Área</Label><Input id="user-area" defaultValue="Tecnologia" /></div>
              </div>
              <Button type="submit" className="justify-self-start">Cadastrar usuário</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuários ativos</CardTitle>
            <CardDescription>Permissões atuais da plataforma.</CardDescription>
            <CardAction><Badge variant="outline">{users.length} exibidos</Badge></CardAction>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader><TableRow><TableHead className="pl-6">Pessoa</TableHead><TableHead>Área</TableHead><TableHead>Acesso</TableHead><TableHead className="pr-6 text-right">Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.name}>
                    <TableCell className="pl-6"><div className="flex items-center gap-3"><Avatar><AvatarFallback>{user.initials}</AvatarFallback></Avatar><div><p className="font-medium">{user.name}</p><p className="text-xs text-muted-foreground">{user.role}</p></div></div></TableCell>
                    <TableCell className="text-muted-foreground">{user.area}</TableCell>
                    <TableCell><Badge variant={user.variant}>{user.access}</Badge></TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Ações de ${user.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem>Editar acesso</DropdownMenuItem><DropdownMenuItem>Reenviar convite</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive">Desativar usuário</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
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
