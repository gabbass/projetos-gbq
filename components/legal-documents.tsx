"use client"

import type { ReactNode } from "react"
import { Building2, FileText, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { COMPANY, LEGAL_VERSION } from "@/lib/legal"

type LegalDocument = "terms" | "security"

const documents = {
  terms: {
    title: "Termos de Uso",
    description: "Condições para utilização do GBQ Projetos.",
    icon: FileText,
    content: <TermsContent />,
  },
  security: {
    title: "Política de Segurança da Informação",
    description: "Diretrizes de proteção e uso seguro das informações.",
    icon: ShieldCheck,
    content: <SecurityPolicyContent />,
  },
} satisfies Record<LegalDocument, {
  title: string
  description: string
  icon: typeof FileText
  content: ReactNode
}>

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-2 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  )
}

function CompanyIdentification() {
  return (
    <div className="rounded-2xl border bg-muted/40 p-4">
      <div className="mb-3 flex items-center gap-2 text-foreground">
        <Building2 className="size-4 text-primary" />
        <p className="font-heading text-sm font-semibold">Identificação do responsável</p>
      </div>
      <dl className="grid gap-2 text-sm leading-5 text-muted-foreground sm:grid-cols-[9rem_1fr]">
        <dt className="font-medium text-foreground">Nome fantasia</dt>
        <dd>{COMPANY.tradeName}</dd>
        <dt className="font-medium text-foreground">Nome empresarial</dt>
        <dd>{COMPANY.legalName}</dd>
        <dt className="font-medium text-foreground">CNPJ</dt>
        <dd>{COMPANY.cnpj}</dd>
        <dt className="font-medium text-foreground">Titular</dt>
        <dd>{COMPANY.owner}</dd>
        <dt className="font-medium text-foreground">Endereço</dt>
        <dd>{COMPANY.address}</dd>
      </dl>
    </div>
  )
}

function TermsContent() {
  return (
    <div className="space-y-5">
      <CompanyIdentification />
      <Section title="1. Objeto e aceitação">
        <p>
          Estes Termos regulam o acesso ao GBQ Projetos, sistema destinado à organização de projetos,
          tarefas, prioridades, responsáveis e indicadores. Ao aceitar este documento, o usuário declara
          que o leu, compreendeu e concorda em cumpri-lo.
        </p>
      </Section>
      <Section title="2. Conta e credenciais">
        <p>
          O acesso é pessoal e restrito aos usuários autorizados. O usuário deve fornecer informações
          corretas, criar uma senha segura no primeiro acesso, manter suas credenciais em sigilo e comunicar
          imediatamente ao administrador qualquer suspeita de uso indevido.
        </p>
      </Section>
      <Section title="3. Uso permitido">
        <p>
          O sistema deve ser utilizado exclusivamente para finalidades profissionais legítimas. É proibido
          tentar acessar contas, dados ou recursos sem autorização, inserir conteúdo ilícito ou malicioso,
          interferir no funcionamento da aplicação ou compartilhar o acesso com terceiros.
        </p>
      </Section>
      <Section title="4. Conteúdo e responsabilidades">
        <p>
          Cada usuário é responsável pelas informações que cadastra e pelas ações realizadas com sua conta.
          O responsável pelo sistema poderá limitar ou suspender acessos para preservar a segurança, atender
          obrigações legais ou interromper uso incompatível com estes Termos.
        </p>
      </Section>
      <Section title="5. Disponibilidade e alterações">
        <p>
          Poderão ocorrer manutenções, atualizações ou indisponibilidades temporárias. Estes Termos podem ser
          atualizados para refletir mudanças no sistema, em requisitos legais ou em práticas de segurança;
          quando necessário, um novo aceite será solicitado.
        </p>
      </Section>
      <Section title="6. Legislação e contato">
        <p>
          Estes Termos são regidos pelas leis brasileiras. Dúvidas, solicitações ou comunicações devem ser
          encaminhadas ao administrador do sistema pelos canais institucionais disponibilizados ao usuário.
        </p>
      </Section>
    </div>
  )
}

