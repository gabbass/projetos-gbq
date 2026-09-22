"use client"

import { useActionState, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Settings,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Users,
} from "lucide-react"

import { completeOnboardingAction, type AuthActionState } from "@/app/auth-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LegalDocumentDialog } from "@/components/legal-documents"
import { useErrorFeedback } from "@/hooks/use-action-feedback"
import { LEGAL_VERSION, WHATSAPP_CONSENT_VERSION } from "@/lib/legal"

type StepId = "overview" | "projects" | "tracking" | "security" | "consent"

const stepIds: StepId[] = ["overview", "projects", "tracking", "security", "consent"]
const stepLabels = ["Visão geral", "Projetos", "Acompanhamento", "Segurança", "Aceites"]
const initialState: AuthActionState = {}

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
  const [state, action, pending] = useActionState(completeOnboardingAction, initialState)
  const [openedTerms, setOpenedTerms] = useState(false)
  const [openedSecurityPolicy, setOpenedSecurityPolicy] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedSecurityPolicy, setAcceptedSecurityPolicy] = useState(false)
  const [acceptedWhatsapp, setAcceptedWhatsapp] = useState(false)
  const currentIndex = stepIds.indexOf(step)
  const isFirst = currentIndex === 0
  const isLast = currentIndex === stepIds.length - 1
  useErrorFeedback(hasError ? "Não foi possível concluir. Tente novamente." : undefined)
  useErrorFeedback(state.error)

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
          <form action={action}>
          <Tabs value={step} onValueChange={(value) => setStep(value as StepId)} className="gap-0">
            <div className="border-b bg-muted/30 p-3 sm:p-4">
              <TabsList className="grid h-auto w-full grid-cols-5">
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

            <TabsContent value="consent" className="m-0">
              <ConsentStep
                openedTerms={openedTerms}
                openedSecurityPolicy={openedSecurityPolicy}
                acceptedTerms={acceptedTerms}
                acceptedSecurityPolicy={acceptedSecurityPolicy}
                acceptedWhatsapp={acceptedWhatsapp}
                onOpenTerms={() => setOpenedTerms(true)}
                onOpenSecurityPolicy={() => setOpenedSecurityPolicy(true)}
                onAcceptTerms={setAcceptedTerms}
                onAcceptSecurityPolicy={setAcceptedSecurityPolicy}
                onAcceptWhatsapp={setAcceptedWhatsapp}
              />
            </TabsContent>

            <div className="flex flex-col gap-3 border-t bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-muted-foreground">Você poderá explorar tudo novamente no menu lateral.</p>
              <div className="flex gap-2 sm:justify-end">
                <Button type="button" variant="outline" onClick={() => move(-1)} disabled={isFirst}>
                  <ArrowLeft />
                  Voltar
                </Button>
                {isLast ? (
                  <OnboardingSubmit
                    pending={pending}
                    disabled={!acceptedTerms || !acceptedSecurityPolicy || !acceptedWhatsapp}
                  />
                ) : (
                  <Button type="button" className="flex-1 sm:flex-none" onClick={() => move(1)}>
                    Continuar
                    <ArrowRight />
                  </Button>
                )}
              </div>
            </div>
          </Tabs>
          </form>
        </Card>
      </div>
    </main>
  )
}

function OnboardingSubmit({ pending, disabled }: { pending: boolean; disabled: boolean }) {
  return (
    <Button type="submit" className="flex-1 sm:flex-none" disabled={pending || disabled}>
      {pending ? <Spinner /> : null}
      {pending ? "Entrando..." : "Entrar no sistema"}
      {!pending ? <ArrowRight /> : null}
    </Button>
  )
}

