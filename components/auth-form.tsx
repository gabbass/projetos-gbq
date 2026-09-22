"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from "lucide-react"

import {
  changePasswordAction,
  loginAction,
  type AuthActionState,
} from "@/app/auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { useErrorFeedback } from "@/hooks/use-action-feedback"

const initialState: AuthActionState = {}

function SubmitButton({ children, disabled = false }: { children: React.ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending || disabled}>
      {pending ? <Spinner /> : <LogIn />}
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
  useErrorFeedback(state.error)

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
      <SubmitButton>Entrar</SubmitButton>
    </form>
  )
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initialState)
  useErrorFeedback(state.error)

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
      <SubmitButton>Salvar e continuar</SubmitButton>
    </form>
  )
}
