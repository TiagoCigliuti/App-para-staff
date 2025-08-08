"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import LoginForm from "@/components/auth/LoginForm"

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push("/")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </main>
    )
  }

  if (user) return null

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <h1
          className="text-center text-4xl font-extrabold tracking-tight mb-6 text-fuchsia-600 dark:text-fuchsia-400"
          aria-label="StaffPro"
        >
          {"StaffPro"}
        </h1>
        <LoginForm />
      </div>
    </main>
  )
}
