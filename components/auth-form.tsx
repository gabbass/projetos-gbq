"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { BookOpenCheck, Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, Mail } from "lucide-react"

import {
  changePasswordAction,
  loginAction,
  type AuthActionState,
} from "@/app/auth-actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LegalDocumentDialog } from "@/components/legal-documents"
import { LEGAL_VERSION } from "@/lib/legal"

const initialState: AuthActionState = {}

function SubmitButton({ children, disabled = false }: { children: React.ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending || disabled}>
      {pending ? <LoaderCircle className="animate-spin" /> : <LogIn />}
      {pending ? "Aguarde..." : children}
    </Button>
  )
}

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  placeholder,
}: {
  id: string
  name: string
  label: string
  autoComplete: string
  placeholder: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <LockKeyhole className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="h-11 rounded-xl pr-11 pl-9"
          required
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  )
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialState)

  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <div className="relative">
          <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nome@empresa.com"
            className="h-11 rounded-xl pl-9"
            required
            autoFocus
          />
        </div>
      </div>
      <PasswordField
        id="password"
        name="password"
        label="Senha ou celular no primeiro acesso"
        autoComplete="current-password"
        placeholder="Digite sua senha ou celular com DDD"
      />
      {state.error ? (
        <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <SubmitButton>Entrar</SubmitButton>
    </form>
  )
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initialState)
  const [openedTerms, setOpenedTerms] = useState(false)
  const [openedSecurityPolicy, setOpenedSecurityPolicy] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedSecurityPolicy, setAcceptedSecurityPolicy] = useState(false)

  return (
    <form action={action} className="grid gap-5">
      <PasswordField
        id="new-password"
        name="password"
        label="Nova senha"
        autoComplete="new-password"
        placeholder="Mínimo de 8 caracteres"
      />
      <PasswordField
        id="confirmation"
        name="confirmation"
        label="Confirme a nova senha"
        autoComplete="new-password"
        placeholder="Digite novamente"
      />
      <div className="rounded-2xl border bg-muted/30 p-4">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpenCheck className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Leitura e aceite obrigatórios</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Abra os dois documentos para liberar as confirmações.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="accept-terms"
              name="acceptTerms"
              value={LEGAL_VERSION}
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              disabled={!openedTerms}
              required
              aria-describedby="accept-terms-hint"
              className="mt-0.5"
            />
            <div className="grid gap-1">
              <div className="flex flex-wrap items-baseline gap-x-1 text-sm leading-5">
                <Label htmlFor="accept-terms" className="text-sm leading-5">Li e aceito os</Label>
                <LegalDocumentDialog
                  document="terms"
                  onOpenChange={(open) => open && setOpenedTerms(true)}
                  trigger={
                    <Button type="button" variant="link" className="h-auto p-0 align-baseline text-sm">
                      Termos de Uso
                    </Button>
                  }
                />
              </div>
              {!openedTerms ? <p id="accept-terms-hint" className="text-xs text-muted-foreground">Leia o documento para habilitar.</p> : null}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="accept-security-policy"
              name="acceptSecurityPolicy"
              value={LEGAL_VERSION}
              checked={acceptedSecurityPolicy}
              onCheckedChange={(checked) => setAcceptedSecurityPolicy(checked === true)}
              disabled={!openedSecurityPolicy}
              required
              aria-describedby="accept-security-policy-hint"
              className="mt-0.5"
            />
            <div className="grid gap-1">
              <div className="flex flex-wrap items-baseline gap-x-1 text-sm leading-5">
                <Label htmlFor="accept-security-policy" className="text-sm leading-5">Li e aceito a</Label>
                <LegalDocumentDialog
                  document="security"
                  onOpenChange={(open) => open && setOpenedSecurityPolicy(true)}
                  trigger={
                    <Button type="button" variant="link" className="h-auto p-0 align-baseline text-sm">
                      Política de Segurança
                    </Button>
                  }
                />
              </div>
              {!openedSecurityPolicy ? <p id="accept-security-policy-hint" className="text-xs text-muted-foreground">Leia o documento para habilitar.</p> : null}
            </div>
          </div>
        </div>
      </div>
      {state.error ? (
        <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <SubmitButton disabled={!acceptedTerms || !acceptedSecurityPolicy}>Salvar e continuar</SubmitButton>
    </form>
  )
}
