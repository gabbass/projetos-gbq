import { KanbanBoard } from "@/components/kanban-board"
import { requireCurrentUser } from "@/lib/auth/session"
import { listProjects, listTasks } from "@/lib/projects/database"

export const dynamic = "force-dynamic"

export default async function Home() {
  const user = await requireCurrentUser()
  const [projects, tasks] = await Promise.all([listProjects(user), listTasks(user)])
  return <KanbanBoard projects={projects} tasks={tasks} canEdit={user.role === "admin"} />
}
