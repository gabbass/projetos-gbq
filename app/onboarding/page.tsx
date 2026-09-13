import { redirect } from "next/navigation"

import { Onboarding } from "@/components/onboarding"
import { getWorkspaceSettings } from "@/lib/auth/database"
import { requireCurrentUser } from "@/lib/auth/session"

export const dynamic = "force-dynamic"
export const metadata = { title: "Boas-vindas" }

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const [user, settings, query] = await Promise.all([
    requireCurrentUser(),
    getWorkspaceSettings(),
    searchParams,
  ])

  if (user.must_change_password) redirect("/alterar-senha")
  if (user.onboarding_completed_at) redirect("/")

  return (
    <Onboarding
      firstName={user.name.trim().split(/\s+/)[0] || "bem-vindo"}
      role={user.role}
      siteName={settings.site_name}
      hasError={query.erro === "conclusao"}
    />
  )
}
