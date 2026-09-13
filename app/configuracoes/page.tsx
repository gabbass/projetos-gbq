import { AppearanceSettingsPanel } from "@/components/settings-panel"
import { getWorkspaceSettings } from "@/lib/auth/database"
import { requireCurrentUser } from "@/lib/auth/session"

export const dynamic = "force-dynamic"
export const metadata = { title: "Configurações" }

export default async function SettingsPage() {
  const currentUser = await requireCurrentUser()
  const settings = await getWorkspaceSettings()

  return (
    <AppearanceSettingsPanel
      isAdmin={currentUser.role === "admin"}
      settings={{
        userTheme: currentUser.theme,
        userName: currentUser.name,
        userEmail: currentUser.email,
        userPhone: currentUser.phone,
        userArea: currentUser.area,
        userRole: currentUser.role,
        siteName: settings.site_name,
        siteSubtitle: settings.site_subtitle,
        hasLogo: Boolean(settings.logo_type),
        hasFavicon: Boolean(settings.favicon_type),
        version: settings.updated_at.toISOString(),
      }}
    />
  )
}
