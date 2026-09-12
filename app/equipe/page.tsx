import { TeamAccessPanel } from "@/components/settings-panel"
import { listUsers } from "@/lib/auth/database"
import { requireCurrentUser } from "@/lib/auth/session"

export const dynamic = "force-dynamic"

export default async function TeamAccessPage() {
  const currentUser = await requireCurrentUser()
  const users = await listUsers()

  return (
    <TeamAccessPanel
      currentUserId={currentUser.id}
      isAdmin={currentUser.role === "admin"}
      users={users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        area: user.area,
        mustChangePassword: user.must_change_password,
      }))}
    />
  )
}
