"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Users, Plus, Search, Edit, ArrowLeft, Calendar, Building, User, Palette } from "lucide-react"

interface Usuario {
  id: string
  username: string
  firstName: string
  lastName: string
  role: string
  status: string
  clientId: string
  equipoId: string
  equipoNombre?: string // Agregar esta línea
  themeId: string
  createdAt: string
  updatedAt?: string
  fotoPerfil?: string | null
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [clientes, setClientes] = useState<{ [key: string]: string }>({})
  const [temas, setTemas] = useState<{ [key: string]: string }>({})
  const [equipos, setEquipos] = useState<{ [key: string]: { name: string; logo?: string } }>({})
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    clientesAsignados: 0,
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

    const fetchData = async () => {
      try {
        // Cargar clientes
        const clientesSnapshot = await getDocs(collection(db, "clients"))
        const clientesData: { [key: string]: string } = {}
        clientesSnapshot.docs.forEach((doc) => {
          clientesData[doc.id] = doc.data().clubName || doc.data().name || "Cliente sin nombre"
        })
        setClientes(clientesData)

        // Cargar temas
        const temasSnapshot = await getDocs(collection(db, "themes"))
        const temasData: { [key: string]: string } = {}
        temasSnapshot.docs.forEach((doc) => {
          temasData[doc.id] = doc.data().name || "Tema sin nombre"
        })
        setTemas(temasData)

        // Cargar equipos
        const equiposSnapshot = await getDocs(collection(db, "clients"))
        const equiposData: { [key: string]: { name: string; logo?: string } } = {}
        equiposSnapshot.docs.forEach((doc) => {
          equiposData[doc.id] = {
            name: doc.data().clubName || doc.data().name || "Equipo sin nombre",
            logo: doc.data().logo || null,
          }
        })
        setEquipos(equiposData)

        // Cargar usuarios staff
        const q = query(collection(db, "users"), where("role", "==", "staff"))
        const snapshot = await getDocs(q)
        const usuariosData = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            username: data.username || "",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            role: data.role || "staff",
            status: data.status || "inactive",
            clientId: data.clientId || "",
            equipoId: data.equipoId || "",
            equipoNombre: data.equipoNombre || "", // Agregar esta línea
            themeId: data.themeId || "",
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
            fotoPerfil: data.fotoPerfil || data.profilePicture || null,
          }
        })
        setUsuarios(usuariosData)

        // Calcular estadísticas
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const clientesAsignados = new Set(usuariosData.map((u) => u.clientId).filter((id) => id)).size

        setStats({
          total: usuariosData.length,
          activos: usuariosData.filter((u) => u.status === "active").length,
          clientesAsignados,
          nuevos30d: usuariosData.filter((u) => new Date(u.createdAt) > thirtyDaysAgo).length,
        })
      } catch (error) {
        console.error("Error al cargar datos:", error)
      } finally {
        setLoading(false)
      }
    }

    if (clienteData?.esAdmin) {
      fetchData()
    }
  }, [clienteData, router])

  const usuariosFiltrados = usuarios.filter(
    (usuario) =>
      usuario.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (clientes[usuario.clientId] || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Obtener iniciales para el avatar
  const getInitials = (usuario: Usuario) => {
    if (usuario.firstName && usuario.lastName) {
      return `${usuario.firstName.charAt(0)}${usuario.lastName.charAt(0)}`.toUpperCase()
    } else if (usuario.firstName) {
      return usuario.firstName.charAt(0).toUpperCase()
    } else {
      return usuario.username.charAt(0).toUpperCase()
    }
  }

  // Obtener nombre completo
  const getNombreCompleto = (usuario: Usuario) => {
    if (usuario.firstName && usuario.lastName) {
      return `${usuario.firstName} ${usuario.lastName}`
    } else if (usuario.firstName) {
      return usuario.firstName
    } else {
      return usuario.username
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando usuarios...</p>
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
          <h1 className="text-2xl font-medium text-gray-800 mb-8">Administrar usuarios staff del sistema</h1>

          {/* Search and Create */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar usuario por nombre, apellido o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-200 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
            <Button
              onClick={() => router.push("/admin/usuarios/nuevo")}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear Nuevo Usuario
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
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <p className="text-sm text-gray-600">Total Staff</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <User className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.activos}</div>
              <p className="text-sm text-gray-600">Activos</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <Building className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.clientesAsignados}</div>
              <p className="text-sm text-gray-600">Clientes Asignados</p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.nuevos30d}</div>
              <p className="text-sm text-gray-600">Nuevos (30d)</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Usuarios */}
        {usuariosFiltrados.length === 0 ? (
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? "No se encontraron usuarios" : "No hay usuarios staff aún"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? "Intenta con otros términos de búsqueda" : "Comienza agregando tu primer usuario staff"}
              </p>
              <Button
                onClick={() => router.push("/admin/usuarios/nuevo")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar Usuario
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {usuariosFiltrados.map((usuario) => (
              <Card key={usuario.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {/* Avatar y Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        {usuario.fotoPerfil ? (
                          <img
                            src={usuario.fotoPerfil || "/placeholder.svg"}
                            alt={`Foto de ${getNombreCompleto(usuario)}`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-purple-600 font-semibold text-lg">{getInitials(usuario)}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{getNombreCompleto(usuario)}</h3>
                        <p className="text-sm text-gray-600">@{usuario.username}</p>
                      </div>
                    </div>
                    <Badge
                      className={
                        usuario.status === "active"
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-red-100 text-red-800 hover:bg-red-200"
                      }
                    >
                      {usuario.status === "active" ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>

                  {/* Información del Cliente */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Cliente:</span>
                      <Badge variant="outline" className="flex items-center">
                        <Building className="mr-1 h-3 w-3" />
                        {clientes[usuario.clientId] || "Sin asignar"}
                      </Badge>
                    </div>
                  </div>

                  {/* Información del Tema */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Tema:</span>
                      <Badge variant="outline" className="flex items-center">
                        <Palette className="mr-1 h-3 w-3" />
                        {temas[usuario.themeId] || "Sin tema"}
                      </Badge>
                    </div>
                  </div>

                  {/* Información del Equipo */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Equipo:</span>
                      <Badge variant="outline" className="flex items-center">
                        <Building className="mr-1 h-3 w-3" />
                        {usuario.equipoNombre || "Sin equipo"}
                      </Badge>
                    </div>
                  </div>

                  {/* Fechas */}
                  <div className="text-xs text-gray-600 space-y-1 mb-4">
                    <p>
                      <span className="font-medium">Creado:</span> {new Date(usuario.createdAt).toLocaleDateString()}
                    </p>
                    {usuario.updatedAt && usuario.updatedAt !== usuario.createdAt && (
                      <p>
                        <span className="font-medium">Actualizado:</span>{" "}
                        {new Date(usuario.updatedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/admin/usuarios/editar/${usuario.id}`)}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Editar Usuario
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
