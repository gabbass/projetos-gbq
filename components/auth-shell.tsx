import type { ReactNode } from "react"
import { BarChart3, CheckCircle2, FolderKanban, ShieldCheck, Target } from "lucide-react"

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-muted/30 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_32%),radial-gradient(circle_at_85%_75%,white_0,transparent_28%)]" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <Target className="size-5" />
          </span>
          <div>
            <p className="font-heading text-lg font-semibold">GBQ Projetos</p>
            <p className="text-sm text-primary-foreground/70">Gestão à vista</p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <p className="mb-5 text-sm font-medium tracking-[0.18em] text-primary-foreground/60 uppercase">Seu portfólio em movimento</p>
          <h1 className="font-heading text-4xl leading-tight font-semibold tracking-tight xl:text-5xl">
            Clareza para decidir.<br />Ritmo para entregar.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-primary-foreground/75">
            Centralize projetos, acompanhe prioridades e mantenha toda a equipe alinhada em um só lugar.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-3">
          {[
            [FolderKanban, "Projetos organizados"],
            [BarChart3, "Visão executiva"],
            [CheckCircle2, "Entregas no prazo"],
          ].map(([Icon, label]) => {
            const FeatureIcon = Icon as typeof FolderKanban
            return (
              <div key={label as string} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <FeatureIcon className="mb-3 size-5" />
                <p className="text-sm font-medium">{label as string}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="flex items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Target className="size-5" />
            </span>
            <div>
              <p className="font-heading font-semibold">GBQ Projetos</p>
              <p className="text-xs text-muted-foreground">Gestão à vista</p>
            </div>
          </div>
          <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
            {children}
          </div>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Ambiente protegido e acesso restrito
          </p>
        </div>
      </section>
    </main>
  )
}
