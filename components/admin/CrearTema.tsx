"use client"

import type React from "react"

import { useState } from "react"
import { db } from "@/lib/firebaseConfig"
import { collection, addDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit3, Save, X } from "lucide-react"

interface Colors {
  primary: string
  secondary: string
  text: string
  background: string
  accent: string
  border: string
}

export default function CrearTema() {
  const router = useRouter()
  const { user, clienteData } = useAuth()
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [colors, setColors] = useState<Colors>({
    primary: "#1e40af",
    secondary: "#64748b",
    text: "#1f2937",
    background: "#ffffff",
    accent: "#f59e0b",
    border: "#e5e7eb",
  })

  const handleColorChange = (key: keyof Colors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      if (!name.trim()) {
        setError("El nombre del tema es requerido")
        setLoading(false)
        return
      }

      await addDoc(collection(db, "themes"), {
        name: name.trim(),
        colors,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      setSuccess(true)
      setTimeout(() => {
        router.push("/admin/temas")
      }, 1500)
    } catch (err: any) {
      console.error("Error al crear tema:", err)
      setError("Error al crear el tema. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  // Verificar permisos
  if (clienteData && !clienteData.esAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Acceso denegado</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium text-gray-800 mb-8">Crear nuevo tema personalizado</h1>

          {/* Back Button */}
          <div className="flex justify-start mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push("/admin/temas")}
              className="text-gray-600 hover:text-purple-600"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a temas
            </Button>
          </div>
        </div>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Edit3 className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-medium text-gray-900">Información del Tema</h2>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Theme Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Tema</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Corporativo Azul"
                  className="border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Main Colors */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-4">Colores Principales</h5>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Color Primario</span>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-8 h-8 rounded border border-gray-200"
                            style={{ backgroundColor: colors.primary }}
                          />
                          <Input
                            type="text"
                            value={colors.primary}
                            onChange={(e) => handleColorChange("primary", e.target.value)}
                            className="w-20 text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Color Secundario</span>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-8 h-8 rounded border border-gray-200"
                            style={{ backgroundColor: colors.secondary }}
                          />
                          <Input
                            type="text"
                            value={colors.secondary}
                            onChange={(e) => handleColorChange("secondary", e.target.value)}
                            className="w-20 text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Color de Fondo</span>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-8 h-8 rounded border border-gray-200"
                            style={{ backgroundColor: colors.background }}
                          />
                          <Input
                            type="text"
                            value={colors.background}
                            onChange={(e) => handleColorChange("background", e.target.value)}
                            className="w-20 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Additional Colors */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-4">Colores Adicionales</h5>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Color de Texto</span>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-8 h-8 rounded border border-gray-200"
                            style={{ backgroundColor: colors.text }}
                          />
                          <Input
                            type="text"
                            value={colors.text}
                            onChange={(e) => handleColorChange("text", e.target.value)}
                            className="w-20 text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Color de Acento</span>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-8 h-8 rounded border border-gray-200"
                            style={{ backgroundColor: colors.accent }}
                          />
                          <Input
                            type="text"
                            value={colors.accent}
                            onChange={(e) => handleColorChange("accent", e.target.value)}
                            className="w-20 text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Color de Borde</span>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-8 h-8 rounded border border-gray-200"
                            style={{ backgroundColor: colors.border }}
                          />
                          <Input
                            type="text"
                            value={colors.border}
                            onChange={(e) => handleColorChange("border", e.target.value)}
                            className="w-20 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-8">
                <h5 className="text-sm font-medium text-gray-900 mb-4">Vista Previa</h5>
                <div
                  className="p-4 rounded-lg border-2"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium" style={{ color: colors.primary }}>
                      {name || "Nombre del tema"}
                    </h3>
                    <Badge variant="outline">Vista Previa</Badge>
                  </div>
                  <div className="flex space-x-2 mb-2">
                    <Badge
                      style={{
                        backgroundColor: colors.primary,
                        color: colors.background,
                      }}
                    >
                      Primario
                    </Badge>
                    <Badge
                      style={{
                        backgroundColor: colors.secondary,
                        color: colors.text,
                      }}
                    >
                      Secundario
                    </Badge>
                  </div>
                  <p className="text-sm" style={{ color: colors.text }}>
                    Texto de ejemplo
                  </p>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <Alert variant="destructive" className="mt-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mt-6 bg-green-50 text-green-800 border-green-200">
                  <AlertDescription>Tema creado exitosamente. Redirigiendo...</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 mt-8 pt-6 border-t border-gray-200">
                <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Guardando..." : "Guardar Tema"}
                </Button>
                <Button type="button" onClick={() => router.push("/admin/temas")} variant="outline" disabled={loading}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
