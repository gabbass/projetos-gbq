import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { findUserById } from "@/lib/auth/database"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token"

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)
  if (!session) return null
  return findUserById(session.userId)
}

export async function requireCurrentUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

export async function requireAdministrator() {
  const user = await requireCurrentUser()
  if (user.role !== "admin") throw new Error("FORBIDDEN")
  return user
}
