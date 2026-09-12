import { KeyRound } from "lucide-react"

import { ChangePasswordForm } from "@/components/auth-form"
import { AuthShell } from "@/components/auth-shell"

export default function ChangePasswordPage() {
  return (
    <AuthShell>
      <div className="mb-7">
        <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="size-5" />
        </span>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Conclua seu primeiro acesso</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Crie uma senha pessoal, leia e aceite os documentos obrigatórios para continuar.
        </p>
      </div>
      <ChangePasswordForm />
    </AuthShell>
  )
}
