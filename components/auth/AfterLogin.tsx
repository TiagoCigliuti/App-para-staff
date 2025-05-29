"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getClienteConTema } from "@/lib/firebase"
import { auth } from "@/lib/firebaseConfig"
import { onAuthStateChanged } from "firebase/auth"

export default function AfterLogin() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login")
        return
      }

      try {
        const clienteData = await getClienteConTema(user.uid)
        console.log("Datos del cliente obtenidos:", clienteData)

        // Solo redirigir a dashboard si realmente necesita completar perfil
        // Los usuarios staff creados desde admin NO necesitan completar perfil
        if (clienteData.perfilIncompleto && !clienteData.tipoUsuario) {
          console.log("Usuario con perfil incompleto, redirigiendo a dashboard")
          router.push("/dashboard")
          return
        }

        if (clienteData.error) {
          console.log("Error al obtener datos del cliente, redirigiendo a dashboard")
          router.push("/dashboard")
          return
        }

        // Redirigir según el tipo de usuario
        if (clienteData.esAdmin) {
          console.log("Usuario admin detectado, redirigiendo a /admin")
          router.push("/admin")
        } else if (clienteData.tipoUsuario === "staff") {
          console.log("Usuario staff detectado, redirigiendo a /staff")
          router.push("/staff")
        } else {
          console.log("Usuario regular detectado, redirigiendo a /client")
          // Usuarios regulares van al portal de cliente
          router.push("/client")
        }
      } catch (error) {
        console.error("Error al verificar rol:", error)
        router.push("/dashboard")
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  return null
}
