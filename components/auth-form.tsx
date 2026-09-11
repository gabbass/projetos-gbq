"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, Mail } from "lucide-react"

import {
  changePasswordAction,
  loginAction,
  type AuthActionState,
} from "@/app/auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: AuthActionState = {}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending}>
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
        label="Senha"
        autoComplete="current-password"
        placeholder="Digite sua senha"
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
      {state.error ? (
        <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <SubmitButton>Salvar nova senha</SubmitButton>
    </form>
  )
}
