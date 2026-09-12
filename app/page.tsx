import { KanbanBoard } from "@/components/kanban-board"
import { requireCurrentUser } from "@/lib/auth/session"
import { listProjects, listTasks } from "@/lib/projects/database"

export const dynamic = "force-dynamic"

export default async function Home() {
  await requireCurrentUser()
  const [projects, tasks] = await Promise.all([listProjects(), listTasks()])
  return <KanbanBoard projects={projects} tasks={tasks} />
}
