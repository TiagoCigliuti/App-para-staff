"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { signOut } from "firebase/auth"
import { auth, db } from "@/lib/firebaseConfig"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Calendar,
  Users,
  Dumbbell,
  Trophy,
  TrendingUp,
  ClipboardCheck,
  Heart,
  LogOut,
  User,
  Clock,
  Target,
  BarChart3,
  Lock,
} from "lucide-react"
import { AlertCircle } from "lucide-react" // Import AlertCircle

// Definir las funcionalidades disponibles con sus configuraciones
const FUNCIONALIDADES_CONFIG = {
  calendario: {
    id: "calendario",
    nombre: "Calendario",
    descripcion: "Gestiona horarios, entrenamientos y eventos",
    icon: Calendar,
    color: "blue",
    path: "/staff/calendario",
    quickAction: {
      path: "/staff/entrenamientos/nuevo",
      label: "Nuevo Entrenamiento",
      icon: Clock,
    },
  },
  jugadores: {
    id: "jugadores",
    nombre: "Gestión de Jugadores",
    descripcion: "Administra perfiles y datos de jugadores",
    icon: Users,
    color: "green",
    path: "/staff/jugadores",
    quickAction: {
      path: "/staff/jugadores/nuevo",
      label: "Agregar Jugador",
      icon: User,
    },
  },
  entrenamientos: {
    id: "entrenamientos",
    nombre: "Gestión de Entrenamientos",
    descripcion: "Planifica y organiza sesiones de entrenamiento",
    icon: Dumbbell,
    color: "purple",
    path: "/staff/entrenamientos",
    quickAction: {
      path: "/staff/entrenamientos/nuevo",
      label: "Nuevo Entrenamiento",
      icon: Clock,
    },
  },
  partidos: {
    id: "partidos",
    nombre: "Gestión de Partidos",
    descripcion: "Organiza partidos, convocatorias y resultados",
    icon: Trophy,
    color: "yellow",
    path: "/staff/partidos",
    quickAction: {
      path: "/staff/partidos/nuevo",
      label: "Programar Partido",
      icon: Trophy,
    },
  },
  "carga-externa": {
    id: "carga-externa",
    nombre: "Gestión de Carga Externa",
    descripcion: "Monitorea cargas de trabajo externas y rendimiento",
    icon: TrendingUp,
    color: "orange",
    path: "/staff/carga-externa",
  },
  "carga-interna": {
    id: "carga-interna",
    nombre: "Gestión de Carga Interna",
    descripcion: "Gestiona cargas internas y planificación",
    icon: BarChart3,
    color: "teal",
    path: "/staff/carga-interna",
  },
  evaluaciones: {
    id: "evaluaciones",
    nombre: "Evaluaciones",
    descripcion: "Realiza evaluaciones técnicas y físicas",
    icon: ClipboardCheck,
    color: "indigo",
    path: "/staff/evaluaciones",
    quickAction: {
      path: "/staff/evaluaciones/nueva",
      label: "Nueva Evaluación",
      icon: Target,
    },
  },
  medicos: {
    id: "medicos",
    nombre: "Servicios Médicos",
    descripcion: "Gestiona historial médico y lesiones",
    icon: Heart,
    color: "red",
    path: "/staff/medicos",
  },
}

interface StaffUser {
  id: string
  nombre: string
  apellido: string
  email: string
  clienteId: string
  clienteNombre: string
  rol: string
  estado: string
}

interface Cliente {
  id: string
  nombre: string
  funcionalidades: string[]
  estado: string
}

