"use server"

import { revalidatePath } from "next/cache"

import {
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  moveTask,
  updateProject,
  updateTask,
  type ProjectPriority,
  type TaskStatus,
} from "@/lib/projects/database"
import { requireAdministrator } from "@/lib/auth/session"

export type ProjectActionState = { status?: "success" | "error"; message?: string }

const priorities = new Set<ProjectPriority>(["high", "medium", "low"])
const statuses = new Set<TaskStatus>(["todo", "in_progress", "waiting", "done"])
const uuidPattern = /^[0-9a-f-]{36}$/i

function text(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength)
}

function nullableDate(formData: FormData, name: string) {
  const value = text(formData, name, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function refreshProjectViews() {
  revalidatePath("/")
  revalidatePath("/projetos")
  revalidatePath("/progresso")
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") return "Esse projeto não existe mais."
  if (error instanceof Error && error.message === "TASK_NOT_FOUND") return "Essa tarefa não existe mais."
  if (error instanceof Error && error.message === "INVALID_PROJECT_PARTICIPANTS") return "Selecione um cliente e um responsável válidos."
  if (error && typeof error === "object" && "code" in error && error.code === "23503") return "O projeto selecionado não existe mais."
  return "Não foi possível concluir a operação. Tente novamente."
}

function projectInput(formData: FormData) {
  const name = text(formData, "name", 120)
  const area = text(formData, "area", 100)
  const clientUserId = text(formData, "clientUserId", 36)
  const responsibleUserId = text(formData, "responsibleUserId", 36)
  const priority = text(formData, "priority", 10) as ProjectPriority
  const objective = text(formData, "objective", 1500)
  if (name.length < 2) return { error: "Informe o nome do projeto." } as const
  if (!area) return { error: "Informe a área responsável." } as const
  if (!uuidPattern.test(clientUserId)) return { error: "Selecione o cliente do projeto." } as const
  if (!uuidPattern.test(responsibleUserId)) return { error: "Selecione o responsável pelo projeto." } as const
  if (clientUserId === responsibleUserId) return { error: "Cliente e responsável devem ser pessoas diferentes." } as const
  if (!priorities.has(priority)) return { error: "Selecione uma prioridade válida." } as const
  return { value: { name, area, clientUserId, responsibleUserId, priority, deadline: nullableDate(formData, "deadline"), objective } } as const
}

function taskInput(formData: FormData) {
  const title = text(formData, "title", 160)
  const description = text(formData, "description", 1500)
  const owner = text(formData, "owner", 100)
  const priority = text(formData, "priority", 10) as ProjectPriority
  const status = text(formData, "status", 20) as TaskStatus
  if (title.length < 2) return { error: "Informe o título da tarefa." } as const
  if (!owner) return { error: "Informe o responsável pela tarefa." } as const
  if (!priorities.has(priority)) return { error: "Selecione uma prioridade válida." } as const
  if (!statuses.has(status)) return { error: "Selecione um status válido." } as const
  return { value: { title, description, owner, priority, dueDate: nullableDate(formData, "dueDate"), status } } as const
}

export async function createProjectAction(_state: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const user = await requireAdministrator()
  const input = projectInput(formData)
  if ("error" in input) return { status: "error", message: input.error }
  try {
    await createProject({ ...input.value, createdBy: user.id })
    refreshProjectViews()
    return { status: "success", message: "Projeto criado com sucesso." }
  } catch (error) {
    console.error("Falha ao criar projeto:", error)
    return { status: "error", message: errorMessage(error) }
  }
}

export async function updateProjectAction(projectId: string, _state: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  await requireAdministrator()
  if (!uuidPattern.test(projectId)) return { status: "error", message: "Projeto inválido." }
  const input = projectInput(formData)
  if ("error" in input) return { status: "error", message: input.error }
  try {
    await updateProject(projectId, input.value)
    refreshProjectViews()
    return { status: "success", message: "Projeto atualizado." }
  } catch (error) {
    console.error("Falha ao atualizar projeto:", error)
    return { status: "error", message: errorMessage(error) }
  }
}

export async function deleteProjectAction(projectId: string, _state: ProjectActionState, _formData: FormData): Promise<ProjectActionState> {
  void [_state, _formData]
  await requireAdministrator()
  if (!uuidPattern.test(projectId)) return { status: "error", message: "Projeto inválido." }
  try {
    await deleteProject(projectId)
    refreshProjectViews()
    return { status: "success", message: "Projeto e suas tarefas foram excluídos." }
  } catch (error) {
    console.error("Falha ao excluir projeto:", error)
    return { status: "error", message: errorMessage(error) }
  }
}

export async function createTaskAction(_state: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  const user = await requireAdministrator()
  const projectId = text(formData, "projectId", 36)
  if (!uuidPattern.test(projectId)) return { status: "error", message: "Selecione um projeto válido." }
  const input = taskInput(formData)
  if ("error" in input) return { status: "error", message: input.error }
  try {
    await createTask({ projectId, ...input.value, createdBy: user.id })
    refreshProjectViews()
    return { status: "success", message: "Tarefa criada com sucesso." }
  } catch (error) {
    console.error("Falha ao criar tarefa:", error)
    return { status: "error", message: errorMessage(error) }
  }
}

export async function updateTaskAction(taskId: string, _state: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  await requireAdministrator()
  if (!uuidPattern.test(taskId)) return { status: "error", message: "Tarefa inválida." }
  const input = taskInput(formData)
  if ("error" in input) return { status: "error", message: input.error }
  try {
    await updateTask(taskId, input.value)
    refreshProjectViews()
    return { status: "success", message: "Tarefa atualizada." }
  } catch (error) {
    console.error("Falha ao atualizar tarefa:", error)
    return { status: "error", message: errorMessage(error) }
  }
}

export async function moveTaskAction(taskId: string, status: TaskStatus): Promise<ProjectActionState> {
  await requireAdministrator()
  if (!uuidPattern.test(taskId) || !statuses.has(status)) return { status: "error", message: "Movimentação inválida." }
  try {
    await moveTask(taskId, status)
    refreshProjectViews()
    return { status: "success", message: "Tarefa movida." }
  } catch (error) {
    console.error("Falha ao mover tarefa:", error)
    return { status: "error", message: errorMessage(error) }
  }
}

export async function deleteTaskAction(taskId: string, _state: ProjectActionState, _formData: FormData): Promise<ProjectActionState> {
  void [_state, _formData]
  await requireAdministrator()
  if (!uuidPattern.test(taskId)) return { status: "error", message: "Tarefa inválida." }
  try {
    await deleteTask(taskId)
    refreshProjectViews()
    return { status: "success", message: "Tarefa excluída." }
  } catch (error) {
    console.error("Falha ao excluir tarefa:", error)
    return { status: "error", message: errorMessage(error) }
  }
}
