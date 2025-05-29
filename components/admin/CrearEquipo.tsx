"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, Trophy } from "lucide-react"
import { useRouter } from "next/navigation"
import { collection, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"

interface FormData {
  nombre: string
  logoUrl: string
}

export default function CrearEquipo() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    logoUrl: "",
  })
  const [uploading, setUploading] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string>("")

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".")
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof FormData],
          [child]: value,
        },
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }))
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tamaño (2MB máximo)
    if (file.size > 2 * 1024 * 1024) {
      alert("El archivo es demasiado grande. Máximo 2MB.")
      return
    }

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona un archivo de imagen válido.")
      return
    }

    // Crear vista previa
    const reader = new FileReader()
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Subir archivo (simulado - aquí puedes integrar con Firebase Storage)
    setUploading(true)
    try {
      // Simular subida de archivo
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // En una implementación real, aquí subirías a Firebase Storage
      // const logoUrl = await uploadToFirebaseStorage(file)
      const logoUrl = URL.createObjectURL(file) // Temporal para demo

      handleInputChange("logoUrl", logoUrl)
    } catch (error) {
      console.error("Error al subir logo:", error)
      alert("Error al subir el logo")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nombre) {
      alert("Por favor ingresa el nombre del club")
      return
    }

    setLoading(true)

    try {
      const equipoData = {
        nombre: formData.nombre,
        logoUrl: formData.logoUrl,
        activo: true,
        jugadores: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }

      await addDoc(collection(db, "equipos"), equipoData)

      alert("Equipo creado exitosamente")
      router.push("/admin/equipos")
    } catch (error) {
      console.error("Error al crear equipo:", error)
      alert("Error al crear el equipo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/equipos")}
              className="flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Equipos
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Crear Nuevo Equipo</h1>
              <p className="text-gray-600">Registra un nuevo club o equipo deportivo</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="mr-2 h-5 w-5" />
                  Información del Club
                </CardTitle>
                <CardDescription>Datos básicos del nuevo equipo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del Club *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange("nombre", e.target.value)}
                    placeholder="Ej: Real Madrid CF"
                    required
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Logo/Escudo del Club</Label>
                  <div className="space-y-4">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-sm text-gray-500">Formatos soportados: JPG, PNG, SVG. Tamaño máximo: 2MB</p>

                    {/* Vista previa del logo */}
                    {(formData.logoUrl || logoPreview) && (
                      <div className="flex items-center space-x-4 p-4 border rounded-lg bg-gray-50">
                        <div className="w-16 h-16 border rounded-lg overflow-hidden bg-white flex items-center justify-center">
                          <img
                            src={logoPreview || formData.logoUrl}
                            alt="Vista previa del logo"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Vista previa del escudo</p>
                          <p className="text-xs text-gray-500">{formData.nombre || "Nombre del club"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botones de acción */}
            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => router.push("/admin/equipos")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || uploading}>
                {loading || uploading ? (
                  uploading ? (
                    "Subiendo logo..."
                  ) : (
                    "Creando..."
                  )
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Crear Equipo
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