export default function StaffPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [funcionalidadesHabilitadas, setFuncionalidadesHabilitadas] = useState<string[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")
  const [stats, setStats] = useState({
    proximosEntrenamientos: 3,
    jugadoresActivos: 25,
    proximosPartidos: 2,
    evaluacionesPendientes: 8,
    sesionesHoy: 4,
    cargaPromedio: 75,
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadStaffData()
    }
  }, [user])

  const loadStaffData = async () => {
    try {
      setLoadingData(true)
      setError("")
      console.log("🔄 Cargando datos del usuario staff:", user?.email)

      // Buscar usuario en la colección staff
      try {
        const staffRef = collection(db, "staff")
        const staffQuery = query(staffRef, where("email", "==", user?.email))
        const staffSnapshot = await getDocs(staffQuery)

        if (!staffSnapshot.empty) {
          const staffData = staffSnapshot.docs[0].data() as StaffUser
          staffData.id = staffSnapshot.docs[0].id
          setStaffUser(staffData)
          console.log("✅ Usuario staff encontrado:", staffData)

          // Cargar datos del cliente asignado
          await loadClienteData(staffData.clienteId)
        } else {
          console.log("⚠️ Usuario staff no encontrado en Firestore, usando localStorage")
          await loadStaffFromLocalStorage()
        }
      } catch (firestoreError) {
        console.log("⚠️ Error consultando Firestore, usando localStorage:", firestoreError)
        await loadStaffFromLocalStorage()
      }
    } catch (error: any) {
      console.error("❌ Error cargando datos del staff:", error)
      setError("Error cargando los datos del usuario")
    } finally {
      setLoadingData(false)
    }
  }

  const loadStaffFromLocalStorage = async () => {
    try {
      const savedUsers = localStorage.getItem("usuarios")
      if (savedUsers) {
        const users = JSON.parse(savedUsers)
        const foundUser = users.find((u: any) => u.email === user?.email)
        if (foundUser) {
          setStaffUser(foundUser)
          console.log("✅ Usuario staff encontrado en localStorage:", foundUser)
          await loadClienteFromLocalStorage(foundUser.clienteId)
        } else {
          setError("Usuario staff no encontrado")
        }
      } else {
        setError("No se encontraron datos de usuarios")
      }
    } catch (error) {
      console.error("❌ Error cargando desde localStorage:", error)
      setError("Error cargando datos locales")
    }
  }

  const loadClienteData = async (clienteId: string) => {
    try {
      console.log("🔄 Cargando datos del cliente:", clienteId)

      // Intentar cargar desde Firestore
      try {
        const clienteRef = doc(db, "clientes", clienteId)
        const clienteSnapshot = await getDoc(clienteRef)

        if (clienteSnapshot.exists()) {
          const clienteData = clienteSnapshot.data() as Cliente
          clienteData.id = clienteSnapshot.id
          setCliente(clienteData)
          setFuncionalidadesHabilitadas(clienteData.funcionalidades || [])
          console.log("✅ Cliente encontrado:", clienteData)
          console.log("✅ Funcionalidades habilitadas:", clienteData.funcionalidades)
        } else {
          console.log("⚠️ Cliente no encontrado en Firestore, usando localStorage")
          await loadClienteFromLocalStorage(clienteId)
        }
      } catch (firestoreError) {
        console.log("⚠️ Error consultando cliente en Firestore, usando localStorage:", firestoreError)
        await loadClienteFromLocalStorage(clienteId)
      }
    } catch (error) {
      console.error("❌ Error cargando datos del cliente:", error)
      setError("Error cargando datos del cliente")
    }
  }

  const loadClienteFromLocalStorage = async (clienteId: string) => {
    try {
      const savedClientes = localStorage.getItem("clientes")
      if (savedClientes) {
        const clientes = JSON.parse(savedClientes)
        const foundCliente = clientes.find((c: any) => c.id === clienteId)
        if (foundCliente) {
          setCliente(foundCliente)
          setFuncionalidadesHabilitadas(foundCliente.funcionalidades || [])
          console.log("✅ Cliente encontrado en localStorage:", foundCliente)
          console.log("✅ Funcionalidades habilitadas:", foundCliente.funcionalidades)
        } else {
          setError("Cliente asignado no encontrado")
        }
      } else {
        setError("No se encontraron datos de clientes")
      }
    } catch (error) {
      console.error("❌ Error cargando cliente desde localStorage:", error)
      setError("Error cargando datos del cliente")
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  const getUserInitials = () => {
    if (user?.displayName) {
      const names = user.displayName.trim().split(" ")
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      }
      return names[0][0]?.toUpperCase() || "U"
    }
    return user?.email?.[0]?.toUpperCase() || "U"
  }

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: { bg: string; text: string; hover: string } } = {
      blue: { bg: "bg-blue-50", text: "text-blue-600", hover: "hover:bg-blue-100" },
      green: { bg: "bg-green-50", text: "text-green-600", hover: "hover:bg-green-100" },
      purple: { bg: "bg-purple-50", text: "text-purple-600", hover: "hover:bg-purple-100" },
      yellow: { bg: "bg-yellow-50", text: "text-yellow-600", hover: "hover:bg-yellow-100" },
      orange: { bg: "bg-orange-50", text: "text-orange-600", hover: "hover:bg-orange-100" },
      teal: { bg: "bg-teal-50", text: "text-teal-600", hover: "hover:bg-teal-100" },
      indigo: { bg: "bg-indigo-50", text: "text-indigo-600", hover: "hover:bg-indigo-100" },
      red: { bg: "bg-red-50", text: "text-red-600", hover: "hover:bg-red-100" },
    }
    return colorMap[color] || colorMap.blue
  }

  // Filtrar funcionalidades habilitadas
  const funcionalidadesDisponibles = Object.values(FUNCIONALIDADES_CONFIG).filter((func) =>
    funcionalidadesHabilitadas.includes(func.id),
  )

  // Filtrar quick actions habilitadas
  const quickActionsDisponibles = funcionalidadesDisponibles
    .filter((func) => func.quickAction)
    .map((func) => func.quickAction!)

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando panel de staff...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel de Staff</h1>
              <p className="text-gray-600 mt-1">
                {staffUser
                  ? `${staffUser.nombre} ${staffUser.apellido}`
                  : "Gestiona entrenamientos, jugadores y evaluaciones"}
                {cliente && <span className="text-sm"> • {cliente.nombre}</span>}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Staff</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    {getUserInitials()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user.displayName || "Usuario"}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    {cliente && <p className="text-xs text-gray-500">Cliente: {cliente.nombre}</p>}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleNavigation("/staff/perfil")}>
                    <User className="w-4 h-4 mr-2" />
                    Editar Perfil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Verificar si tiene funcionalidades habilitadas */}
        {funcionalidadesHabilitadas.length === 0 ? (
          <div className="text-center py-12">
            <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Sin Funcionalidades Habilitadas</h3>
            <p className="text-gray-600 mb-4">
              Tu administrador no ha habilitado ninguna funcionalidad para tu cliente asignado.
            </p>
            <p className="text-sm text-gray-500">
              Contacta al administrador para solicitar acceso a los módulos necesarios.
            </p>
          </div>
        ) : (
          <>
            {/* Stats Cards - Solo mostrar si hay funcionalidades */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Entrenamientos Hoy</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.proximosEntrenamientos}</p>
                    <p className="text-xs text-gray-500 mt-1">Próximas 24 horas</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Dumbbell className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Jugadores Activos</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.jugadoresActivos}</p>
                    <p className="text-xs text-gray-500 mt-1">En plantilla actual</p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Próximos Partidos</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.proximosPartidos}</p>
                    <p className="text-xs text-gray-500 mt-1">Esta semana</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Carga Promedio</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.cargaPromedio}%</p>
                    <p className="text-xs text-gray-500 mt-1">Última semana</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Management Cards - Solo funcionalidades habilitadas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {funcionalidadesDisponibles.map((funcionalidad) => {
                const IconComponent = funcionalidad.icon
                const colors = getColorClasses(funcionalidad.color)

                return (
                  <div
                    key={funcionalidad.id}
                    className="bg-white rounded-xl border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    <div className="text-center">
                      <div
                        className={`w-16 h-16 ${colors.bg} rounded-full flex items-center justify-center mx-auto mb-6`}
                      >
                        <IconComponent className={`w-8 h-8 ${colors.text}`} />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{funcionalidad.nombre}</h3>
                      <p className="text-gray-600 text-sm mb-6">{funcionalidad.descripcion}</p>
                      <button
                        onClick={() => handleNavigation(funcionalidad.path)}
                        className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                      >
                        Acceder
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Quick Actions - Solo si hay funcionalidades con quick actions */}
            {quickActionsDisponibles.length > 0 && (
              <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActionsDisponibles.map((action, index) => {
                    const IconComponent = action.icon
                    const colors = getColorClasses(["blue", "green", "yellow", "purple"][index % 4] || "blue")

                    return (
                      <button
                        key={action.path}
                        onClick={() => handleNavigation(action.path)}
                        className={`flex items-center p-3 ${colors.bg} rounded-lg ${colors.hover} transition-colors`}
                      >
                        <IconComponent className={`w-5 h-5 ${colors.text} mr-3`} />
                        <span
                          className={`text-sm font-medium ${colors.text.replace("text-", "text-").replace("-600", "-900")}`}
                        >
                          {action.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
