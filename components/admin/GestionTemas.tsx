"use client"

import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Palette, Plus, Search, Edit, Trash2, ArrowLeft, Eye, Calendar } from "lucide-react"

interface Tema {
  id: string
  name: string
  colors: {
    [key: string]: string
  }
  createdAt: string
  updatedAt: string
}

export default function GestionTemas() {
  const [temas, setTemas] = useState<Tema[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()
  const { user, clienteData } = useAuth()

  useEffect(() => {
    // Verificar permisos de admin
    if (clienteData && !clienteData.esAdmin) {
      router.push("/dashboard")
      return
    }

    const fetchTemas = async () => {
      try {
        const snapshot = await getDocs(collection(db, "themes"))
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Tema[]
        setTemas(data)
      } catch (error) {
        console.error("Error al cargar temas:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTemas()
  }, [clienteData, router])

  const temasFiltrados = temas.filter((tema) => tema.name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando temas...</p>
        </div>
      </div>
    )
  }

  if (clienteData && !clienteData.esAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Acceso denegado</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => router.push("/admin")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Temas</h1>
                <p className="text-gray-600 mt-2">Crea y administra temas personalizados</p>
              </div>
            </div>
            <Button onClick={() => router.push("/admin/temas/nuevo")}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Nuevo Tema
            </Button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Temas</CardTitle>
              <Palette className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{temas.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temas Activos</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{temas.length}</div>
              <p className="text-xs text-muted-foreground">Todos disponibles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Último Creado</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {temas.length > 0
                  ? new Date(
                      Math.max(...temas.map((t) => new Date(t.createdAt || t.updatedAt).getTime())),
                    ).toLocaleDateString()
                  : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar temas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de Temas */}
        {temasFiltrados.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Palette className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? "No se encontraron temas" : "No hay temas aún"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? "Intenta con otros términos de búsqueda" : "Comienza creando tu primer tema"}
              </p>
              <Button onClick={() => router.push("/admin/temas/nuevo")}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Tema
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {temasFiltrados.map((tema) => (
              <Card key={tema.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{tema.name}</CardTitle>
                    <Badge variant="default">Activo</Badge>
                  </div>
                  <CardDescription>ID: {tema.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Vista previa de colores */}
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Paleta de colores:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {tema.colors &&
                        Object.entries(tema.colors).map(([key, value]) => (
                          <div key={key} className="text-center">
                            <div
                              className="w-full h-8 rounded border"
                              style={{ backgroundColor: value }}
                              title={`${key}: ${value}`}
                            ></div>
                            <p className="text-xs text-gray-600 mt-1 capitalize">{key}</p>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Vista previa del tema */}
                  {tema.colors && (
                    <div
                      className="p-3 rounded border mb-4"
                      style={{
                        backgroundColor: tema.colors.background || "#ffffff",
                        color: tema.colors.text || "#000000",
                        borderColor: tema.colors.border || "#e5e7eb",
                      }}
                    >
                      <h4 className="font-semibold" style={{ color: tema.colors.primary || "#000000" }}>
                        Vista Previa
                      </h4>
                      <p className="text-sm">Texto de ejemplo</p>
                      <div className="flex space-x-2 mt-2">
                        <div
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: tema.colors.primary || "#000000",
                            color: tema.colors.background || "#ffffff",
                          }}
                        >
                          Primario
                        </div>
                        <div
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: tema.colors.accent || "#cccccc",
                            color: tema.colors.text || "#000000",
                          }}
                        >
                          Acento
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Información de fechas */}
                  <div className="text-xs text-gray-600 mb-4 space-y-1">
                    <p>Creado: {new Date(tema.createdAt || tema.updatedAt).toLocaleDateString()}</p>
                    <p>Actualizado: {new Date(tema.updatedAt || tema.createdAt).toLocaleDateString()}</p>
                  </div>

                  {/* Acciones */}
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="mr-1 h-3 w-3" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="mr-1 h-3 w-3" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
