"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { loginConEmailYPassword } from "@/lib/firebase"
import { auth, db } from "@/lib/firebaseConfig"
import { createUserWithEmailAndPassword, updateProfile, signOut, signInWithEmailAndPassword } from "firebase/auth"
import { doc, updateDoc } from "firebase/firestore"

export default function LoginForm() {
  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [syncStatus, setSyncStatus] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      console.log("🚀 Iniciando proceso de login...")
      const user = await loginConEmailYPassword(usuario, password)
      console.log("✅ Usuario autenticado:", user.uid)

      // Redirigir a la página de verificación de rol
      router.push("/after-login")
    } catch (error: any) {
      console.error("❌ Error de login:", error)

      // Mensajes de error más amigables y específicos
      if (error.code === "auth/user-not-found") {
        setError("Usuario no encontrado. Verifica tu nombre de usuario o email.")
      } else if (error.code === "auth/wrong-password") {
        setError("Contraseña incorrecta. Inténtalo de nuevo.")
      } else if (error.code === "auth/invalid-email") {
        setError("Formato de email inválido.")
      } else if (error.code === "auth/invalid-credential") {
        if (usuario === "Gmenendez") {
          setError("El usuario Gmenendez necesita ser reparado. Usa el botón de reparar usuario.")
        } else {
          setError("Usuario o contraseña incorrectos. Verifica tus credenciales.")
        }
      } else if (error.code === "auth/too-many-requests") {
        setError("Demasiados intentos fallidos. Intenta más tarde o restablece tu contraseña.")
      } else if (error.code === "auth/invalid-user-data") {
        setError("Error en los datos del usuario. Contacta al administrador.")
      } else {
        setError(error.message || "Error al iniciar sesión. Intenta nuevamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  // Función para reparar el usuario Gmenendez
  const repararUsuario = async () => {
    setLoading(true)
    setError("")
    setSuccess("")
    setSyncStatus("Iniciando reparación...")

    try {
      console.log("🔧 Iniciando reparación del usuario Gmenendez...")

      const email = "gmenendez.1748542151307@staff.local"
      const pass = "cesarvallejo"

      // Paso 1: Verificar si el usuario ya existe en Authentication
      setSyncStatus("Verificando si el usuario ya existe...")
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass)
        await signOut(auth)
        setSyncStatus("Usuario ya existe en Authentication")

        // Actualizar Firestore con el UID existente
        const userDocRef = doc(db, "users", "svfIQ2Km96VifnnTB0RW")
        await updateDoc(userDocRef, {
          firebaseUid: userCredential.user.uid,
          updatedAt: new Date().toISOString(),
        })

        setSuccess("Usuario ya existía en Authentication. Se ha actualizado el UID en Firestore.")
        return
      } catch (authError: any) {
        if (authError.code !== "auth/user-not-found" && authError.code !== "auth/invalid-credential") {
          throw authError
        }
        // Si el usuario no existe, continuamos con la creación
        setSyncStatus("Usuario no encontrado, procediendo a crear...")
      }

      // Paso 2: Crear usuario en Authentication
      setSyncStatus("Creando usuario en Authentication...")
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass)
      const newUser = userCredential.user

      // Paso 3: Actualizar perfil
      setSyncStatus("Actualizando perfil...")
      await updateProfile(newUser, {
        displayName: "German Menendez",
      })

      // Paso 4: Actualizar Firestore
      setSyncStatus("Actualizando Firestore...")
      const userDocRef = doc(db, "users", "svfIQ2Km96VifnnTB0RW")
      await updateDoc(userDocRef, {
        firebaseUid: newUser.uid,
        updatedAt: new Date().toISOString(),
      })

      // Paso 5: Cerrar sesión
      await signOut(auth)

      setSyncStatus("")
      setSuccess("✅ Usuario reparado exitosamente! Ahora puedes hacer login con 'Gmenendez' y 'cesarvallejo'")

      // Limpiar el formulario
      setUsuario("")
      setPassword("")
    } catch (error: any) {
      console.error("❌ Error al reparar usuario:", error)
      setSyncStatus("")

      if (error.code === "auth/email-already-in-use") {
        setError("El email ya está en uso. El usuario podría ya estar reparado. Intenta hacer login normalmente.")
      } else if (error.code === "auth/weak-password") {
        setError("La contraseña es muy débil. Necesita al menos 6 caracteres.")
      } else if (error.code === "auth/invalid-email") {
        setError("El formato del email no es válido.")
      } else {
        setError(`Error al reparar usuario: ${error.message || "Error desconocido"}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Iniciar Sesión</CardTitle>
          <CardDescription>Ingresa tu usuario y contraseña para acceder a la aplicación</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="usuario" className="text-sm font-medium">
                Usuario
              </label>
              <Input
                id="usuario"
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Nombre de usuario o email"
                required
                disabled={loading}
                autoComplete="username"
              />
              <p className="text-xs text-gray-500">Puedes usar tu nombre de usuario o email</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="border-red-300 bg-red-50">
                <AlertDescription className="flex items-center text-red-800">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {syncStatus && (
              <Alert className="border-blue-300 bg-blue-50">
                <AlertDescription className="flex items-center text-blue-800">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  {syncStatus}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-300 bg-green-50">
                <AlertDescription className="flex items-center text-green-800">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  {success}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>

            {/* Botón de reparar para Gmenendez */}
            {usuario === "Gmenendez" && (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full bg-orange-100 hover:bg-orange-200 text-orange-800"
                  onClick={repararUsuario}
                  disabled={loading}
                >
                  🔧 Reparar Usuario Gmenendez
                </Button>
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <p className="font-medium">¿Qué hace este botón?</p>
                  <ul className="mt-1 space-y-1">
                    <li>• Crea el usuario en Firebase Authentication</li>
                    <li>• Sincroniza con los datos de Firestore</li>
                    <li>• Permite login normal después</li>
                  </ul>
                </div>
              </div>
            )}
          </form>

          {/* Información adicional */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-blue-900 text-sm">Tipos de acceso</p>
                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                  <li>
                    • <strong>Staff:</strong> Usa tu nombre de usuario (ej: juanperez)
                  </li>
                  <li>
                    • <strong>Admin:</strong> Usa tu email completo
                  </li>
                  <li>
                    • <strong>Ambos:</strong> También puedes usar email si lo prefieres
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
