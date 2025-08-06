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
import { Heart, Activity, LogOut, User, AlertCircle, TrendingUp, Calendar, Target, BarChart3 } from "lucide-react"

interface JugadorUser {
  id: string
  nombre: string
  apellido: string
  nombreVisualizacion: string
  email: string
  clienteId: string
  clienteNombre: string
  rol: string
  estado: string
  posicionPrincipal: string
  foto?: string
}

interface Cliente {
  id: string
  nombre: string
  funcionalidades: string[]
  estado: string
}

export default function JugadorPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [jugadorUser, setJugadorUser] = useState<JugadorUser | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")
  const [stats, setStats] = useState({
    cuestionariosCompletados: 12,
    ultimoCuestionario: "Hace 2 días",
    percepcionPromedio: 7.2,
    tendenciaEsfuerzo: "Estable",
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadJugadorData()
    }
  }, [user])

  const loadJugadorData = async () => {
    try {
      setLoadingData(true)
      setError("")
      console.log("🔄 Cargando datos del jugador:", user?.email)

      // Buscar jugador en la colección jugadores
      try {
        const jugadoresRef = collection(db, "jugadores")
        const jugadorQuery = query(jugadoresRef, where("email", "==", user?.email))
        const jugadorSnapshot = await getDocs(jugadorQuery)

        if (!jugadorSnapshot.empty) {
          const jugadorData = jugadorSnapshot.docs[0].data() as JugadorUser
          jugadorData.id = jugadorSnapshot.docs[0].id
          setJugadorUser(jugadorData)
          console.log("✅ Jugador encontrado:", jugadorData)

          // Cargar datos del cliente asignado
          await loadClienteData(jugadorData.clienteId)
        } else {
          console.log("⚠️ Jugador no encontrado en Firestore")

          // Buscar en la colección users como fallback
          const usersRef = collection(db, "users")
          const usersQuery = query(usersRef, where("email", "==", user?.email))
          const usersSnapshot = await getDocs(usersQuery)

          if (!usersSnapshot.empty) {
            const userData = usersSnapshot.docs[0].data()
            console.log("✅ Usuario encontrado en colección 'users':", userData)

            if (userData.rol === "jugador" && userData.clienteId) {
              const jugadorData: JugadorUser = {
                id: usersSnapshot.docs[0].id,
                nombre: userData.nombre || userData.firstName || "",
                apellido: userData.apellido || userData.lastName || "",
                nombreVisualizacion:
                  userData.nombreVisualizacion ||
                  `${userData.nombre || userData.firstName} ${userData.apellido || userData.lastName}`,
                email: userData.email,
                clienteId: userData.clienteId,
                clienteNombre: userData.clienteNombre || "",
                rol: userData.rol,
                estado: userData.estado || "activo",
                posicionPrincipal: userData.posicionPrincipal || "Jugador",
                foto: userData.foto,
              }
              setJugadorUser(jugadorData)
              console.log("✅ Jugador creado desde 'users':", jugadorData)
              await loadClienteData(jugadorData.clienteId)
            } else {
              console.log("⚠️ Usuario no es jugador o no tiene clienteId")
              await loadJugadorFromLocalStorage()
            }
          } else {
            console.log("⚠️ Usuario no encontrado en ninguna colección")
            await loadJugadorFromLocalStorage()
          }
        }
      } catch (firestoreError: any) {
        console.log("⚠️ Error consultando Firestore:", firestoreError.message)
        await loadJugadorFromLocalStorage()
      }
    } catch (error: any) {
      console.error("❌ Error cargando datos del jugador:", error)
      setError("Error cargando datos del jugador")
    } finally {
      setLoadingData(false)
    }
  }

  const loadJugadorFromLocalStorage = async () => {
    try {
      // Buscar en localStorage de jugadores
      const savedJugadores = localStorage.getItem("jugadores")
      if (savedJugadores) {
        const jugadores = JSON.parse(savedJugadores)
        const foundJugador = jugadores.find((j: any) => j.email === user?.email)
        if (foundJugador) {
          setJugadorUser(foundJugador)
          console.log("✅ Jugador encontrado en localStorage:", foundJugador)
          await loadClienteFromLocalStorage(foundJugador.clienteId)
          return
        }
      }

      // Si no se encuentra, crear jugador temporal
      console.log("⚠️ Jugador no encontrado, creando temporal...")
      await createTemporaryJugadorUser()
    } catch (error) {
      console.error("❌ Error cargando desde localStorage:", error)
      await createTemporaryJugadorUser()
    }
  }

  const createTemporaryJugadorUser = async () => {
    try {
      const tempJugadorUser: JugadorUser = {
        id: "temp_" + Date.now(),
        nombre: user?.displayName?.split(" ")[0] || "Jugador",
        apellido: user?.displayName?.split(" ")[1] || "Temporal",
        nombreVisualizacion: user?.displayName || "Jugador Temporal",
        email: user?.email || "",
        clienteId: "temp_client_" + Date.now(),
        clienteNombre: "Club Temporal",
        rol: "jugador",
        estado: "activo",
        posicionPrincipal: "Jugador",
      }

      const tempCliente: Cliente = {
        id: tempJugadorUser.clienteId,
        nombre: "Club Temporal",
        funcionalidades: ["jugadores", "entrenamientos", "partidos", "evaluaciones"],
        estado: "activo",
      }

      setJugadorUser(tempJugadorUser)
      setCliente(tempCliente)

      console.log("✅ Jugador temporal creado:", tempJugadorUser)
    } catch (error) {
      console.error("❌ Error creando jugador temporal:", error)
      setError("No se pudo inicializar el usuario jugador. Contacta al administrador.")
    }
  }

  const loadClienteData = async (clienteId: string) => {
    try {
      console.log("🔄 Cargando datos del cliente:", clienteId)

      try {
        const clienteRef = doc(db, "clientes", clienteId)
        const clienteSnapshot = await getDoc(clienteRef)

        if (clienteSnapshot.exists()) {
          const clienteData = clienteSnapshot.data() as Cliente
          clienteData.id = clienteSnapshot.id
          setCliente(clienteData)
          console.log("✅ Cliente encontrado:", clienteData)
        } else {
          console.log("⚠️ Cliente no encontrado en Firestore, usando localStorage")
          await loadClienteFromLocalStorage(clienteId)
        }
      } catch (firestoreError: any) {
        console.log("⚠️ Error consultando cliente en Firestore:", firestoreError.message)
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
          console.log("✅ Cliente encontrado en localStorage:", foundCliente)
          return
        }
      }

      // Si no se encuentra el cliente, crear uno temporal
      const tempCliente: Cliente = {
        id: clienteId,
        nombre: "Club Temporal",
        funcionalidades: ["jugadores", "entrenamientos", "partidos", "evaluaciones"],
        estado: "activo",
      }

      setCliente(tempCliente)
      console.log("✅ Cliente temporal creado:", tempCliente)
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
    if (jugadorUser?.nombre && jugadorUser?.apellido) {
      return `${jugadorUser.nombre[0]}${jugadorUser.apellido[0]}`.toUpperCase()
    }
    if (user?.displayName) {
      const names = user.displayName.trim().split(" ")
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      }
      return names[0][0]?.toUpperCase() || "J"
    }
    return user?.email?.[0]?.toUpperCase() || "J"
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando panel de jugador...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Panel de Jugador</h1>
              <p className="text-gray-600 mt-1">
                {jugadorUser ? `${jugadorUser.nombreVisualizacion}` : "Gestiona tu bienestar y rendimiento"}
                {cliente && <span className="text-sm"> • {cliente.nombre}</span>}
                {jugadorUser?.posicionPrincipal && (
                  <span className="text-sm text-gray-500"> • {jugadorUser.posicionPrincipal}</span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Jugador</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold text-sm hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 overflow-hidden">
                    {jugadorUser?.foto ? (
                      <img
                        src={jugadorUser.foto || "/placeholder.svg"}
                        alt={`Foto de ${jugadorUser.nombreVisualizacion}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getUserInitials()
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">
                      {jugadorUser?.nombreVisualizacion || user.displayName || "Jugador"}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    {cliente && <p className="text-xs text-gray-500">Club: {cliente.nombre}</p>}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleNavigation("/jugador/perfil")}>
                    <User className="w-4 h-4 mr-2" />
                    Ver Perfil
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Cuestionarios Completados */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cuestionarios</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.cuestionariosCompletados}</p>
                <p className="text-xs text-gray-500 mt-1">Completados</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Último Cuestionario */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Último Registro</p>
                <p className="text-lg font-bold text-gray-900 mt-2">{stats.ultimoCuestionario}</p>
                <p className="text-xs text-gray-500 mt-1">Bienestar</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Percepción Promedio */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Percepción Promedio</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.percepcionPromedio}</p>
                <p className="text-xs text-gray-500 mt-1">Escala 1-10</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Tendencia */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tendencia</p>
                <p className="text-lg font-bold text-gray-900 mt-2">{stats.tendenciaEsfuerzo}</p>
                <p className="text-xs text-gray-500 mt-1">Última semana</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Options Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Cuestionario de Bienestar */}
          <div className="bg-white rounded-xl border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Cuestionario de Bienestar</h3>
              <p className="text-gray-600 text-base mb-8 leading-relaxed">
                Registra tu estado físico, mental y emocional para ayudar al cuerpo técnico a optimizar tu rendimiento y
                prevenir lesiones.
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-center text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Estado físico y fatiga
                </div>
                <div className="flex items-center justify-center text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Calidad del sueño
                </div>
                <div className="flex items-center justify-center text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Estado emocional
                </div>
              </div>
              <button
                onClick={() => handleNavigation("/jugador/cuestionario-bienestar")}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg"
              >
                Completar Cuestionario
              </button>
            </div>
          </div>

          {/* Percepción del Esfuerzo */}
          <div className="bg-white rounded-xl border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
            <div className="text-center">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Activity className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Percepción del Esfuerzo</h3>
              <p className="text-gray-600 text-base mb-8 leading-relaxed">
                Evalúa la intensidad del entrenamiento o partido recién completado usando la escala RPE para monitorear
                tu carga de trabajo.
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-center text-sm text-gray-500">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                  Escala RPE (1-10)
                </div>
                <div className="flex items-center justify-center text-sm text-gray-500">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                  Registro post-actividad
                </div>
                <div className="flex items-center justify-center text-sm text-gray-500">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                  Monitoreo de carga
                </div>
              </div>
              <button
                onClick={() => handleNavigation("/jugador/percepcion-esfuerzo")}
                className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors font-semibold text-lg"
              >
                Registrar Esfuerzo
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Section */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen Semanal</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">5</p>
              <p className="text-sm text-gray-600">Entrenamientos</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">7.8</p>
              <p className="text-sm text-gray-600">Bienestar Promedio</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">6.5</p>
              <p className="text-sm text-gray-600">RPE Promedio</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
