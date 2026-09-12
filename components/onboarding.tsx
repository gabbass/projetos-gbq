"use client"

import { useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"

import { completeOnboardingAction } from "@/app/auth-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type StepId = "overview" | "projects" | "tracking" | "security"

const stepIds: StepId[] = ["overview", "projects", "tracking", "security"]
const stepLabels = ["Visão geral", "Projetos", "Acompanhamento", "Segurança"]

export function Onboarding({
  firstName,
  role,
  siteName,
  hasError,
}: {
  firstName: string
  role: "admin" | "client"
  siteName: string
  hasError: boolean
}) {
  const [step, setStep] = useState<StepId>("overview")
  const currentIndex = stepIds.indexOf(step)
  const isFirst = currentIndex === 0
  const isLast = currentIndex === stepIds.length - 1

  function move(direction: -1 | 1) {
    const nextStep = stepIds[currentIndex + direction]
    if (nextStep) setStep(nextStep)
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="size-4" />
              Primeiro acesso
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Boas-vindas, {firstName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Conheça o {siteName} antes de começar.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit">
            Etapa {currentIndex + 1} de {stepIds.length}
          </Badge>
        </div>

        <Progress value={((currentIndex + 1) / stepIds.length) * 100} aria-label={`Etapa ${currentIndex + 1} de ${stepIds.length}`} />

        <Card className="overflow-hidden py-0">
          <Tabs value={step} onValueChange={(value) => setStep(value as StepId)} className="gap-0">
            <div className="border-b bg-muted/30 p-3 sm:p-4">
              <TabsList className="grid h-auto w-full grid-cols-4">
                {stepIds.map((item, index) => (
                  <TabsTrigger key={item} value={item} aria-label={stepLabels[index]} className="h-9 px-2">
                    <span className="sm:hidden">{index + 1}</span>
                    <span className="hidden sm:inline">{stepLabels[index]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="overview" className="m-0">
              <OnboardingStep
                icon={LayoutDashboard}
                eyebrow="Seu ponto de partida"
                title="Visão geral do trabalho"
                description={role === "admin"
                  ? "Ao entrar, você verá o quadro geral dos projetos e poderá acompanhar o fluxo das tarefas da equipe."
                  : "Ao entrar, você verá os projetos vinculados à sua conta e o andamento das tarefas que fazem parte deles."}
                items={[
                  [ListChecks, "Quadro de tarefas", "Visualize atividades por etapa e acompanhe o que está em andamento."],
                  [CheckCircle2, "Prioridades claras", "Identifique rapidamente prazos, responsáveis e próximos passos."],
                ]}
              />
            </TabsContent>

            <TabsContent value="projects" className="m-0">
              <OnboardingStep
                icon={FolderKanban}
                eyebrow="Organização centralizada"
                title="Projetos e tarefas em um só lugar"
                description={role === "admin"
                  ? "Na área Projetos, você cria e organiza iniciativas, define clientes, responsáveis, prazos e prioridades."
                  : "Na área Projetos, você consulta os detalhes, objetivos e tarefas das iniciativas compartilhadas com você."}
                items={[
                  [FolderKanban, "Portfólio organizado", "Consulte cada projeto com contexto, objetivo e informações essenciais."],
                  [ListChecks, role === "admin" ? "Gestão das entregas" : "Acompanhamento das entregas", role === "admin" ? "Crie tarefas e mantenha o andamento atualizado." : "Acompanhe o status e os responsáveis por cada atividade."],
                ]}
              />
            </TabsContent>

            <TabsContent value="tracking" className="m-0">
              <OnboardingStep
                icon={role === "admin" ? ChartNoAxesColumnIncreasing : CheckCircle2}
                eyebrow={role === "admin" ? "Gestão e acompanhamento" : "Transparência no andamento"}
                title={role === "admin" ? "Progresso e equipe" : "Acompanhe o que está acontecendo"}
                description={role === "admin"
                  ? "Os painéis de Progresso e Equipe e acessos ajudam a acompanhar resultados e administrar quem participa do workspace."
                  : "Os status das tarefas mostram o que está por fazer, em andamento, aguardando ou concluído dentro dos seus projetos."}
                items={role === "admin" ? [
                  [ChartNoAxesColumnIncreasing, "Indicadores de progresso", "Veja a evolução do portfólio e pontos que precisam de atenção."],
                  [Users, "Equipe e acessos", "Cadastre usuários e mantenha papéis e áreas organizados."],
                ] : [
                  [CheckCircle2, "Status visíveis", "Entenda em que etapa cada atividade está sem perder o contexto."],
                  [Users, "Responsáveis identificados", "Saiba quem conduz cada projeto e tarefa."],
                ]}
              />
            </TabsContent>

            <TabsContent value="security" className="m-0">
              <OnboardingStep
                icon={ShieldCheck}
                eyebrow="Sua conta"
                title="Perfil, preferências e segurança"
                description="Em Configurações, você pode atualizar seus dados e escolher o tema da interface. Seu acesso é individual e deve permanecer protegido."
                items={[
                  [Settings, "Preferências pessoais", "Ajuste seus dados de perfil e a aparência do sistema."],
                  [ShieldCheck, "Acesso seguro", "Não compartilhe sua senha e encerre a sessão em dispositivos compartilhados."],
                ]}
              />
            </TabsContent>

            <div className="flex flex-col gap-3 border-t bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                {hasError ? (
                  <p role="alert" className="text-sm text-destructive">Não foi possível concluir. Tente novamente.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Você poderá explorar tudo novamente no menu lateral.</p>
                )}
              </div>
              <div className="flex gap-2 sm:justify-end">
                <Button type="button" variant="outline" onClick={() => move(-1)} disabled={isFirst}>
                  <ArrowLeft />
                  Voltar
                </Button>
                {isLast ? (
                  <form action={completeOnboardingAction} className="flex-1 sm:flex-none">
                    <Button type="submit" className="w-full">
                      Entrar no sistema
                      <ArrowRight />
                    </Button>
                  </form>
                ) : (
                  <Button type="button" className="flex-1 sm:flex-none" onClick={() => move(1)}>
                    Continuar
                    <ArrowRight />
                  </Button>
                )}
              </div>
            </div>
          </Tabs>
        </Card>
      </div>
    </main>
  )
}

function OnboardingStep({
  icon: Icon,
  eyebrow,
  title,
  description,
  items,
}: {
  icon: typeof LayoutDashboard
  eyebrow: string
  title: string
  description: string
  items: Array<[typeof LayoutDashboard, string, string]>
}) {
  return (
    <div className="grid min-h-[25rem] md:grid-cols-[0.82fr_1.18fr]">
      <div className="flex min-h-52 items-center justify-center bg-primary p-8 text-primary-foreground md:min-h-full">
        <div className="text-center">
          <span className="mx-auto mb-5 flex size-20 items-center justify-center rounded-3xl bg-white/15 ring-1 ring-white/25">
            <Icon className="size-10" />
          </span>
          <p className="text-sm font-medium text-primary-foreground/70">{eyebrow}</p>
        </div>
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-8">
        <CardHeader className="p-0">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-sm leading-6">{description}</CardDescription>
        </CardHeader>
        <CardContent className="mt-7 grid gap-5 p-0">
          {items.map(([ItemIcon, itemTitle, itemDescription]) => (
            <div key={itemTitle} className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ItemIcon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{itemTitle}</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{itemDescription}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </div>
    </div>
  )
}
