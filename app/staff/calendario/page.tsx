"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Plus, Calendar, Clock, Edit, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Actividad {
  id?: string
  titulo: string
  hora: string
  fecha: string
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

const diasSemana = [
  { key: "lunes", label: "Lunes", index: 1 },
  { key: "martes", label: "Martes", index: 2 },
  { key: "miercoles", label: "Miércoles", index: 3 },
  { key: "jueves", label: "Jueves", index: 4 },
  { key: "viernes", label: "Viernes", index: 5 },
  { key: "sabado", label: "Sábado", index: 6 },
  { key: "domingo", label: "Domingo", index: 0 },
]

// Función para formatear fecha sin problemas de zona horaria
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Función para crear fecha local sin problemas de zona horaria
const createLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Función para obtener fecha en formato YYYY-MM-DD en zona horaria local
const getLocalDateString = (date: Date): string => {
  return formatDateForInput(date)
}

export default function CalendarioPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
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

  const [formData, setFormData] = useState({
    titulo: "",
    hora: "",
    fecha: "",
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user])

  useEffect(() => {
    if (userData) {
      loadActividades()
    }
  }, [userData, currentWeek])

  // Función para cargar datos del usuario desde Firestore
  const loadUserData = async () => {
    try {
      setLoadingUserData(true)
      console.log("🔄 Cargando datos del usuario:", user?.email)

      if (!user?.email) {
        throw new Error("No hay usuario autenticado")
      }

      // Paso 1: Buscar usuario en la colección staff primero (donde están los datos correctos)
      console.log("📊 Buscando usuario en colección 'staff'...")
      const staffRef = collection(db, "staff")
      const staffQuery = query(staffRef, where("email", "==", user.email))
      const staffSnapshot = await getDocs(staffQuery)

      if (!staffSnapshot.empty) {
        // Usuario encontrado en la colección staff
        const staffDoc = staffSnapshot.docs[0].data()
        console.log("✅ Usuario encontrado en colección staff:", staffDoc)

        if (staffDoc.clienteId) {
          setUserData({
            clienteId: staffDoc.clienteId,
            rol: staffDoc.rol || "staff",
            username: staffDoc.username || staffDoc.email?.split("@")[0] || "",
            email: staffDoc.email,
            firstName: staffDoc.firstName || staffDoc.nombre,
            lastName: staffDoc.lastName || staffDoc.apellido,
          })
          console.log("✅ ClienteId encontrado en staff:", staffDoc.clienteId)
          setLoadingUserData(false)
          return
        }
      }

      // Paso 2: Si no se encuentra en staff, buscar en la colección users
      console.log("📊 Buscando usuario en colección 'users'...")
      const usersRef = collection(db, "users")
      const usersQuery = query(usersRef, where("email", "==", user.email))
      const usersSnapshot = await getDocs(usersQuery)

      if (!usersSnapshot.empty) {
        // Usuario encontrado en Firestore users
        const userDoc = usersSnapshot.docs[0].data()
        console.log("✅ Usuario encontrado en colección users:", userDoc)

        if (userDoc.clienteId) {
          setUserData({
            clienteId: userDoc.clienteId,
            rol: userDoc.rol || "staff",
            username: userDoc.username || "",
            email: userDoc.email,
            firstName: userDoc.firstName || userDoc.nombre,
            lastName: userDoc.lastName || userDoc.apellido,
          })
          console.log("✅ ClienteId encontrado en users:", userDoc.clienteId)
          setLoadingUserData(false)
          return
        }
      }

      // Paso 3: Buscar en localStorage como fallback
      console.log("📱 Buscando usuario en localStorage...")
      const savedUsers = localStorage.getItem("usuarios")
      if (savedUsers) {
        const users = JSON.parse(savedUsers)
        const foundUser = users.find((u: any) => u.email === user.email)
        if (foundUser && foundUser.clienteId) {
          setUserData({
            clienteId: foundUser.clienteId,
            rol: foundUser.rol || "staff",
            username: foundUser.username || "",
            email: foundUser.email,
            firstName: foundUser.firstName || foundUser.nombre,
            lastName: foundUser.lastName || foundUser.apellido,
          })
          console.log("✅ Datos de usuario cargados desde localStorage:", foundUser.clienteId)
          setLoadingUserData(false)
          return
        }
      }

      // Si no se encuentra en ningún lado, mostrar error
      console.error("❌ Usuario no encontrado en ninguna colección")
      setError("Usuario no encontrado. Verifica que tu cuenta esté configurada correctamente en la colección 'staff'.")
      setLoadingUserData(false)

    } catch (error) {
      console.error("❌ Error cargando datos del usuario:", error)
      setError("Error cargando datos del usuario. Revisa la consola para más detalles.")
      setLoadingUserData(false)
    }
  }

  // Función para obtener el lunes de la semana actual
  const getMondayOfWeek = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Ajustar para que lunes sea el primer día
    return new Date(d.setDate(diff))
  }

  // Función para obtener las fechas de la semana (lunes a domingo)
  const getWeekDates = (mondayDate: Date) => {
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(mondayDate)
      date.setDate(mondayDate.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const weekDates = getWeekDates(getMondayOfWeek(currentWeek))

  const loadActividades = () => {
    if (!userData?.clienteId) {
      console.log("⚠️ No hay clienteId disponible")
      setError("No se pudo determinar el cliente. Recarga la página.")
      setLoadingData(false)
      return
    }

    try {
      setLoadingData(true)
      setPermissionError(false)
      setError("")

      console.log("🔄 Cargando actividades para clienteId:", userData.clienteId)
      console.log("🔄 Ruta de Firestore:", `calendario/${userData.clienteId}/actividades`)

      // Obtener fechas de la semana actual (lunes a domingo) en formato local
      const startDate = getLocalDateString(weekDates[0])
      const endDate = getLocalDateString(weekDates[6])
      console.log("📅 Rango de fechas (local):", startDate, "a", endDate)

      // Usar la estructura correcta: calendario/{clienteId}/actividades
      const actividadesRef = collection(db, `calendario/${userData.clienteId}/actividades`)
      console.log("🔗 Referencia creada:", actividadesRef.path)

      const unsubscribe = onSnapshot(
        actividadesRef,
        (snapshot) => {
          console.log("📊 Snapshot recibido. Docs:", snapshot.docs.length)

          if (snapshot.empty) {
            console.log("📭 No hay documentos en la colección")
          }

          const actividadesList = snapshot.docs.map((doc) => {
            const data = doc.data()
            console.log("📄 Documento:", doc.id, data)
            return {
              id: doc.id,
              titulo: data.titulo || "",
              hora: data.hora || "",
              fecha: data.fecha || "",
              clienteId: data.clienteId || "",
              creadoPor: data.creadoPor || "",
              fechaCreacion: data.fechaCreacion || new Date(),
            }
          }) as Actividad[]

          console.log("📋 Total actividades antes de filtrar:", actividadesList.length)

          // Filtrar por rango de fechas en el cliente
          const actividadesFiltradas = actividadesList.filter((actividad) => {
            const enRango = actividad.fecha >= startDate && actividad.fecha <= endDate
            console.log(
              `📅 Actividad ${actividad.titulo} (${actividad.fecha}): ${enRango ? "✅ En rango" : "❌ Fuera de rango"}`,
            )
            return enRango
          })

          // Ordenar manualmente en el cliente
          actividadesFiltradas.sort((a, b) => {
            if (a.fecha !== b.fecha) {
              return a.fecha.localeCompare(b.fecha)
            }
            return a.hora.localeCompare(b.hora)
          })

          setActividades(actividadesFiltradas)
          setLoadingData(false)
          console.log(`✅ Actividades finales para cliente ${userData.clienteId}:`, actividadesFiltradas.length)
        },
        (error) => {
          console.error("❌ Error cargando actividades:", error)
          console.error("❌ Error code:", error.code)
          console.error("❌ Error message:", error.message)

          if (error.code === "permission-denied") {
            setPermissionError(true)
            setError("Sin permisos para acceder al calendario. Verifica las reglas de Firestore.")
          } else if (error.code === "not-found") {
            setError(`La colección calendario/${userData.clienteId}/actividades no existe.`)
          } else {
            setError(`Error cargando actividades: ${error.message}`)
          }
          setLoadingData(false)
        },
      )

      return () => unsubscribe()
    } catch (error) {
      console.error("❌ Error configurando listener:", error)
      setError(`Error configurando calendario: ${error.message}`)
      setLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userData?.clienteId) {
      setError("No se pudo determinar el cliente. Intenta recargar la página.")
      return
    }

    try {
      console.log("💾 Guardando actividad para cliente:", userData.clienteId)

      // Usar la estructura correcta: calendario/{clienteId}/actividades
      const actividadesRef = collection(db, `calendario/${userData.clienteId}/actividades`)
      console.log("🔗 Ruta de guardado:", actividadesRef.path)

      // Solo los campos que necesitas - asegurándonos de que la fecha se guarde correctamente
      const actividadData: Omit<Actividad, "id"> = {
        titulo: formData.titulo,
        hora: formData.hora,
        fecha: formData.fecha, // Ya está en formato YYYY-MM-DD
        clienteId: userData.clienteId,
        creadoPor: user?.email || "",
        fechaCreacion: new Date(),
      }

      console.log("📄 Datos a guardar:", actividadData)

      if (editingActividad) {
        const docRef = doc(db, `calendario/${userData.clienteId}/actividades`, editingActividad.id!)
        await updateDoc(docRef, actividadData)
        console.log("✅ Actividad actualizada para cliente:", userData.clienteId)
      } else {
        const docRef = await addDoc(actividadesRef, actividadData)
        console.log("✅ Actividad creada con ID:", docRef.id, "para cliente:", userData.clienteId)
      }

      // Resetear formulario
      setFormData({
        titulo: "",
        hora: "",
        fecha: "",
      })
      setEditingActividad(null)
      setDialogOpen(false)
      setSelectedDate("")
    } catch (error) {
      console.error("❌ Error guardando actividad:", error)
      console.error("❌ Error code:", error.code)
      console.error("❌ Error message:", error.message)
      setError(`Error guardando actividad: ${error.message}`)
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
      const docRef = doc(db, `calendario/${userData?.clienteId}/actividades`, actividadId)
      await deleteDoc(docRef)
      console.log("✅ Actividad eliminada")
    } catch (error) {
      console.error("❌ Error eliminando actividad:", error)
      setError(`Error eliminando actividad: ${error.message}`)
    }
  }

  const getActividadesPorFecha = (fecha: string) => {
    return actividades.filter((actividad) => actividad.fecha === fecha)
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
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    })
  }

  const formatWeekRange = () => {
    const start = weekDates[0]
    const end = weekDates[6]
    return `${start.getDate()} - ${end.getDate()} ${end.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}`
  }

  const isWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6 // Domingo o Sábado
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
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => router.push("/staff")} className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Calendario Semanal</h1>
                <p className="text-gray-600 mt-1">
                  Gestiona entrenamientos, partidos y eventos
                  {userData && (
                    <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Cliente: {userData.clienteId}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Actividad
                </Button>
              </DialogTrigger>
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
                        setFormData({
                          titulo: "",
                          hora: "",
                          fecha: "",
                        })
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
        <div className="grid grid-cols-7 gap-4">
          {weekDates.map((date, index) => {
            const fechaString = getLocalDateString(date) // Usar función local para evitar problemas de zona horaria
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
                      className={`text-lg font-bold ${isToday ? "text-blue-600" : isWeekendDay ? "text-gray-600" : "text-gray-900"}`}
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
                            {/* Hora destacada */}
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                                {actividad.hora}
                              </div>
                              {/* Botones de acción - visibles al hacer hover */}
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
                            
                            {/* Título completo */}
                            <div className="text-sm font-medium text-gray-900 leading-tight">
                              {actividad.titulo}
                            </div>
                          </div>
                        ))}
                        
                        {/* Botón para agregar más actividades */}
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
