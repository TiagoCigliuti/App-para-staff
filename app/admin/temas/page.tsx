"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import UnderDevelopment from "@/components/UnderDevelopment"

export default function TemasPage() {
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
      title="Gestión de Temas"
      description="El módulo de personalización de temas está en desarrollo. Aquí podrás crear y editar temas personalizados, configurar colores, fuentes y estilos para diferentes clientes."
      backUrl="/admin"
    />
  )
}
