"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { completeFirstAccess, completeOnboarding, findUserByEmail, findUserById } from "@/lib/auth/database"
import { hashPassword, verifyPassword } from "@/lib/auth/password"
import { LEGAL_VERSION } from "@/lib/legal"
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  verifySessionToken,
} from "@/lib/auth/token"

export type AuthActionState = { error?: string }

async function setSession(user: { id: string; email: string; mustChangePassword: boolean; onboardingCompleted: boolean }) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, createSessionToken({
    userId: user.id,
    email: user.email,
    mustChangePassword: user.mustChangePassword,
    onboardingCompleted: user.onboardingCompleted,
  }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })
}

export async function loginAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const passwordInput = String(formData.get("password") ?? "")

  if (!email || !passwordInput) return { error: "Informe o e-mail e a senha ou celular de primeiro acesso." }

  try {
    const user = await findUserByEmail(email)
    const accessKey = user?.must_change_password ? passwordInput.replace(/\D/g, "") : passwordInput
    if (!user || !(await verifyPassword(accessKey, user.password_hash))) {
      return { error: "E-mail ou chave de acesso incorretos." }
    }

    await setSession({
      id: user.id,
      email: user.email,
      mustChangePassword: user.must_change_password,
      onboardingCompleted: Boolean(user.onboarding_completed_at),
    })

    redirect(user.must_change_password ? "/alterar-senha" : user.onboarding_completed_at ? "/" : "/onboarding")
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error
    console.error("Falha no login:", error)
    return { error: "Não foi possível entrar agora. Verifique a conexão com o banco." }
  }
}

export async function changePasswordAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "")
  const confirmation = String(formData.get("confirmation") ?? "")
  const acceptedTerms = String(formData.get("acceptTerms") ?? "")
  const acceptedSecurityPolicy = String(formData.get("acceptSecurityPolicy") ?? "")

  if (password.length < 8) return { error: "A nova senha deve ter pelo menos 8 caracteres." }
  if (password === "12345678") return { error: "Escolha uma senha diferente da senha temporária." }
  if (password !== confirmation) return { error: "As senhas não coincidem." }
  if (acceptedTerms !== LEGAL_VERSION || acceptedSecurityPolicy !== LEGAL_VERSION) {
    return { error: "Leia e aceite os Termos de Uso e a Política de Segurança para continuar." }
  }

  const cookieStore = await cookies()
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)
  if (!session) redirect("/login")

  try {
    const user = await findUserById(session.userId)
    if (user?.phone && password.replace(/\D/g, "") === user.phone && /^[\d\s()+-]+$/.test(password)) {
      return { error: "Escolha uma senha diferente do seu celular de acesso." }
    }
    await completeFirstAccess(session.userId, await hashPassword(password), LEGAL_VERSION)
    await setSession({
      id: session.userId,
      email: session.email,
      mustChangePassword: false,
      onboardingCompleted: false,
    })
    redirect("/onboarding")
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error
    console.error("Falha ao alterar senha:", error)
    return { error: "Não foi possível salvar a nova senha. Tente novamente." }
  }
}

export async function completeOnboardingAction() {
  const cookieStore = await cookies()
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)
  if (!session) redirect("/login")
  if (session.mustChangePassword) redirect("/alterar-senha")

  try {
    await completeOnboarding(session.userId)
    await setSession({
      id: session.userId,
      email: session.email,
      mustChangePassword: false,
      onboardingCompleted: true,
    })
    redirect("/")
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error
    console.error("Falha ao concluir onboarding:", error)
    redirect("/onboarding?erro=conclusao")
  }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect("/login")
}
