"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Search, Edit3, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"

interface Tema {
  id: string
  name: string
  colors: {
    primary: string
    secondary: string
    background: string
    text: string
    accent: string
    border: string
  }
  createdAt: string
  updatedAt: string
}

export default function TemasPage() {
  const { user, clienteData, loading } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [temas, setTemas] = useState<Tema[]>([])
  const [loadingTemas, setLoadingTemas] = useState(true)
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null)
  const [editingTheme, setEditingTheme] = useState<Tema | null>(null)
  const [updating, setUpdating] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    ultimoCreado: "",
  })

  useEffect(() => {
    if (!loading && (!clienteData?.esAdmin || !user)) {
      router.push("/dashboard")
    }
  }, [user, clienteData, loading, router])

  useEffect(() => {
    const fetchTemas = async () => {
      try {
        const snapshot = await getDocs(collection(db, "themes"))
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Tema[]
        setTemas(data)

        // Calcular estadísticas
        let ultimaFecha = new Date(0) // Fecha inicial muy antigua
        data.forEach((tema) => {
          const fechaCreacion = new Date(tema.createdAt || tema.updatedAt)
          if (fechaCreacion > ultimaFecha) {
            ultimaFecha = fechaCreacion
          }
        })

        setStats({
          total: data.length,
          activos: data.length, // Todos los temas están activos por defecto
          ultimoCreado: data.length > 0 ? ultimaFecha.toLocaleDateString() : "N/A",
        })
      } catch (error) {
        console.error("Error al cargar temas:", error)
      } finally {
        setLoadingTemas(false)
      }
    }

    if (clienteData?.esAdmin) {
      fetchTemas()
    }
  }, [clienteData])

  const handleEditTheme = (tema: Tema) => {
    setEditingTheme({ ...tema })
    setExpandedTheme(tema.id)
  }

  const handleUpdateTheme = async () => {
    if (!editingTheme) return

    setUpdating(true)
    try {
      const themeRef = doc(db, "themes", editingTheme.id)
      await updateDoc(themeRef, {
        name: editingTheme.name,
        colors: editingTheme.colors,
        updatedAt: new Date().toISOString(),
      })

      // Actualizar en el estado local
      setTemas((prev) => prev.map((t) => (t.id === editingTheme.id ? editingTheme : t)))
      setEditingTheme(null)
      setExpandedTheme(null)
    } catch (error) {
      console.error("Error al actualizar tema:", error)
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteTheme = async (themeId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este tema?")) return

    try {
      await deleteDoc(doc(db, "themes", themeId))
      setTemas((prev) => prev.filter((t) => t.id !== themeId))
      setExpandedTheme(null)
      setEditingTheme(null)

      // Actualizar estadísticas
      setStats((prev) => ({
        ...prev,
        total: prev.total - 1,
        activos: prev.activos - 1,
      }))
    } catch (error) {
      console.error("Error al eliminar tema:", error)
    }
  }

  const handleColorChange = (colorKey: keyof Tema["colors"], value: string) => {
    if (!editingTheme) return
    setEditingTheme((prev) => ({
      ...prev!,
      colors: {
        ...prev!.colors,
        [colorKey]: value,
      },
    }))
  }

  const temasFiltrados = temas.filter((tema) => tema.name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (loading || loadingTemas) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando gestión de temas...</p>
        </div>
      </div>
    )
  }

  if (!clienteData?.esAdmin) {
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
          <h1 className="text-2xl font-medium text-gray-800 mb-8">
            Crear y administrar temas personalizados para clientes
          </h1>

          {/* Back Button */}
          <div className="flex justify-start mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push("/admin")}
              className="text-gray-600 hover:text-purple-600"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al panel
            </Button>
          </div>

          {/* Search and Create */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar tema por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-200 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <Button
              onClick={() => router.push("/admin/temas/nuevo")}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear Nuevo Tema
            </Button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <p className="text-sm text-gray-600">Total Temas</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.activos}</div>
              <p className="text-sm text-gray-600">Temas Activos</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-gray-900">{stats.ultimoCreado}</div>
              <p className="text-sm text-gray-600">Último Creado</p>
            </CardContent>
          </Card>
        </div>

        {/* Themes List */}
        <div className="space-y-4">
          {temasFiltrados.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Edit3 className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? "No se encontraron temas" : "No hay temas aún"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? "Intenta con otros términos de búsqueda" : "Comienza creando tu primer tema"}
              </p>
              <Button onClick={() => router.push("/admin/temas/nuevo")} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="mr-2 h-4 w-4" />
                Crear Tema
              </Button>
            </Card>
          ) : (
            temasFiltrados.map((tema) => (
              <Card key={tema.id} className="border border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  {/* Theme Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">{tema.name}</h3>
                      <div className="flex space-x-1">
                        {Object.values(tema.colors)
                          .slice(0, 4)
                          .map((color, index) => (
                            <div
                              key={index}
                              className="w-4 h-4 rounded-full border border-gray-200"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (expandedTheme === tema.id) {
                          setExpandedTheme(null)
                          setEditingTheme(null)
                        } else {
                          handleEditTheme(tema)
                        }
                      }}
                      className="text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                      title={expandedTheme === tema.id ? "Cerrar edición" : "Editar tema"}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Theme Info */}
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <p>
                      <span className="font-medium">ID:</span> {tema.id}
                    </p>
                    <p>
                      <span className="font-medium">Creado:</span> {new Date(tema.createdAt).toLocaleDateString()}
                    </p>
                    <p>
                      <span className="font-medium">Actualizado:</span> {new Date(tema.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Expanded Edit Section */}
                  {expandedTheme === tema.id && editingTheme && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center space-x-2 mb-6">
                        <Edit3 className="h-5 w-5 text-purple-600" />
                        <h4 className="text-lg font-medium text-gray-900">Editar Tema</h4>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column */}
                        <div className="space-y-6">
                          {/* Theme Name */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Tema</label>
                            <Input
                              value={editingTheme.name}
                              onChange={(e) => setEditingTheme((prev) => ({ ...prev!, name: e.target.value }))}
                              className="border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                            />
                          </div>

                          {/* Main Colors */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-4">Colores Principales</h5>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">Color Primario</span>
                                <div className="flex items-center space-x-2">
                                  <div
                                    className="w-8 h-8 rounded border border-gray-200"
                                    style={{ backgroundColor: editingTheme.colors.primary }}
                                  />
                                  <Input
                                    type="text"
                                    value={editingTheme.colors.primary}
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
                                    style={{ backgroundColor: editingTheme.colors.secondary }}
                                  />
                                  <Input
                                    type="text"
                                    value={editingTheme.colors.secondary}
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
                                    style={{ backgroundColor: editingTheme.colors.background }}
                                  />
                                  <Input
                                    type="text"
                                    value={editingTheme.colors.background}
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
                                    style={{ backgroundColor: editingTheme.colors.text }}
                                  />
                                  <Input
                                    type="text"
                                    value={editingTheme.colors.text}
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
                                    style={{ backgroundColor: editingTheme.colors.accent }}
                                  />
                                  <Input
                                    type="text"
                                    value={editingTheme.colors.accent}
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
                                    style={{ backgroundColor: editingTheme.colors.border }}
                                  />
                                  <Input
                                    type="text"
                                    value={editingTheme.colors.border}
                                    onChange={(e) => handleColorChange("border", e.target.value)}
                                    className="w-20 text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Preview */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-4">Vista Previa</h5>
                            <div
                              className="p-4 rounded-lg border-2"
                              style={{
                                backgroundColor: editingTheme.colors.background,
                                borderColor: editingTheme.colors.border,
                              }}
                            >
                              <div className="flex space-x-2 mb-2">
                                <span
                                  className="px-2 py-1 rounded text-xs"
                                  style={{
                                    backgroundColor: editingTheme.colors.primary,
                                    color: editingTheme.colors.background,
                                  }}
                                >
                                  Primario
                                </span>
                                <span
                                  className="px-2 py-1 rounded text-xs"
                                  style={{
                                    backgroundColor: editingTheme.colors.accent,
                                    color: editingTheme.colors.text,
                                  }}
                                >
                                  Acento
                                </span>
                              </div>
                              <p className="text-sm" style={{ color: editingTheme.colors.text }}>
                                Texto de ejemplo
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
                        <Button variant="destructive" onClick={() => handleDeleteTheme(tema.id)} disabled={updating}>
                          Eliminar Tema
                        </Button>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setExpandedTheme(null)
                              setEditingTheme(null)
                            }}
                            disabled={updating}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleUpdateTheme}
                            disabled={updating}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {updating ? "Guardando..." : "Guardar Cambios"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