function SecurityPolicyContent() {
  return (
    <div className="space-y-5">
      <CompanyIdentification />
      <Section title="1. Finalidade e abrangência">
        <p>
          Esta Política define cuidados para proteger as informações tratadas no GBQ Projetos contra acesso,
          alteração, divulgação, perda ou destruição não autorizados. Ela se aplica a todos os usuários e
          administradores do sistema.
        </p>
      </Section>
      <Section title="2. Controle de acesso">
        <p>
          O acesso é concedido conforme a função do usuário e deve observar o princípio do menor privilégio.
          Contas são individuais, sessões possuem duração limitada e permissões podem ser revistas ou
          revogadas quando deixarem de ser necessárias.
        </p>
      </Section>
      <Section title="3. Senhas e autenticação">
        <p>
          A senha temporária deve ser substituída no primeiro acesso. Senhas não devem ser reutilizadas,
          compartilhadas ou registradas em locais inseguros. O usuário deve encerrar a sessão em dispositivos
          compartilhados e impedir que terceiros utilizem sua conta.
        </p>
      </Section>
      <Section title="4. Tratamento das informações">
        <p>
          Informações do sistema devem ser acessadas e utilizadas somente para a finalidade profissional que
          justificou o acesso. É vedada a cópia, exportação ou divulgação a pessoas não autorizadas. Dados
          pessoais e informações confidenciais exigem cuidado adicional durante consulta, armazenamento e envio.
        </p>
      </Section>
      <Section title="5. Proteções e continuidade">
        <p>
          O responsável pelo sistema adota medidas técnicas e administrativas compatíveis com o ambiente,
          incluindo controle de acesso, proteção de credenciais, manutenção de software e rotinas de
          recuperação. Nenhum ambiente é imune a riscos, por isso as medidas são revisadas periodicamente.
        </p>
      </Section>
      <Section title="6. Incidentes de segurança">
        <p>
          Suspeitas de acesso indevido, exposição de informações, perda de dispositivo ou comportamento anormal
          devem ser comunicadas imediatamente ao administrador. O registro será analisado, contido e tratado de
          acordo com sua gravidade, com as comunicações cabíveis aos envolvidos e às autoridades competentes.
        </p>
      </Section>
      <Section title="7. Responsabilidade do usuário">
        <p>
          O usuário deve manter seu dispositivo atualizado e protegido, conferir destinatários antes de
          compartilhar informações, respeitar as permissões recebidas e colaborar com orientações de segurança.
          Violações podem resultar em restrição de acesso e nas medidas legais aplicáveis.
        </p>
      </Section>
    </div>
  )
}

export function LegalDocumentDialog({
  document,
  trigger,
  onOpenChange,
}: {
  document: LegalDocument
  trigger: ReactNode
  onOpenChange?: (open: boolean) => void
}) {
  const item = documents[document]
  const Icon = item.icon

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="h-[min(90svh,48rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 pt-6 pb-4 pr-14">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <div className="space-y-1">
              <DialogTitle className="text-lg">{item.title}</DialogTitle>
              <DialogDescription>{item.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="min-h-0 px-6">
          <div className="py-5 pr-4">{item.content}</div>
        </ScrollArea>
        <DialogFooter className="flex-col border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">Versão {LEGAL_VERSION}</p>
          <DialogClose asChild>
            <Button type="button" className="w-full sm:w-auto">Concluir leitura</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function LegalLinks() {
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <LegalDocumentDialog
        document="terms"
        trigger={<Button type="button" variant="link" size="xs" className="h-auto px-0 text-xs">Termos de Uso</Button>}
      />
      <span aria-hidden="true">•</span>
      <LegalDocumentDialog
        document="security"
        trigger={<Button type="button" variant="link" size="xs" className="h-auto px-0 text-xs">Política de Segurança</Button>}
      />
    </p>
  )
}
