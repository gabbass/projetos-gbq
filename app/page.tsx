import { KanbanBoard } from "@/components/kanban-board"
import { requireCurrentUser } from "@/lib/auth/session"
import { listChatData, listProjects, listTasks } from "@/lib/projects/database"

export const dynamic = "force-dynamic"

export default async function Home() {
  const user = await requireCurrentUser()
  const [projects, tasks, chat] = await Promise.all([listProjects(user), listTasks(user), listChatData(user)])
  return <KanbanBoard projects={projects} tasks={tasks} canEdit={user.role === "admin"} currentUserId={user.id} chat={chat} />
}
