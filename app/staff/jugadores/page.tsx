"use client"

import { useEffect } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import GestionJugadores from "@/components/staff/GestionJugadores"

export default function JugadoresPage() {
  const { user, clienteData, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login")
        return
      }

      // Verificar que el usuario sea staff
      if (clienteData?.esAdmin || clienteData?.tipoUsuario !== "staff") {
        router.push("/dashboard")
        return
      }
    }
  }, [user, clienteData, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando gestión de jugadores...</p>
        </div>
      </div>
    )
  }

  if (!user || clienteData?.esAdmin || clienteData?.tipoUsuario !== "staff") {
    return null
  }

  return <GestionJugadores />
}
