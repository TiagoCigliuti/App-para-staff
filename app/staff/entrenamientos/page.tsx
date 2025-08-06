"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import UnderDevelopment from "@/components/UnderDevelopment"

export default function EntrenamientosPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <UnderDevelopment
      title="Gestión de Entrenamientos"
      description="El módulo de entrenamientos está en desarrollo. Aquí podrás planificar sesiones, crear rutinas, asignar ejercicios y hacer seguimiento del progreso."
      backUrl="/staff"
    />
  )
}
