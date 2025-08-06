"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(true)

  useEffect(() => {
    const handleRedirection = async () => {
      if (!loading) {
        if (!user) {
          // Si no hay usuario autenticado, ir a login
          router.push("/login")
          return
        }

        try {
          console.log("🔄 Determinando redirección para usuario:", user.email)

          // Verificar si es admin por email (administradores principales)
          if (user.email?.includes("@staffpro.com") && user.email?.includes("admin")) {
            console.log("✅ Usuario admin detectado por email")
            router.push("/admin")
            return
          }

          // Intentar consultar Firestore solo si tenemos permisos
          try {
            // Importar dinámicamente para evitar errores
            const { collection, query, where, getDocs } = await import("firebase/firestore")
            const { db } = await import("@/lib/firebaseConfig")

            // Buscar usuario en la colección staff
            console.log("🔍 Buscando usuario en colección staff...")
            const staffRef = collection(db, "staff")
            const staffQuery = query(staffRef, where("email", "==", user.email))
            const staffSnapshot = await getDocs(staffQuery)

            if (!staffSnapshot.empty) {
              const staffData = staffSnapshot.docs[0].data()
              console.log("✅ Usuario staff encontrado:", staffData)

              if (staffData.rol === "staff" && staffData.estado === "activo") {
                console.log("✅ Redirigiendo a panel de staff")
                router.push("/staff")
                return
              }
            }

            // Buscar en otras colecciones si es necesario
            console.log("🔍 Buscando en colección users...")
            const usersRef = collection(db, "users")
            const usersQuery = query(usersRef, where("email", "==", user.email))
            const usersSnapshot = await getDocs(usersQuery)

            if (!usersSnapshot.empty) {
              const userData = usersSnapshot.docs[0].data()
              console.log("✅ Usuario encontrado en users:", userData)

              // Redireccionar según el rol
              switch (userData.rol) {
                case "admin":
                  console.log("✅ Redirigiendo a panel de admin")
                  router.push("/admin")
                  return
                case "staff":
                  console.log("✅ Redirigiendo a panel de staff")
                  router.push("/staff")
                  return
                case "jugador":
                  console.log("✅ Redirigiendo a panel de jugador")
                  router.push("/jugador")
                  return
                default:
                  console.log("⚠️ Rol no reconocido:", userData.rol)
                  break
              }
            }

            console.log("⚠️ Usuario no encontrado en BD, usando lógica de email")
          } catch (firestoreError: any) {
            console.log("⚠️ Error consultando Firestore (usando fallback):", firestoreError.message)

            // Si hay error de permisos, intentar usar localStorage como backup
            try {
              const savedUsers = localStorage.getItem("usuarios")
              if (savedUsers) {
                const users = JSON.parse(savedUsers)
                const foundUser = users.find((u: any) => u.email === user.email)
                if (foundUser && foundUser.rol === "staff" && foundUser.estado === "activo") {
                  console.log("✅ Usuario staff encontrado en localStorage")
                  router.push("/staff")
                  return
                }
              }
            } catch (localStorageError) {
              console.log("⚠️ Error consultando localStorage:", localStorageError)
            }
          }

          // Fallback: usar lógica de email como último recurso
          console.log("🔄 Usando lógica de email como fallback")
          const email = user.email || ""

          if (email.includes("@staffpro.com")) {
            console.log("✅ Email @staffpro.com detectado, redirigiendo a admin")
            router.push("/admin")
          } else if (email.includes("@staff")) {
            console.log("✅ Email @staff detectado, redirigiendo a staff")
            router.push("/staff")
          } else if (email.includes("@jugador") || email.includes("@player")) {
            console.log("✅ Email jugador detectado, redirigiendo a jugador")
            router.push("/jugador")
          } else {
            console.log("✅ Email genérico, redirigiendo a dashboard")
            router.push("/dashboard")
          }
        } catch (error) {
          console.error("❌ Error determinando redirección:", error)

          // Fallback final en caso de error
          const email = user.email || ""
          if (email.includes("@staffpro.com")) {
            router.push("/admin")
          } else if (email.includes("@staff")) {
            router.push("/staff")
          } else {
            router.push("/dashboard")
          }
        } finally {
          setRedirecting(false)
        }
      }
    }

    handleRedirection()
  }, [user, loading, router])

  // Mostrar loading mientras se determina la redirección
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{redirecting ? "Determinando acceso..." : "Redirigiendo..."}</p>
      </div>
    </div>
  )
}
