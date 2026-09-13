import { LoginForm } from "@/components/auth-form"
import { AuthShell } from "@/components/auth-shell"

export const metadata = { title: "Login" }

export default function LoginPage() {
  return (
    <AuthShell>
      <div className="mb-7">
        <p className="mb-2 text-sm font-medium text-primary">Bem-vindo de volta</p>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Acesse sua conta</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Entre com seu e-mail e senha para continuar.
        </p>
      </div>
      <LoginForm />
    </AuthShell>
  )
}
