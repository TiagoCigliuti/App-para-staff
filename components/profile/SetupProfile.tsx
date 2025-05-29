"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Users } from "lucide-react"

export default function SetupProfile() {
  const { user, crearPerfil } = useAuth()
  const [rol, setRol] = useState("user")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      const result = await crearPerfil(rol)
      if (result) {
        setSuccess(true)
      } else {
        setError("No se pudo crear el perfil. Inténtalo de nuevo.")
      }
    } catch (error: any) {
      setError(error.message || "Error al crear el perfil")
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Configurar Perfil</CardTitle>
        <CardDescription>Necesitamos algunos datos adicionales para completar tu perfil.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Label>Tipo de usuario</Label>
            <RadioGroup value={rol} onValueChange={setRol} className="space-y-3">
              <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                <RadioGroupItem value="user" id="user" />
                <Label htmlFor="user" className="flex items-center cursor-pointer">
                  <Users className="mr-2 h-4 w-4" />
                  <div>
                    <p className="font-medium">Usuario</p>
                    <p className="text-sm text-muted-foreground">Acceso a funciones básicas</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-md p-3 hover:bg-gray-50">
                <RadioGroupItem value="admin" id="admin" />
                <Label htmlFor="admin" className="flex items-center cursor-pointer">
                  <Shield className="mr-2 h-4 w-4" />
                  <div>
                    <p className="font-medium">Administrador</p>
                    <p className="text-sm text-muted-foreground">Acceso completo al sistema</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>Perfil creado correctamente. Recarga la página para continuar.</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? "Creando perfil..." : "Crear Perfil"}
        </Button>
      </CardFooter>
    </Card>
  )
}
