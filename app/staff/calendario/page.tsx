"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebaseConfig"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Plus, Calendar, Edit, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut } from "lucide-react"
import { signOut } from "firebase/auth"

interface Actividad {
  id?: string
  titulo: string
  hora: string
  fecha: string // YYYY-MM-DD (local)
  clienteId: string
  creadoPor: string
  fechaCreacion: Date
}

interface UserData {
  clienteId: string
  rol: string
  username: string
  email: string
  firstName?: string
  lastName?: string
}

interface Cliente {
  id: string
  nombre: string
  club?: string
}

const diasSemana = [
  { key: "lunes", label: "Lunes", index: 1 },
  { key: "martes", label: "Martes", index: 2 },
  { key: "miercoles", label: "Miércoles", index: 3 },
  { key: "jueves", label: "Jueves", index: 4 },
  { key: "viernes", label: "Viernes", index: 5 },
  { key: "sabado", label: "Sábado", index: 6 },
  { key: "domingo", label: "Domingo", index: 0 },
]

// Helpers de fecha (siempre en local)
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
const createLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day)
}
const getLocalDateString = (date: Date): string => formatDateForInput(date)

export default function CalendarioPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [authReady, setAuthReady] = useState(false)

  const [actividades, setActividades] = useState<Actividad[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingActividad, setEditingActividad] = useState<Actividad | null>(null)
  const [permissionError, setPermissionError] = useState(false)
  const [selectedDate, setSelectedDate] = useState("")
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loadingUserData, setLoadingUserData] = useState(true)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loadingCliente, setLoadingCliente] = useState(true)

  const [formData, setFormData] = useState({
    titulo: "",
    hora: "",
    fecha: "",
  })

  // Asegurarnos de que Firebase Auth haya establecido el usuario antes de leer Firestore
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setAuthReady(!!firebaseUser)
    })
    return () => unsub()
  }, [])

  // Redirigir si no hay user cuando terminó la verificación
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  // Función para cargar datos del usuario desde Firestore (requiere user autenticado)
  const loadUserData = async () => {
    try {
      setLoadingUserData(true)
      setError("")

      if (!user?.email) {
        throw new Error("No hay usuario autenticado")
      }

      const { collection: col, where, query, getDocs } = await import("firebase/firestore")
      const { db } = await import("@/lib/firebaseConfig")

      // 1) Buscar en 'staff'
      const staffRef = col(db, "staff")
      const staffQuery = query(staffRef, where("email", "==", user.email))
      const staffSnapshot = await getDocs(staffQuery)

      if (!staffSnapshot.empty) {
        const staffDoc = staffSnapshot.docs[0].data() as any
        if (staffDoc?.clienteId) {
          setUserData({
            clienteId: staffDoc.clienteId,
            rol: staffDoc.rol || "staff",
            username: staffDoc.username || staffDoc.email?.split("@")[0] || "",
            email: staffDoc.email,
            firstName: staffDoc.firstName || staffDoc.nombre,
            lastName: staffDoc.lastName || staffDoc.apellido,
          })
          setLoadingUserData(false)
          return
        }
      }

      // 2) Buscar en 'users'
      const usersRef = col(db, "users")
      const usersQuery = query(usersRef, where("email", "==", user.email))
      const usersSnapshot = await getDocs(usersQuery)

      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0].data() as any
        if (userDoc?.clienteId) {
          setUserData({
            clienteId: userDoc.clienteId,
            rol: userDoc.rol || "staff",
            username: userDoc.username || "",
            email: userDoc.email,
            firstName: userDoc.firstName || userDoc.nombre,
            lastName: userDoc.lastName || userDoc.apellido,
          })
          setLoadingUserData(false)
          return
        }
      }

      // 3) Fallback localStorage
      const savedUsers = typeof window !== "undefined" ? localStorage.getItem("usuarios") : null
      if (savedUsers) {
        const users = JSON.parse(savedUsers)
        const foundUser = users.find((u: any) => u.email === user.email)
        if (foundUser?.clienteId) {
          setUserData({
            clienteId: foundUser.clienteId,
            rol: foundUser.rol || "staff",
            username: foundUser.username || "",
            email: foundUser.email,
            firstName: foundUser.firstName || foundUser.nombre,
            lastName: foundUser.lastName || foundUser.apellido,
          })
          setLoadingUserData(false)
          return
        }
      }

      setError("Usuario no encontrado. Verifica que tu cuenta esté configurada correctamente en la colección 'staff'.")
      setLoadingUserData(false)
    } catch (err: any) {
      setError("Error cargando datos del usuario. Revisa la consola para más detalles.")
      setLoadingUserData(false)
      console.error("Error en loadUserData:", err)
    }
  }

  // Función para cargar datos del cliente
  const loadClienteData = async (clienteId: string) => {
    try {
      setLoadingCliente(true)

      const clientesRef = collection(db, "clientes")
      const clienteQuery = query(clientesRef, where("id", "==", clienteId))
      const clienteSnapshot = await getDocs(clienteQuery)

      if (!clienteSnapshot.empty) {
        const clienteDoc = clienteSnapshot.docs[0].data() as any
        setCliente({
          id: clienteDoc.id,
          nombre: clienteDoc.nombre || "",
          club: clienteDoc.club || "",
        })
      } else {
        // Si no se encuentra por id, buscar por el documento con ese ID
        const clienteDocRef = doc(db, "clientes", clienteId)
        const clienteDocSnapshot = await getDocs(query(collection(db, "clientes")))

        const foundCliente = clienteDocSnapshot.docs.find((doc) => doc.id === clienteId)
        if (foundCliente) {
          const clienteData = foundCliente.data() as any
          setCliente({
            id: foundCliente.id,
            nombre: clienteData.nombre || "",
            club: clienteData.club || "",
          })
        }
      }

      setLoadingCliente(false)
    } catch (err: any) {
      console.error("Error cargando datos del cliente:", err)
      setLoadingCliente(false)
    }
  }

  // Cargar userData solo cuando Auth está listo y hay user
  useEffect(() => {
    if (authReady && user) {
      loadUserData()
    }
  }, [authReady, user])

  // Cargar datos del cliente cuando tenemos userData
  useEffect(() => {
    if (userData?.clienteId) {
      loadClienteData(userData.clienteId)
    }
  }, [userData?.clienteId])

  // Cálculo de semana (lunes a domingo)
  const getMondayOfWeek = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }
  const getWeekDates = (mondayDate: Date) => {
    const dates: Date[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(mondayDate)
      date.setDate(mondayDate.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const weekDates = useMemo(() => getWeekDates(getMondayOfWeek(currentWeek)), [currentWeek])
  const startDate = useMemo(() => getLocalDateString(weekDates[0]), [weekDates])
  const endDate = useMemo(() => getLocalDateString(weekDates[6]), [weekDates])

  // Suscripción a actividades SOLO si:
  // - Auth está listo
  // - Hay userData con clienteId
  // - Tenemos rango de semana
  useEffect(() => {
    if (!authReady || !userData?.clienteId) return

    setLoadingData(true)
    setPermissionError(false)
    setError("")

    // Subcolección: calendario/{clienteId}/actividades
    const actividadesRef = collection(db, `calendario/${userData.clienteId}/actividades`)

    // Filtramos por rango de la semana en el servidor (fecha es YYYY-MM-DD)
    const q = query(actividadesRef, where("fecha", ">=", startDate), where("fecha", "<=", endDate))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data() as any
          const item: Actividad = {
            id: d.id,
            titulo: data.titulo || "",
            hora: data.hora || "",
            fecha: data.fecha || "",
            clienteId: data.clienteId || "",
            creadoPor: data.creadoPor || "",
            fechaCreacion: data.fechaCreacion
              ? new Date(data.fechaCreacion.toDate?.() ?? data.fechaCreacion)
              : new Date(),
          }
          return item
        })

        // Ordenar por fecha y hora en cliente (evitamos índices compuestos)
        list.sort((a, b) => (a.fecha === b.fecha ? a.hora.localeCompare(b.hora) : a.fecha.localeCompare(b.fecha)))

        setActividades(list)
        setLoadingData(false)
      },
      (err: any) => {
        console.error("Error onSnapshot calendario:", err)
        if (err?.code === "permission-denied") {
          setPermissionError(true)
          setError("Sin permisos para acceder al calendario. Verifica las reglas de Firestore.")
        } else if (err?.code === "not-found") {
          setError(`La colección calendario/${userData.clienteId}/actividades no existe.`)
        } else {
          setError(`Error cargando actividades: ${err?.message ?? "desconocido"}`)
        }
        setLoadingData(false)
      },
    )

    return () => unsubscribe()
  }, [authReady, userData?.clienteId, startDate, endDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userData?.clienteId) {
      setError("No se pudo determinar el cliente. Intenta recargar la página.")
      return
    }

    try {
      const actividadesRef = collection(db, `calendario/${userData.clienteId}/actividades`)
      const actividadData: Omit<Actividad, "id"> = {
        titulo: formData.titulo,
        hora: formData.hora,
        fecha: formData.fecha,
        clienteId: userData.clienteId,
        creadoPor: user?.email || "",
        fechaCreacion: new Date(),
      }

      if (editingActividad?.id) {
        const ref = doc(db, `calendario/${userData.clienteId}/actividades`, editingActividad.id)
        await updateDoc(ref, actividadData as any)
      } else {
        await addDoc(actividadesRef, actividadData as any)
      }

      setFormData({ titulo: "", hora: "", fecha: "" })
      setEditingActividad(null)
      setDialogOpen(false)
      setSelectedDate("")
    } catch (err: any) {
      console.error("Error guardando actividad:", err)
      setError(`Error guardando actividad: ${err?.message ?? "desconocido"}`)
    }
  }

  const handleEdit = (actividad: Actividad) => {
    setEditingActividad(actividad)
    setFormData({
      titulo: actividad.titulo,
      hora: actividad.hora,
      fecha: actividad.fecha,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (actividadId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta actividad?")) return
    try {
      const ref = doc(db, `calendario/${userData?.clienteId}/actividades`, actividadId)
      await deleteDoc(ref)
    } catch (err: any) {
      console.error("Error eliminando actividad:", err)
      setError(`Error eliminando actividad: ${err?.message ?? "desconocido"}`)
    }
  }

  const getActividadesPorFecha = (fecha: string) => {
    return actividades.filter((a) => a.fecha === fecha)
  }

  const handleDayClick = (fecha: string) => {
    setSelectedDate(fecha)
    setFormData({ ...formData, fecha })
    setDialogOpen(true)
  }

  const navigateWeek = (direction: "prev" | "next") => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() + (direction === "next" ? 7 : -7))
    setCurrentWeek(newWeek)
  }

  const formatDateHeader = (date: Date) => {
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
  }
  const formatWeekRange = () => {
    const start = weekDates[0]
    const end = weekDates[6]
    return `${start.getDate()} - ${end.getDate()} ${end.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}`
  }
  const isWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6
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

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }

  if (loading || loadingUserData || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {loading
              ? "Verificando autenticación..."
              : loadingUserData
                ? "Cargando datos del usuario..."
                : "Cargando calendario..."}
          </p>
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
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => router.push("/staff")} className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Calendario Semanal</h1>
                <p className="text-gray-600 mt-1">
                  {loadingCliente ? "Cargando..." : cliente?.club || cliente?.nombre || "Sin información del club"}
                </p>
              </div>
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
                    <p className="text-sm font-medium">{user?.displayName || "Usuario"}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/staff/perfil")}>
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
        {permissionError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error de permisos:</strong> No tienes acceso al calendario. Verifica que las reglas de Firestore
              estén configuradas correctamente.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Navegación de semana */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => navigateWeek("prev")}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Semana Anterior
          </Button>

          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">{formatWeekRange()}</h2>
            <p className="text-sm text-gray-600">Semana del {weekDates[0].toLocaleDateString("es-ES")}</p>
          </div>

          <Button variant="outline" onClick={() => navigateWeek("next")}>
            Semana Siguiente
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Vista de calendario semanal - 7 días */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingActividad ? "Editar Actividad" : "Nueva Actividad"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="titulo">Actividad</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ej: Entrenamiento de fútbol, Partido vs Rival, Reunión técnica"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="hora">Horario</Label>
                  <Input
                    id="hora"
                    type="time"
                    value={formData.hora}
                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false)
                    setEditingActividad(null)
                    setSelectedDate("")
                    setFormData({ titulo: "", hora: "", fecha: "" })
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {editingActividad ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-7 gap-4">
          {weekDates.map((date, index) => {
            const fechaString = getLocalDateString(date)
            const actividadesDelDia = getActividadesPorFecha(fechaString)
            const isToday = date.toDateString() === new Date().toDateString()
            const isWeekendDay = isWeekend(date)

            return (
              <Card
                key={index}
                className={`min-h-[500px] ${isToday ? "ring-2 ring-blue-500" : ""} ${isWeekendDay ? "bg-gray-50" : ""}`}
              >
                <CardHeader className="pb-4">
                  <CardTitle className="text-center">
                    <div className={`text-sm font-medium ${isWeekendDay ? "text-gray-500" : "text-gray-600"}`}>
                      {diasSemana[index].label}
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        isToday ? "text-blue-600" : isWeekendDay ? "text-gray-600" : "text-gray-900"
                      }`}
                    >
                      {formatDateHeader(date)}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3">
                  <div className="space-y-2">
                    {actividadesDelDia.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 mb-4">Sin actividades</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDayClick(fechaString)}
                          className="text-sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Agregar
                        </Button>
                      </div>
                    ) : (
                      <>
                        {actividadesDelDia.map((actividad) => (
                          <div
                            key={actividad.id}
                            className="group relative bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all duration-200 hover:border-blue-300"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                                {actividad.hora}
                              </div>
                              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEdit(actividad)
                                  }}
                                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(actividad.id!)
                                  }}
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            <div className="text-sm font-medium text-gray-900 leading-tight">{actividad.titulo}</div>
                          </div>
                        ))}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDayClick(fechaString)}
                          className="w-full mt-3 text-sm border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-600"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Agregar actividad
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
