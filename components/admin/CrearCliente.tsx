"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebaseConfig"
import { collection, addDoc, getDocs } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Building, Save, Upload } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { useEffect } from "react"

interface Tema {
  id: string
  name: string
}

const modulosDisponibles = [
  { id: "jugadores", label: "Jugadores" },
  { id: "calendario", label: "Calendario" },
  { id: "carga_interna", label: "Carga Interna" },
  { id: "entrenamientos", label: "Entrenamientos" },
  { id: "evaluaciones", label: "Evaluaciones" },
  { id: "carga_externa", label: "Carga Externa" },
  { id: "partidos", label: "Partidos" },
  { id: "ingreso_jugadores", label: "Ingreso de Jugadores" },
]

export default function CrearCliente() {
  const router = useRouter()
  const { clienteData } = useAuth()

  const [name, setName] = useState("")
  const [clubName, setClubName] = useState("")
  const [logo, setLogo] = useState<string | null>(null)
  const [themeId, setThemeId] = useState("")
  const [enabledModules, setEnabledModules] = useState<string[]>([])
  const [temas, setTemas] = useState<Tema[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [status, setStatus] = useState("active")

  // Verificar permisos de admin
  useEffect(() => {
    if (clienteData && !clienteData.esAdmin) {
      router.push("/dashboard")
    }
  }, [clienteData, router])

  // Cargar temas disponibles
  useEffect(() => {
    const fetchTemas = async () => {
      try {
        const snapshot = await getDocs(collection(db, "themes"))
        const temasData = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }))
        setTemas(temasData)

        // Si hay temas, seleccionar el primero por defecto
        if (temasData.length > 0) {
          setThemeId(temasData[0].id)
        }
      } catch (error) {
        console.error("Error al cargar temas:", error)
      }
    }

    fetchTemas()
  }, [])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setLogo(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleModuleToggle = (modulo: string) => {
    setEnabledModules((prev) => (prev.includes(modulo) ? prev.filter((m) => m !== modulo) : [...prev, modulo]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (!name.trim() || !clubName.trim()) {
        setError("El nombre y el nombre del club son obligatorios")
        setLoading(false)
        return
      }

      await addDoc(collection(db, "clients"), {
        name: name.trim(),
        clubName: clubName.trim(),
        logo,
        theme: themeId,
        activo: status === "active",
        enabledModules,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      setSuccess(true)
      setTimeout(() => {
        router.push("/admin/clientes")
      }, 1500)
    } catch (err: any) {
      console.error("Error al crear cliente:", err)
      setError("Error al crear el cliente. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium text-gray-800 mb-8">Crear nuevo cliente</h1>

          {/* Back Button */}
          <div className="flex justify-start mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push("/admin/clientes")}
              className="text-gray-600 hover:text-purple-600"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a clientes
            </Button>
          </div>
        </div>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Building className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-medium text-gray-900">Información del Cliente</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del cliente</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    required
                    className="border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500">Nombre de la persona física responsable del cliente</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clubName">Nombre del club</Label>
                  <Input
                    id="clubName"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    placeholder="Ej: Club Atlético Independiente"
                    required
                    className="border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500">Nombre que se mostrará en la interfaz de la aplicación</p>
                </div>
              </div>

              {/* Logo */}
              <div className="space-y-2">
                <Label htmlFor="logo">Logo del club</Label>
                <div className="flex items-center space-x-4">
                  <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                    {logo ? (
                      <img
                        src={logo || "/placeholder.svg"}
                        alt="Logo preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <Building className="h-10 w-10 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <div className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md transition-colors">
                        <Upload className="h-4 w-4" />
                        <span>Seleccionar imagen</span>
                      </div>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </Label>
                    <p className="text-xs text-gray-500 mt-2">Formatos recomendados: PNG, JPG. Tamaño máximo: 2MB</p>
                  </div>
                </div>
              </div>

              {/* Tema */}
              <div className="space-y-2">
                <Label htmlFor="theme">Tema</Label>
                <Select value={themeId} onValueChange={setThemeId}>
                  <SelectTrigger className="border-gray-200 focus:border-purple-500 focus:ring-purple-500">
                    <SelectValue placeholder="Selecciona un tema" />
                  </SelectTrigger>
                  <SelectContent>
                    {temas.length > 0 ? (
                      temas.map((tema) => (
                        <SelectItem key={tema.id} value={tema.id}>
                          {tema.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="default" disabled>
                        No hay temas disponibles
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  El tema define los colores y apariencia de la interfaz para este cliente
                </p>
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <Label htmlFor="status">Estado inicial</Label>
                <Select value={status} onValueChange={(value) => setStatus(value)}>
                  <SelectTrigger className="border-gray-200 focus:border-purple-500 focus:ring-purple-500">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                  <p className="text-xs text-gray-500">
                    Define si el cliente estará activo desde el momento de su creación
                  </p>
                </Select>
              </div>

              {/* Módulos */}
              <div className="space-y-4">
                <Label>Módulos habilitados</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {modulosDisponibles.map((modulo) => (
                    <div key={modulo.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`module-${modulo.id}`}
                        checked={enabledModules.includes(modulo.id)}
                        onCheckedChange={() => handleModuleToggle(modulo.id)}
                      />
                      <Label htmlFor={`module-${modulo.id}`} className="text-sm font-normal cursor-pointer">
                        {modulo.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Selecciona los módulos que estarán disponibles para este cliente
                </p>
              </div>

              {/* Mensajes */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <AlertDescription>Cliente creado exitosamente. Redirigiendo...</AlertDescription>
                </Alert>
              )}

              {/* Botones de acción */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/clientes")}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Guardando..." : "Guardar Cliente"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
