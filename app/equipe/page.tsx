import { TeamAccessPanel } from "@/components/settings-panel"
import { listUsers } from "@/lib/auth/database"
import { requireAdministrator } from "@/lib/auth/session"

export const dynamic = "force-dynamic"
export const metadata = { title: "Equipe e acessos" }

export default async function TeamAccessPage() {
  const currentUser = await requireAdministrator()
  const users = await listUsers()

  return (
    <TeamAccessPanel
      currentUserId={currentUser.id}
      isAdmin
      users={users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        area: user.area,
        mustChangePassword: user.must_change_password,
      }))}
    />
  )
}
