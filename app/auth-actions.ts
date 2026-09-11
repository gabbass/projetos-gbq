"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { findUserByEmail, updateUserPassword } from "@/lib/auth/database"
import { hashPassword, verifyPassword } from "@/lib/auth/password"
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  verifySessionToken,
} from "@/lib/auth/token"

export type AuthActionState = { error?: string }

async function setSession(user: { id: string; email: string; mustChangePassword: boolean }) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, createSessionToken({
    userId: user.id,
    email: user.email,
    mustChangePassword: user.mustChangePassword,
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
  const password = String(formData.get("password") ?? "")

  if (!email || !password) return { error: "Informe o e-mail e a senha." }

  try {
    const user = await findUserByEmail(email)
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return { error: "E-mail ou senha incorretos." }
    }

    await setSession({
      id: user.id,
      email: user.email,
      mustChangePassword: user.must_change_password,
    })

    redirect(user.must_change_password ? "/alterar-senha" : "/")
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error
    console.error("Falha no login:", error)
    return { error: "Não foi possível entrar agora. Verifique a conexão com o banco." }
  }
}

export async function changePasswordAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "")
  const confirmation = String(formData.get("confirmation") ?? "")

  if (password.length < 8) return { error: "A nova senha deve ter pelo menos 8 caracteres." }
  if (password === "12345678") return { error: "Escolha uma senha diferente da senha temporária." }
  if (password !== confirmation) return { error: "As senhas não coincidem." }

  const cookieStore = await cookies()
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)
  if (!session) redirect("/login")

  try {
    await updateUserPassword(session.userId, await hashPassword(password))
    await setSession({
      id: session.userId,
      email: session.email,
      mustChangePassword: false,
    })
    redirect("/")
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error
    console.error("Falha ao alterar senha:", error)
    return { error: "Não foi possível salvar a nova senha. Tente novamente." }
  }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect("/login")
}
