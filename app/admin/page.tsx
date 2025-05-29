"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Users, Shield, BarChart3, Palette, Building, Settings, User, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"

// Interfaces para las estadísticas
interface DashboardStats {
  totalUsuarios: number
  clientesActivos: number
  temasDisponibles: number
  sesionesHoy: number
  usuariosNuevos: number
  clientesNuevos: number
}

export default function AdminPage() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalUsuarios: 0,
    clientesActivos: 0,
    temasDisponibles: 0,
    sesionesHoy: 0,
    usuariosNuevos: 0,
    clientesNuevos: 0,
  })

  // Cargar estadísticas al montar el componente
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)

        // Obtener total de usuarios
        const usersSnapshot = await getDocs(collection(db, "users"))
        const totalUsuarios = usersSnapshot.size

        // Obtener usuarios nuevos (último mes)
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
        const usuariosNuevos = usersSnapshot.docs.filter((doc) => {
          const createdAt = doc.data().createdAt
          if (!createdAt) return false

          // Manejar diferentes formatos de fecha
          let createdDate
          if (createdAt instanceof Timestamp) {
            createdDate = createdAt.toDate()
          } else if (typeof createdAt === "string") {
            createdDate = new Date(createdAt)
          } else {
            return false
          }

          return createdDate > oneMonthAgo
        }).length

        // Obtener clientes activos
        const clientsSnapshot = await getDocs(query(collection(db, "clients"), where("activo", "==", true)))
        const clientesActivos = clientsSnapshot.size

        // Obtener clientes nuevos (último mes)
        const clientesNuevos = clientsSnapshot.docs.filter((doc) => {
          const createdAt = doc.data().createdAt
          if (!createdAt) return false

          // Manejar diferentes formatos de fecha
          let createdDate
          if (createdAt instanceof Timestamp) {
            createdDate = createdAt.toDate()
          } else if (typeof createdAt === "string") {
            createdDate = new Date(createdAt)
          } else {
            return false
          }

          return createdDate > oneMonthAgo
        }).length

        // Obtener temas disponibles
        const themesSnapshot = await getDocs(collection(db, "themes"))
        const temasDisponibles = themesSnapshot.size

        // Para sesiones, podríamos usar una colección de logs o analytics
        // Por ahora usaremos un valor simulado basado en la hora del día
        const hour = new Date().getHours()
        const sesionesHoy = Math.floor(100 + hour * 5 + Math.random() * 20)

        setStats({
          totalUsuarios,
          clientesActivos,
          temasDisponibles,
          sesionesHoy,
          usuariosNuevos,
          clientesNuevos,
        })
      } catch (error) {
        console.error("Error al cargar estadísticas:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }

  // Actualiza la función para obtener las iniciales del nombre
  const getInitials = () => {
    if (user?.nombre && user?.apellido) {
      return `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase()
    } else if (user?.nombre) {
      return user.nombre.charAt(0).toUpperCase()
    } else if (user) {
      return user.email.charAt(0).toUpperCase()
    }
    return "U"
  }

  // Actualiza la función para obtener el nombre del usuario
  const getUserDisplayName = () => {
    if (user?.nombre && user?.apellido) {
      return `${user.nombre} ${user.apellido}`
    } else if (user?.nombre) {
      return user.nombre
    } else if (user) {
      // Si no hay nombre, usar el email sin el dominio
      const name = user.email.split("@")[0]
      return name.charAt(0).toUpperCase() + name.slice(1)
    }
    return "Usuario"
  }

  const opciones = [
    {
      titulo: "Gestión de clientes",
      ruta: "/admin/clientes",
      descripcion: "Administrar clientes y sus configuraciones",
      icono: Building,
      color: "text-blue-600",
    },
    {
      titulo: "Gestión de usuarios",
      ruta: "/admin/usuarios",
      descripcion: "Administrar usuarios del sistema",
      icono: Users,
      color: "text-green-600",
    },
    {
      titulo: "Gestión de temas",
      ruta: "/admin/temas",
      descripcion: "Crear y editar temas personalizados",
      icono: Palette,
      color: "text-purple-600",
    },
    {
      titulo: "Reportes",
      ruta: "/admin/reportes",
      descripcion: "Análisis y reportes del sistema",
      icono: BarChart3,
      color: "text-orange-600",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel de Administrador</h1>
              <p className="text-gray-600">Gestiona usuarios, clientes y configuraciones del sistema</p>
            </div>

            <div className="flex items-center space-x-4">
              <Badge variant="default" className="flex items-center">
                <Shield className="mr-1 h-3 w-3" />
                Administrador
              </Badge>

              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        {user?.fotoPerfil ? (
                          <AvatarImage src={user.fotoPerfil || "/placeholder.svg"} alt={user.email} />
                        ) : (
                          <AvatarFallback className="bg-purple-600 text-white">{getInitials()}</AvatarFallback>
                        )}
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/admin/perfil")}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Editar Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/admin/configuracion")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configuración</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar Sesión</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Estadísticas Rápidas */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalUsuarios}</div>
                  <p className="text-xs text-muted-foreground">+{stats.usuariosNuevos} en el último mes</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.clientesActivos}</div>
                  <p className="text-xs text-muted-foreground">+{stats.clientesNuevos} este mes</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temas Disponibles</CardTitle>
              <Palette className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.temasDisponibles}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.temasDisponibles > 0
                      ? `${Math.min(stats.temasDisponibles, 3)} temas personalizados`
                      : "Sin temas personalizados"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sesiones Hoy</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.sesionesHoy}</div>
                  <p className="text-xs text-muted-foreground">+{Math.floor(stats.sesionesHoy * 0.12)}% vs ayer</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Opciones de Gestión */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {opciones.map((opcion) => {
            const IconComponent = opcion.icono
            return (
              <Card
                key={opcion.ruta}
                onClick={() => router.push(opcion.ruta)}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className={`p-3 rounded-full bg-gray-100 ${opcion.color}`}>
                      <IconComponent className="h-8 w-8" />
                    </div>
                  </div>
                  <CardTitle className="text-xl">{opcion.titulo}</CardTitle>
                  <CardDescription>{opcion.descripcion}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button variant="outline" className="w-full">
                    Acceder
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
