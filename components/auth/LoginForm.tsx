"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { loginWithEmailOrUsername, activateJugadorOnFirstLogin } from "@/lib/firebase"

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
      console.log("🔐 Iniciando proceso de login...")

      // Detectar si es email o username
      const esEmail = usuario.includes("@")
      
      if (esEmail && usuario.includes("@jugador.com")) {
        // Es un jugador que podría necesitar activación
        console.log("🎯 Detectado como jugador, verificando si necesita activación...")
        
        try {
          // Intentar activar si es necesario
          const activationResult = await activateJugadorOnFirstLogin(usuario, password)
          
          if (activationResult.success) {
            console.log("✅ Jugador activado exitosamente en primer login")
            
            // Redirigir según el rol
            router.push("/jugador")
            return
          }
        } catch (activationError: any) {
          console.log("⚠️ Error en activación o jugador ya activado, intentando login normal...")
          
          // Si falla la activación, continuar con login normal
        }
      }

      // Login normal
      const result = await loginWithEmailOrUsername(usuario, password)

      if (result.success && result.userData) {
        console.log("✅ Login exitoso")

        // Redirigir según el rol del usuario
        if (result.userData.isAdmin) {
          router.push("/admin")
        } else if (result.userData.isStaff) {
          router.push("/staff")
        } else if (result.userData.isJugador) {
          router.push("/jugador")
        } else {
          // Fallback: redirigir al dashboard general
          router.push("/dashboard")
        }
      } else {
        setError(result.error || "Error de autenticación")
      }
    } catch (error: any) {
      console.error("❌ Error en login:", error)
      setError("Error de conexión. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Iniciar Sesión</CardTitle>
        <CardDescription className="text-center">
          Ingresa tus credenciales para acceder al sistema
        </CardDescription>
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
              <AlertCircle className="h-4 w-4" />
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
              "Iniciar Sesión"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Tipos de usuario:</p>
          <div className="mt-2 space-y-1">
            <p><strong>Admin:</strong> admin@staffpro.com</p>
            <p><strong>Staff:</strong> usuario@staff.com</p>
            <p><strong>Jugador:</strong> usuario@jugador.com</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
