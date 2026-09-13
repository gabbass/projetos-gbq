import { ProjectPortfolio } from "@/components/project-portfolio"
import { requireCurrentUser } from "@/lib/auth/session"
import { listUsers } from "@/lib/auth/database"
import { listChatData, listProjects } from "@/lib/projects/database"

export const dynamic = "force-dynamic"
export const metadata = { title: "Projetos" }

export default async function ProjectsPage() {
  const user = await requireCurrentUser()
  const [projects, users, chat] = await Promise.all([listProjects(user), user.role === "admin" ? listUsers() : Promise.resolve([]), listChatData(user)])
  return <ProjectPortfolio
    projects={projects}
    clients={users.filter((item) => item.role === "client").map((item) => ({ id: item.id, name: item.name, email: item.email }))}
    responsibles={users.filter((item) => item.role !== "client").map((item) => ({ id: item.id, name: item.name, email: item.email }))}
    isAdmin={user.role === "admin"}
    currentUserId={user.id}
    chat={chat}
  />
}
