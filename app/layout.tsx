import type { Metadata } from "next"
import { Outfit, Roboto } from "next/font/google"
import type { ReactNode } from "react"

import "./globals.css"
import { AppShell } from "@/components/app-shell"
import { getWorkspaceSettings } from "@/lib/auth/database"
import { getCurrentUser } from "@/lib/auth/session"
import { cn } from "@/lib/utils"

const outfitHeading = Outfit({ subsets: ["latin"], variable: "--font-heading" })
const roboto = Roboto({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "GBQ | Gestão de projetos",
  description: "Sistema de acompanhamento de projetos e gestão à vista.",
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [settings, currentUser] = await Promise.all([
    getWorkspaceSettings().catch(() => ({ theme: "light" as const, logo_type: null, favicon_type: null, updated_at: new Date(0) })),
    getCurrentUser().catch(() => null),
  ])

  return (
    <html
      lang="pt-BR"
      dir="ltr"
      className={cn("h-full font-sans antialiased", roboto.variable, outfitHeading.variable, settings.theme === "dark" && "dark")}
    >
      <body className="min-h-full">
        <AppShell
          currentUser={currentUser ? {
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
          } : null}
          hasLogo={Boolean(settings.logo_type)}
          brandingVersion={settings.updated_at.toISOString()}
        >
          {children}
        </AppShell>
      </body>
    </html>
  )
}
