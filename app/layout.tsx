import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { JetBrains_Mono, Fira_Code, Source_Code_Pro, Space_Mono, Inconsolata, IBM_Plex_Mono, DM_Mono, Playfair_Display, Cormorant_Garamond, Abril_Fatface, Libre_Baskerville } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: "Snap Editor - Text to Image Creator",
  description: "Create beautiful text-based images for social media sharing",
  generator: "v0.app",
}

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" })
const firaCode = Fira_Code({ subsets: ["latin"], variable: "--font-fira-code" })
const sourceCodePro = Source_Code_Pro({ subsets: ["latin"], variable: "--font-source-code-pro" })
const spaceMono = Space_Mono({ subsets: ["latin"], variable: "--font-space-mono", weight: ["400", "700"] })
const inconsolata = Inconsolata({ subsets: ["latin"], variable: "--font-inconsolata" })
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-ibm-plex-mono", weight: ["400", "700"] })
const dmMono = DM_Mono({ subsets: ["latin"], variable: "--font-dm-mono", weight: ["300", "400", "500"] })
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", weight: ["400", "500", "700", "900"] })
const cormorant = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-cormorant", weight: ["400", "500", "600", "700"] })
const abril = Abril_Fatface({ subsets: ["latin"], variable: "--font-abril", weight: "400" })
const libreBaskerville = Libre_Baskerville({ subsets: ["latin"], variable: "--font-libre-baskerville", weight: ["400", "700"] })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
  
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} ${jetbrainsMono.variable} ${firaCode.variable} ${sourceCodePro.variable} ${spaceMono.variable} ${inconsolata.variable} ${ibmPlexMono.variable} ${dmMono.variable} ${playfair.variable} ${cormorant.variable} ${abril.variable} ${libreBaskerville.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          <Suspense fallback={null}>{children}</Suspense>
          <Analytics />
          <Toaster richColors closeButton position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
