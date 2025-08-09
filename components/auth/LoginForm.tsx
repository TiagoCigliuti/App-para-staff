"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { loginWithEmailOrUsername, activateJugadorOnFirstLogin } from "@/lib/firebase"
import { collection, getDocs, limit, query, where } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { getAuth } from "firebase/auth"

export default function LoginForm() {
  const [usuario, setUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Detectar si es email o username
      const esEmail = usuario.includes("@")

      if (esEmail && usuario.includes("@jugador.com")) {
        // Es un jugador que podría necesitar activación
        try {
          const activationResult = await activateJugadorOnFirstLogin(usuario, password)
          if (activationResult.success) {
            router.push("/jugador")
            return
          }
        } catch {
          // Si falla la activación, continuar con login normal
        }
      }

      // Login normal
      const result = await loginWithEmailOrUsername(usuario, password)

      // Redirección directa para rol "cuestionario"
      if (result.success) {
        try {
          const auth = getAuth()
          const current = auth.currentUser
          const candidates = ["usuarios-custionario", "usuarios-cuestionario"]
          let isCuestionario = false

          for (const colName of candidates) {
            const baseRef = collection(db, colName)
            const queries = [
              current?.uid ? query(baseRef, where("uid", "==", current.uid), limit(1)) : null,
              current?.email ? query(baseRef, where("email", "==", current.email), limit(1)) : null,
            ].filter(Boolean) as any[]

            for (const q of queries) {
              const snap = await getDocs(q)
              if (!snap.empty) {
                const data = snap.docs[0].data() as any
                if ((data.rol || "").toLowerCase() === "cuestionario") {
                  isCuestionario = true
                }
                break
              }
            }

            if (isCuestionario) break
          }

          if (isCuestionario) {
            router.push("/cuestionario")
            return
          }
        } catch {
          // Si falla la detección, continúa con la lógica normal de otros roles.
        }
      }

      if (result.success && result.userData) {
        if (result.userData.isAdmin) {
          router.push("/admin")
        } else if (result.userData.isStaff) {
          router.push("/staff")
        } else if (result.userData.isJugador) {
          router.push("/jugador")
        } else {
          router.push("/dashboard")
        }
      } else {
        setError(result.error || "Error de autenticación")
      }
    } catch (error) {
      console.error("Error en login:", error)
      setError("Error de conexión. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
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
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="usuario o email@ejemplo.com"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
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
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Iniciando sesión...
              </div>
            ) : (
              "Iniciar Sesión"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
