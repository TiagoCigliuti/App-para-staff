"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Building, Plus, Search, Edit, ArrowLeft, Calendar, Palette } from "lucide-react"

interface Cliente {
  id: string
  name: string
  clubName: string
  createdAt: string
  updatedAt: string
  logo: string | null
  theme: string
  colors: any
  activo: boolean
}

export default function GestionClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    conTema: 0,
    conLogo: 0,
    nuevos30d: 0,
  })
  const router = useRouter()
  const { user, clienteData } = useAuth()

  useEffect(() => {
    // Verificar permisos de admin
    if (clienteData && !clienteData.esAdmin) {
      router.push("/dashboard")
      return
    }

    const fetchClientes = async () => {
      try {
        const snapshot = await getDocs(collection(db, "clients"))
        const data = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const cliente = docSnap.data()
            const themeId = cliente.theme
            const themeDoc = themeId ? await getDoc(doc(db, "themes", themeId)) : null

            return {
              id: docSnap.id,
              name: cliente.name || "",
              clubName: cliente.clubName || "",
              createdAt: cliente.createdAt || new Date().toISOString(),
              updatedAt: cliente.updatedAt || new Date().toISOString(),
              logo: cliente.logo || null,
              theme: themeDoc?.data()?.name || "Sin tema",
              colors: themeDoc?.data()?.colors || null,
              activo: cliente.activo !== undefined ? cliente.activo : true, // Por defecto activo si no existe el campo
            }
          }),
        )
        setClientes(data)

        // Calcular estadísticas
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        setStats({
          total: data.length,
          activos: data.filter((c) => c.activo).length,
          conTema: data.filter((c) => c.theme !== "Sin tema").length,
          conLogo: data.filter((c) => c.logo).length,
          nuevos30d: data.filter((c) => new Date(c.createdAt) > thirtyDaysAgo).length,
        })
      } catch (error) {
        console.error("Error al cargar clientes:", error)
      } finally {
        setLoading(false)
      }
    }

    if (clienteData?.esAdmin) {
      fetchClientes()
    }
  }, [clienteData, router])

  const clientesFiltrados = clientes.filter(
    (cliente) =>
      cliente.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.clubName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando clientes...</p>
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium text-gray-800 mb-8">Administrar clientes y sus configuraciones</h1>

          {/* Search and Create */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar cliente por nombre o club..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-200 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <Button
              onClick={() => router.push("/admin/clientes/nuevo")}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear Nuevo Cliente
            </Button>
          </div>

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
        </div>

        {/* Estadísticas */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <Building className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <p className="text-sm text-gray-600">Total Clientes</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <Palette className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.conTema}</div>
              <p className="text-sm text-gray-600">Con Tema</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.nuevos30d}</div>
              <p className="text-sm text-gray-600">Nuevos (30d)</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <Building className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.conLogo}</div>
              <p className="text-sm text-gray-600">Con Logo</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Clientes */}
        {clientesFiltrados.length === 0 ? (
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? "No se encontraron clientes" : "No hay clientes aún"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? "Intenta con otros términos de búsqueda" : "Comienza agregando tu primer cliente"}
              </p>
              <Button
                onClick={() => router.push("/admin/clientes/nuevo")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar Cliente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {clientesFiltrados.map((cliente) => (
              <Card key={cliente.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {/* Logo y Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {cliente.logo ? (
                        <img
                          src={cliente.logo || "/placeholder.svg"}
                          alt={`Logo ${cliente.clubName}`}
                          className="w-12 h-12 object-contain rounded border border-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                          <Building className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{cliente.clubName}</h3>
                        <p className="text-sm text-gray-600">Cliente: {cliente.name}</p>
                      </div>
                    </div>
                    <Badge
                      className={
                        cliente.activo
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-red-100 text-red-800 hover:bg-red-200"
                      }
                    >
                      {cliente.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>

                  {/* Información del Tema */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Tema:</span>
                      <Badge variant={cliente.theme === "Sin tema" ? "secondary" : "default"}>{cliente.theme}</Badge>
                    </div>
                    {cliente.colors && (
                      <div className="flex space-x-1">
                        {Object.values(cliente.colors)
                          .slice(0, 6)
                          .map((color: any, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 rounded-full border border-gray-200"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Fechas */}
                  <div className="text-xs text-gray-600 space-y-1 mb-4">
                    <p>
                      <span className="font-medium">Creado:</span> {new Date(cliente.createdAt).toLocaleDateString()}
                    </p>
                    <p>
                      <span className="font-medium">Actualizado:</span>{" "}
                      {new Date(cliente.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Acciones */}
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/admin/clientes/editar/${cliente.id}`)}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Editar Cliente
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
