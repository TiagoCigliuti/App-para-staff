import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/auth/AuthProvider"
import { ThemeProvider } from "@/components/theme/ThemeProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Staff App - Firebase",
  description: "Staff management application with Firebase backend",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <main>{children}</main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
