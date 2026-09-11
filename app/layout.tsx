import type { Metadata } from "next"
import { Outfit, Roboto } from "next/font/google"
import type { ReactNode } from "react"

import "./globals.css"
import { AppShell } from "@/components/app-shell"
import { cn } from "@/lib/utils"

const outfitHeading = Outfit({ subsets: ["latin"], variable: "--font-heading" })
const roboto = Roboto({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "GBQ | Gestão de projetos",
  description: "Sistema de acompanhamento de projetos e gestão à vista.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      dir="ltr"
      className={cn("h-full font-sans antialiased", roboto.variable, outfitHeading.variable)}
    >
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
