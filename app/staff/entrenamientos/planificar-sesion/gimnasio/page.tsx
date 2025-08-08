"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import UnderDevelopment from "@/components/UnderDevelopment"

export default function SesionGimnasioPage() {
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
      title="Sesión de Gimnasio"
      description="El módulo de planificación de sesiones de gimnasio está en desarrollo. Aquí podrás crear entrenamientos específicos para el gimnasio, incluyendo ejercicios de fuerza, acondicionamiento físico y trabajo de resistencia."
      backUrl="/staff/entrenamientos/planificar-sesion"
    />
  )
}
