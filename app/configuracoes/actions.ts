"use server"

import { revalidatePath } from "next/cache"

import {
  createUser,
  deleteUser,
  updateUser,
  updateOwnProfile,
  updateUserTheme,
  updateWorkspaceSettings,
  type UserRole,
} from "@/lib/auth/database"
import { hashPassword } from "@/lib/auth/password"
import { requireAdministrator, requireCurrentUser } from "@/lib/auth/session"

export type SettingsActionState = {
  status?: "success" | "error"
  message?: string
}

const validRoles = new Set<UserRole>(["admin", "client"])
const validImageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"])
const MAX_IMAGE_SIZE = 750 * 1024

function textField(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength)
}

function phoneField(formData: FormData) {
  return textField(formData, "phone", 30).replace(/\D/g, "")
}

function readUserInput(formData: FormData) {
  const name = textField(formData, "name", 100)
  const email = textField(formData, "email", 254).toLowerCase()
  const phone = phoneField(formData)
  const area = textField(formData, "area", 100)
  const role = textField(formData, "role", 20) as UserRole

  if (name.length < 2) return { error: "Informe um nome com pelo menos 2 caracteres." } as const
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Informe um e-mail válido." } as const
  if (phone.length < 10 || phone.length > 13) return { error: "Informe um celular válido, com DDD." } as const
  if (!area) return { error: "Informe a área do usuário." } as const
  if (!validRoles.has(role)) return { error: "Selecione um perfil válido." } as const

  return { value: { name, email, phone, area, role } } as const
}

function databaseMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "LAST_ADMIN") return "O workspace precisa manter pelo menos um administrador."
    if (error.message === "USER_NOT_FOUND") return "Esse usuário não existe mais."
    if (error.message === "ROLE_IN_USE") return "O perfil não pode ser alterado enquanto o usuário estiver vinculado a um projeto nessa função."
    if (error.message === "USER_IN_PROJECT") return "Remova o usuário dos projetos vinculados antes de excluir o acesso."
  }
  if (error && typeof error === "object" && "code" in error && error.code === "23505") {
    return "Já existe um usuário cadastrado com esse e-mail."
  }
  return "Não foi possível concluir a operação. Tente novamente."
}

export async function createUserAction(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdministrator()
  const input = readUserInput(formData)
  if ("error" in input) return { status: "error", message: input.error }

  try {
    await createUser({ ...input.value, passwordHash: await hashPassword(input.value.phone) })
    revalidatePath("/equipe")
    revalidatePath("/", "layout")
    return { status: "success", message: "Usuário cadastrado. O celular é a chave do primeiro acesso e deverá ser substituído por uma senha pessoal." }
  } catch (error) {
    console.error("Falha ao cadastrar usuário:", error)
    return { status: "error", message: databaseMessage(error) }
  }
}

export async function updateOwnProfileAction(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const user = await requireCurrentUser()
  const name = textField(formData, "name", 100)
  const email = textField(formData, "email", 254).toLowerCase()
  const phone = phoneField(formData)
  if (name.length < 2) return { status: "error", message: "Informe um nome com pelo menos 2 caracteres." }
  if (!/^\S+@\S+\.\S+$/.test(email)) return { status: "error", message: "Informe um e-mail válido." }
  if (phone.length < 10 || phone.length > 13) return { status: "error", message: "Informe um celular válido, com DDD." }

  try {
    await updateOwnProfile(user.id, { name, email, phone })
    revalidatePath("/configuracoes")
    revalidatePath("/", "layout")
    return { status: "success", message: "Suas informações foram atualizadas." }
  } catch (error) {
    console.error("Falha ao atualizar o próprio perfil:", error)
    return { status: "error", message: databaseMessage(error) }
  }
}

export async function updateUserAction(
  userId: string,
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdministrator()
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { status: "error", message: "Usuário inválido." }
  const input = readUserInput(formData)
  if ("error" in input) return { status: "error", message: input.error }

  try {
    await updateUser(userId, { ...input.value, accessKeyHash: await hashPassword(input.value.phone) })
    revalidatePath("/equipe")
    revalidatePath("/", "layout")
    return { status: "success", message: "Dados e permissões atualizados." }
  } catch (error) {
    console.error("Falha ao atualizar usuário:", error)
    return { status: "error", message: databaseMessage(error) }
  }
}

export async function deleteUserAction(
  userId: string,
  _state: SettingsActionState,
  _formData: FormData,
): Promise<SettingsActionState> {
  void [_state, _formData]
  const administrator = await requireAdministrator()
  if (administrator.id === userId) return { status: "error", message: "Você não pode excluir o próprio acesso." }
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { status: "error", message: "Usuário inválido." }

  try {
    await deleteUser(userId)
    revalidatePath("/equipe")
    revalidatePath("/", "layout")
    return { status: "success", message: "Usuário excluído do workspace." }
  } catch (error) {
    console.error("Falha ao excluir usuário:", error)
    return { status: "error", message: databaseMessage(error) }
  }
}

async function imageFromForm(formData: FormData, name: string) {
  const value = formData.get(name)
  if (!(value instanceof File) || value.size === 0) return undefined
  if (!validImageTypes.has(value.type)) throw new Error("INVALID_IMAGE")
  if (value.size > MAX_IMAGE_SIZE) throw new Error("IMAGE_TOO_LARGE")
  return { data: Buffer.from(await value.arrayBuffer()), type: value.type }
}

export async function updateAppearanceAction(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdministrator()

  try {
    const siteName = textField(formData, "siteName", 80)
    const siteSubtitle = textField(formData, "siteSubtitle", 120)
    if (siteName.length < 2) return { status: "error", message: "Informe o nome do site." }
    if (siteSubtitle.length < 2) return { status: "error", message: "Informe o subtítulo do site." }
    const intent = textField(formData, "intent", 30)
    const logo = intent === "remove-logo" ? null : await imageFromForm(formData, "logo")
    const favicon = intent === "remove-favicon" ? null : await imageFromForm(formData, "favicon")
    await updateWorkspaceSettings({ siteName, siteSubtitle, logo, favicon })
    revalidatePath("/", "layout")
    revalidatePath("/configuracoes")
    return {
      status: "success",
      message: intent.startsWith("remove-") ? "Imagem removida." : "Aparência atualizada para todo o workspace.",
    }
  } catch (error) {
    console.error("Falha ao atualizar aparência:", error)
    if (error instanceof Error && error.message === "INVALID_IMAGE") return { status: "error", message: "Use uma imagem PNG, JPG, WebP, SVG ou ICO." }
    if (error instanceof Error && error.message === "IMAGE_TOO_LARGE") return { status: "error", message: "Cada imagem deve ter no máximo 750 KB." }
    return { status: "error", message: databaseMessage(error) }
  }
}

export async function updateThemeAction(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const user = await requireCurrentUser()
  const theme = textField(formData, "theme", 10)
  if (theme !== "light" && theme !== "dark") return { status: "error", message: "Selecione um tema válido." }

  try {
    await updateUserTheme(user.id, theme)
    revalidatePath("/", "layout")
    return { status: "success", message: "Sua preferência de tema foi atualizada." }
  } catch (error) {
    console.error("Falha ao atualizar tema:", error)
    return { status: "error", message: databaseMessage(error) }
  }
}
