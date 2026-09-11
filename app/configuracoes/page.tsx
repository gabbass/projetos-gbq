import { SettingsPanel } from "@/components/settings-panel"
import { getWorkspaceSettings, listUsers } from "@/lib/auth/database"
import { requireCurrentUser } from "@/lib/auth/session"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const currentUser = await requireCurrentUser()
  const [users, settings] = await Promise.all([listUsers(), getWorkspaceSettings()])

  return (
    <SettingsPanel
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
      settings={{
        theme: settings.theme,
        hasLogo: Boolean(settings.logo_type),
        hasFavicon: Boolean(settings.favicon_type),
        version: settings.updated_at.toISOString(),
      }}
    />
  )
}
