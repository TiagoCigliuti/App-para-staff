"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { loginWithEmailOrUsername } from "@/lib/firebase"
import { Eye, EyeOff, LogIn } from "lucide-react"

export default function LoginForm() {
  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const determineUserRedirection = async (userEmail: string) => {
    try {
      console.log("🔄 Determinando redirección para:", userEmail)

      // Verificar si es admin por email (administradores principales)
      if (userEmail.includes("@staffpro.com") && userEmail.includes("admin")) {
        console.log("✅ Usuario admin detectado por email")
        return "/admin"
      }

      // Intentar consultar Firestore solo si tenemos permisos
      try {
        // Importar dinámicamente para evitar errores de SSR
        const { collection, query, where, getDocs } = await import("firebase/firestore")
        const { db } = await import("@/lib/firebaseConfig")

        // Buscar usuario en la colección staff
        console.log("🔍 Buscando usuario en colección staff...")
        const staffRef = collection(db, "staff")
        const staffQuery = query(staffRef, where("email", "==", userEmail))
        const staffSnapshot = await getDocs(staffQuery)

        if (!staffSnapshot.empty) {
          const staffData = staffSnapshot.docs[0].data()
          console.log("✅ Usuario staff encontrado:", staffData)

          if (staffData.rol === "staff" && staffData.estado === "activo") {
            console.log("✅ Redirigiendo a panel de staff")
            return "/staff"
          }
        }

        // Buscar en colección users
        console.log("🔍 Buscando en colección users...")
        const usersRef = collection(db, "users")
        const usersQuery = query(usersRef, where("email", "==", userEmail))
        const usersSnapshot = await getDocs(usersQuery)

        if (!usersSnapshot.empty) {
          const userData = usersSnapshot.docs[0].data()
          console.log("✅ Usuario encontrado en users:", userData)

          // Redireccionar según el rol
          switch (userData.rol) {
            case "admin":
              return "/admin"
            case "staff":
              return "/staff"
            case "jugador":
              return "/jugador"
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
            const foundUser = users.find((u: any) => u.email === userEmail)
            if (foundUser && foundUser.rol === "staff" && foundUser.estado === "activo") {
              console.log("✅ Usuario staff encontrado en localStorage")
              return "/staff"
            }
          }
        } catch (localStorageError) {
          console.log("⚠️ Error consultando localStorage:", localStorageError)
        }
      }

      // Fallback: usar lógica de email
      console.log("🔄 Usando lógica de email como fallback")
      if (userEmail.includes("@staffpro.com")) {
        return "/admin"
      } else if (userEmail.includes("@staff")) {
        return "/staff"
      } else if (userEmail.includes("@jugador") || userEmail.includes("@player")) {
        return "/jugador"
      } else {
        return "/dashboard"
      }
    } catch (error: any) {
      console.error("❌ Error determinando redirección:", error)

      // Fallback final en caso de cualquier error
      if (userEmail.includes("@staffpro.com")) {
        return "/admin"
      } else if (userEmail.includes("@staff")) {
        return "/staff"
      } else {
        return "/dashboard"
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await loginWithEmailOrUsername(usuario, password)

      if (result.success && result.userData) {
        console.log("✅ Login exitoso:", result.userData)

        // Determinar redirección basada en la base de datos
        const redirectPath = await determineUserRedirection(result.userData.user.email)
        console.log("🎯 Redirigiendo a:", redirectPath)

        router.push(redirectPath)
      } else {
        setError(result.error || "Error desconocido al iniciar sesión")
      }
    } catch (error: any) {
      console.error("Error en login:", error)
      setError("Error interno del servidor")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center">Ingresa tus credenciales para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="usuario">Usuario o Email</Label>
                <Input
                  id="usuario"
                  type="text"
                  placeholder="Usuario o email"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Iniciando sesión...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <LogIn className="w-4 h-4 mr-2" />
                    Iniciar Sesión
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
