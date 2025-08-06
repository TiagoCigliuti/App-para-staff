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
      // Si ya está logueado, redirigir a la página principal
      router.push("/")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (user) {
    return null // Se está redirigiendo
  }

  return <LoginForm />
}
