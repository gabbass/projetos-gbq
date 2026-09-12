import { ProjectPortfolio } from "@/components/project-portfolio"
import { requireCurrentUser } from "@/lib/auth/session"
import { listProjects } from "@/lib/projects/database"

export const dynamic = "force-dynamic"

export default async function ProjectsPage() {
  await requireCurrentUser()
  const projects = await listProjects()
  return <ProjectPortfolio projects={projects} />
}