function ConsentStep({
  openedTerms,
  openedSecurityPolicy,
  acceptedTerms,
  acceptedSecurityPolicy,
  acceptedWhatsapp,
  onOpenTerms,
  onOpenSecurityPolicy,
  onAcceptTerms,
  onAcceptSecurityPolicy,
  onAcceptWhatsapp,
}: {
  openedTerms: boolean
  openedSecurityPolicy: boolean
  acceptedTerms: boolean
  acceptedSecurityPolicy: boolean
  acceptedWhatsapp: boolean
  onOpenTerms: () => void
  onOpenSecurityPolicy: () => void
  onAcceptTerms: (accepted: boolean) => void
  onAcceptSecurityPolicy: (accepted: boolean) => void
  onAcceptWhatsapp: (accepted: boolean) => void
}) {
  return (
    <div className="grid min-h-[25rem] md:grid-cols-[0.82fr_1.18fr]">
      <div className="flex min-h-52 items-center justify-center bg-primary p-8 text-primary-foreground md:min-h-full">
        <div className="text-center">
          <span className="mx-auto mb-5 flex size-20 items-center justify-center rounded-3xl bg-white/15 ring-1 ring-white/25">
            <BookOpenCheck className="size-10" />
          </span>
          <p className="text-sm font-medium text-primary-foreground/70">Confirmação final</p>
        </div>
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-8">
        <CardHeader className="p-0">
          <CardTitle className="text-2xl">Termos e comunicações</CardTitle>
          <CardDescription className="text-sm leading-6">
            Leia os documentos e confirme como deseja receber as atualizações operacionais do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-7 grid gap-5 p-0">
          <ConsentCheckbox
            id="accept-terms"
            name="acceptTerms"
            value={LEGAL_VERSION}
            checked={acceptedTerms}
            disabled={!openedTerms}
            onCheckedChange={onAcceptTerms}
            label={
              <span className="flex flex-wrap items-baseline gap-x-1">
                Li e aceito os
                <LegalDocumentDialog
                  document="terms"
                  onOpenChange={(open) => open && onOpenTerms()}
                  trigger={<Button type="button" variant="link" className="h-auto p-0 align-baseline text-sm">Termos de Uso</Button>}
                />
              </span>
            }
            hint={!openedTerms ? "Abra o documento para habilitar este aceite." : undefined}
          />
          <ConsentCheckbox
            id="accept-security-policy"
            name="acceptSecurityPolicy"
            value={LEGAL_VERSION}
            checked={acceptedSecurityPolicy}
            disabled={!openedSecurityPolicy}
            onCheckedChange={onAcceptSecurityPolicy}
            label={
              <span className="flex flex-wrap items-baseline gap-x-1">
                Li e aceito a
                <LegalDocumentDialog
                  document="security"
                  onOpenChange={(open) => open && onOpenSecurityPolicy()}
                  trigger={<Button type="button" variant="link" className="h-auto p-0 align-baseline text-sm">Política de Segurança</Button>}
                />
              </span>
            }
            hint={!openedSecurityPolicy ? "Abra o documento para habilitar este aceite." : undefined}
          />
          <ConsentCheckbox
            id="accept-whatsapp"
            name="acceptWhatsapp"
            value={WHATSAPP_CONSENT_VERSION}
            checked={acceptedWhatsapp}
            onCheckedChange={onAcceptWhatsapp}
            icon={<Smartphone className="size-4" />}
            label="Autorizo o envio de notificações operacionais pelo WhatsApp cadastrado."
            hint="Inclui atualizações de projetos, tarefas, prazos e novas mensagens. O consentimento poderá ser revogado mediante solicitação ao administrador."
          />
        </CardContent>
      </div>
    </div>
  )
}

function ConsentCheckbox({
  id,
  name,
  value,
  checked,
  disabled = false,
  onCheckedChange,
  label,
  hint,
  icon,
}: {
  id: string
  name: string
  value: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (accepted: boolean) => void
  label: React.ReactNode
  hint?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border bg-muted/30 p-4">
      <Checkbox
        id={id}
        name={name}
        value={value}
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next === true)}
        disabled={disabled}
        required
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-0.5"
      />
      <div className="grid gap-1">
        <Label htmlFor={id} className="text-sm leading-5">
          <span className="flex items-start gap-2">{icon}{label}</span>
        </Label>
        {hint ? <p id={`${id}-hint`} className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
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
