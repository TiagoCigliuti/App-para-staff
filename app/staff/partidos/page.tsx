"use client"

import type React from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDoc,
  setDoc,
} from "firebase/firestore"
import { auth, db } from "@/lib/firebaseConfig"
import { signOut } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, Plus, MoreVertical, Edit, Trash2, User, LogOut, Trophy, Calendar, Clock, MapPin, Users, AlertCircle } from 'lucide-react'

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

interface Partido {
  id: string
  torneo: string
  jornada: string
  rival: string
  fecha: string
  horario: string
  estadio: string
  clienteId: string
  clienteNombre: string
  estado: "programado" | "jugado" | "cancelado"
  fechaCreacion: Date
  creadoPor: string
  resultado?: string
  observaciones?: string
}

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

export default function PartidosPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [loadingPartidos, setLoadingPartidos] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingPartido, setEditingPartido] = useState<Partido | null>(null)
  const [error, setError] = useState("")

  // Estados del formulario
  const [formData, setFormData] = useState({
    torneo: "",
    jornada: "",
    rival: "",
    fecha: "",
    horario: "",
    estadio: "",
    estado: "programado" as "programado" | "jugado" | "cancelado",
    resultado: "",
    observaciones: "",
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")

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

  useEffect(() => {
    if (staffUser && cliente) {
      loadPartidos()
    }
  }, [staffUser, cliente])

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
          console.log("⚠️ Usuario staff no encontrado en Firestore")
          await loadStaffFromLocalStorage()
        }
      } catch (firestoreError: any) {
        console.log("⚠️ Error consultando Firestore:", firestoreError.message)
        await loadStaffFromLocalStorage()
      }
    } catch (error: any) {
      console.error("❌ Error cargando datos del staff:", error)
      setError("Error cargando datos del usuario staff")
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
          return
        }
      }

      // Si no se encuentra, crear usuario temporal
      await createTemporaryStaffUser()
    } catch (error) {
      console.error("❌ Error cargando desde localStorage:", error)
      await createTemporaryStaffUser()
    }
  }

  const createTemporaryStaffUser = async () => {
    try {
      const tempStaffUser: StaffUser = {
        id: "temp_" + Date.now(),
        nombre: user?.displayName?.split(" ")[0] || "Usuario",
        apellido: user?.displayName?.split(" ")[1] || "Staff",
        email: user?.email || "",
        clienteId: "temp_client_" + Date.now(),
        clienteNombre: "Cliente Temporal",
        rol: "staff",
        estado: "activo",
      }

      const tempCliente: Cliente = {
        id: tempStaffUser.clienteId,
        nombre: "Cliente Temporal",
        funcionalidades: ["partidos", "jugadores", "entrenamientos", "evaluaciones"],
        estado: "activo",
      }

      setStaffUser(tempStaffUser)
      setCliente(tempCliente)

      console.log("✅ Usuario staff temporal creado:", tempStaffUser)
    } catch (error) {
      console.error("❌ Error creando usuario temporal:", error)
      setError("No se pudo inicializar el usuario staff. Contacta al administrador.")
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
        nombre: "Cliente Temporal",
        funcionalidades: ["partidos", "jugadores", "entrenamientos", "evaluaciones"],
        estado: "activo",
      }

      setCliente(tempCliente)
      console.log("✅ Cliente temporal creado:", tempCliente)
    } catch (error) {
      console.error("❌ Error cargando cliente desde localStorage:", error)
      setError("Error cargando datos del cliente")
    }
  }

  const loadPartidos = async () => {
    try {
      setLoadingPartidos(true)
      console.log("🔄 Cargando partidos del cliente:", cliente?.id)

      if (!cliente?.id) {
        console.error("❌ No hay clienteId disponible")
        setPartidos([])
        setLoadingPartidos(false)
        return
      }

      try {
        console.log("🔍 Consultando partidos en Firestore...")
        const partidosRef = collection(db, "partidos")
        // Use only the where clause to avoid composite index requirement
        const partidosQuery = query(partidosRef, where("clienteId", "==", cliente.id))
        const partidosSnapshot = await getDocs(partidosQuery)

        const partidosData = partidosSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date(),
        })) as Partido[]

        // Sort the data in JavaScript instead of Firestore
        partidosData.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

        setPartidos(partidosData)
        console.log("✅ Partidos cargados desde Firestore:", partidosData.length)

        // Backup en localStorage
        if (partidosData.length > 0) {
          localStorage.setItem(`partidos_${cliente.id}`, JSON.stringify(partidosData))
        }
      } catch (firestoreError: any) {
        console.error("❌ Error con Firestore:", firestoreError)

        // Fallback a localStorage
        const savedPartidos = localStorage.getItem(`partidos_${cliente.id}`)
        if (savedPartidos) {
          const parsedPartidos = JSON.parse(savedPartidos).map((partido: any) => ({
            ...partido,
            fechaCreacion: new Date(partido.fechaCreacion),
          }))
          // Sort the localStorage data as well
          parsedPartidos.sort((a: Partido, b: Partido) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
          setPartidos(parsedPartidos)
          console.log("⚠️ Partidos cargados desde localStorage:", parsedPartidos.length)
        } else {
          setPartidos([])
          console.log("✅ No hay partidos guardados, array vacío")
        }
      }
    } catch (error) {
      console.error("❌ Error general cargando partidos:", error)
      setPartidos([])
    } finally {
      setLoadingPartidos(false)
    }
  }

  const syncPartidoWithCalendar = async (partidoData: any, action: "create" | "update" | "delete") => {
    if (!cliente?.id) return

    try {
      const fechaPartido = partidoData.fecha // Ya está en formato YYYY-MM-DD
      const horario = partidoData.horario

      if (action === "delete") {
        // Para eliminación, buscar y eliminar la actividad del partido
        const actividadesRef = collection(db, `calendario/${cliente.id}/actividades`)
        const actividadesQuery = query(actividadesRef, where("fecha", "==", fechaPartido))
        const actividadesSnapshot = await getDocs(actividadesQuery)
        
        // Buscar la actividad que corresponde a este partido
        const actividadPartido = actividadesSnapshot.docs.find(doc => {
          const data = doc.data()
          return data.titulo.includes(`vs ${partidoData.rival}`) && data.titulo.includes("🏆")
        })
        
        if (actividadPartido) {
          await deleteDoc(doc(db, `calendario/${cliente.id}/actividades`, actividadPartido.id))
          console.log("✅ Actividad del partido eliminada del calendario")
        }
        return
      }

      // Crear título para el calendario
      let tituloActividad = `🏆 ${partidoData.torneo}: vs ${partidoData.rival}`
      if (partidoData.estadio) {
        tituloActividad += ` (${partidoData.estadio})`
      }
      if (partidoData.estado === "jugado" && partidoData.resultado) {
        tituloActividad += ` - Resultado: ${partidoData.resultado}`
      }
      if (partidoData.estado === "cancelado") {
        tituloActividad += ` - CANCELADO`
      }

      // Datos de la actividad para el calendario
      const actividadData = {
        titulo: tituloActividad,
        hora: horario,
        fecha: fechaPartido, // Mantener el formato YYYY-MM-DD
        clienteId: cliente.id,
        creadoPor: user?.email || "",
        fechaCreacion: new Date(),
      }

      const actividadesRef = collection(db, `calendario/${cliente.id}/actividades`)

      if (action === "create") {
        // Crear nueva actividad en el calendario
        await addDoc(actividadesRef, actividadData)
        console.log("✅ Actividad del partido creada en el calendario")
      } else if (action === "update") {
        // Buscar y actualizar la actividad existente
        const actividadesQuery = query(actividadesRef, where("fecha", "==", fechaPartido))
        const actividadesSnapshot = await getDocs(actividadesQuery)
        
        // Buscar la actividad que corresponde a este partido
        const actividadPartido = actividadesSnapshot.docs.find(doc => {
          const data = doc.data()
          return data.titulo.includes(`vs ${partidoData.rival}`) && data.titulo.includes("🏆")
        })
        
        if (actividadPartido) {
          // Actualizar actividad existente
          await updateDoc(doc(db, `calendario/${cliente.id}/actividades`, actividadPartido.id), actividadData)
          console.log("✅ Actividad del partido actualizada en el calendario")
        } else {
          // Si no existe, crear nueva actividad
          await addDoc(actividadesRef, actividadData)
          console.log("✅ Nueva actividad del partido creada en el calendario")
        }
      }

      console.log("✅ Calendario sincronizado con Firestore")
    } catch (firestoreError) {
      console.log("⚠️ Error sincronizando calendario en Firestore:", firestoreError)
      
      // Fallback a localStorage
      try {
        const savedCalendar = localStorage.getItem(`calendario_${cliente.id}`) || "{}"
        const calendarData = JSON.parse(savedCalendar)

        if (action === "delete") {
          // Eliminar del localStorage
          if (calendarData[partidoData.fecha]) {
            calendarData[partidoData.fecha] = calendarData[partidoData.fecha].filter((activity: string) => {
              return !(activity.includes(`vs ${partidoData.rival}`) && activity.includes("🏆"))
            })
            if (calendarData[partidoData.fecha].length === 0) {
              delete calendarData[partidoData.fecha]
            }
          }
        } else {
          // Crear o actualizar en localStorage
          let tituloActividad = `${horario} - 🏆 ${partidoData.torneo}: vs ${partidoData.rival}`
          if (partidoData.estadio) {
            tituloActividad += ` (${partidoData.estadio})`
          }
          if (partidoData.estado === "jugado" && partidoData.resultado) {
            tituloActividad += ` - Resultado: ${partidoData.resultado}`
          }
          if (partidoData.estado === "cancelado") {
            tituloActividad += ` - CANCELADO`
          }

          if (action === "create") {
            calendarData[partidoData.fecha] = [...(calendarData[partidoData.fecha] || []), tituloActividad]
          } else if (action === "update") {
            const currentActivities = calendarData[partidoData.fecha] || []
            const updatedActivities = currentActivities.map((activity: string) => {
              if (activity.includes(`vs ${partidoData.rival}`) && activity.includes("🏆")) {
                return tituloActividad
              }
              return activity
            })

            if (!updatedActivities.some((activity: string) => activity === tituloActividad)) {
              updatedActivities.push(tituloActividad)
            }

            calendarData[partidoData.fecha] = updatedActivities
          }
        }

        localStorage.setItem(`calendario_${cliente.id}`, JSON.stringify(calendarData))
        console.log("✅ Calendario actualizado en localStorage")
      } catch (localError) {
        console.error("❌ Error actualizando calendario en localStorage:", localError)
      }
    }
  }

  const handleEdit = (partido: Partido) => {
    setEditingPartido(partido)
    setFormData({
      torneo: partido.torneo,
      jornada: partido.jornada,
      rival: partido.rival,
      fecha: partido.fecha,
      horario: partido.horario,
      estadio: partido.estadio,
      estado: partido.estado,
      resultado: partido.resultado || "",
      observaciones: partido.observaciones || "",
    })
    setShowCreateDialog(true)
  }

  const handleDelete = async (partidoId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este partido?")) return

    try {
      console.log("🔄 Eliminando partido:", partidoId)

      // Obtener datos del partido antes de eliminarlo para la sincronización
      const partidoData = partidos.find((p) => p.id === partidoId)

      // Intentar eliminar de Firestore primero
      let firestoreSuccess = false
      try {
        await deleteDoc(doc(db, "partidos", partidoId))
        console.log("✅ Partido eliminado de Firestore:", partidoId)
        firestoreSuccess = true
      } catch (firestoreError: any) {
        console.log("⚠️ Error eliminando de Firestore:", firestoreError.message)
        console.log("🔄 Continuando con eliminación local...")
      }

      // Eliminar de localStorage (siempre)
      try {
        const partidosActualizados = partidos.filter((partido) => partido.id !== partidoId)
        setPartidos(partidosActualizados)
        localStorage.setItem(`partidos_${cliente?.id}`, JSON.stringify(partidosActualizados))
        console.log("✅ Partido eliminado de localStorage")
      } catch (localError) {
        console.error("❌ Error eliminando de localStorage:", localError)
      }

      // Sincronizar eliminación con calendario
      if (partidoData) {
        await syncPartidoWithCalendar(partidoData, "delete")
      }
    } catch (error) {
      console.error("❌ Error general eliminando partido:", error)
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

  const formatFecha = (fecha: string) => {
    // Crear fecha local para evitar problemas de zona horaria
    const localDate = createLocalDate(fecha)
    return localDate.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case "programado":
        return "default"
      case "jugado":
        return "secondary"
      case "cancelado":
        return "destructive"
      default:
        return "default"
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormLoading(true)
    setFormError("")
    setFormSuccess("")

    try {
      const partidoData: Partido = {
        id: editingPartido ? editingPartido.id : "",
        torneo: formData.torneo,
        jornada: formData.jornada,
        rival: formData.rival,
        fecha: formData.fecha, // Ya está en formato YYYY-MM-DD del input date
        horario: formData.horario,
        estadio: formData.estadio,
        clienteId: cliente?.id || "",
        clienteNombre: cliente?.nombre || "",
        estado: formData.estado,
        fechaCreacion: new Date(),
        creadoPor: user?.email || "",
        resultado: formData.resultado,
        observaciones: formData.observaciones,
      }

      if (editingPartido) {
        // Actualizar partido existente
        await updateDoc(doc(db, "partidos", editingPartido.id), partidoData)
        console.log("✅ Partido actualizado en Firestore:", editingPartido.id)
      } else {
        // Crear nuevo partido
        const newPartidoRef = await addDoc(collection(db, "partidos"), partidoData)
        console.log("✅ Partido creado en Firestore:", newPartidoRef.id)
      }

      // Actualizar partidos en estado
      const partidosActualizados = editingPartido
        ? partidos.map((partido) => (partido.id === editingPartido.id ? partidoData : partido))
        : [...partidos, partidoData]

      setPartidos(partidosActualizados)
      localStorage.setItem(`partidos_${cliente?.id}`, JSON.stringify(partidosActualizados))

      // Sincronizar con calendario
      await syncPartidoWithCalendar(partidoData, editingPartido ? "update" : "create")

      setFormSuccess(editingPartido ? "Partido actualizado exitosamente" : "Partido creado exitosamente")
    } catch (error: any) {
      console.error("❌ Error al procesar el formulario:", error)
      setFormError("Error al procesar el formulario")
    } finally {
      setFormLoading(false)
      setShowCreateDialog(false)
      setEditingPartido(null)
      setFormData({
        torneo: "",
        jornada: "",
        rival: "",
        fecha: "",
        horario: "",
        estadio: "",
        estado: "programado",
        resultado: "",
        observaciones: "",
      })
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando gestión de partidos...</p>
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
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => router.push("/staff")} className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Partidos</h1>
                <p className="text-gray-600 mt-1">
                  Organiza partidos, convocatorias y resultados
                  {cliente && <span className="text-sm"> • {cliente.nombre}</span>}
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
                    <p className="text-sm font-medium">{user.displayName || "Usuario"}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    {cliente && <p className="text-xs text-gray-500">Cliente: {cliente.nombre}</p>}
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
        {/* Header con botón crear */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Partidos ({loadingPartidos ? "..." : partidos.length})
            </h2>
            <p className="text-gray-600 text-sm mt-1">Gestiona los partidos del equipo</p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingPartido(null)
                  setFormData({
                    torneo: "",
                    jornada: "",
                    rival: "",
                    fecha: "",
                    horario: "",
                    estadio: "",
                    estado: "programado",
                    resultado: "",
                    observaciones: "",
                  })
                  setFormError("")
                  setFormSuccess("")
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Partido
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPartido ? "Editar Partido" : "Programar Nuevo Partido"}</DialogTitle>
                <DialogDescription>
                  {editingPartido
                    ? "Actualiza la información del partido"
                    : "Completa los datos para programar un nuevo partido"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Columna Izquierda */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="torneo">Torneo *</Label>
                      <Input
                        id="torneo"
                        type="text"
                        value={formData.torneo}
                        onChange={(e) => setFormData({ ...formData, torneo: e.target.value })}
                        placeholder="Ej: Liga Nacional, Copa del Rey..."
                        required
                        disabled={formLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="jornada">Jornada</Label>
                      <Input
                        id="jornada"
                        type="text"
                        value={formData.jornada}
                        onChange={(e) => setFormData({ ...formData, jornada: e.target.value })}
                        placeholder="Ej: Jornada 15, Cuartos de Final..."
                        disabled={formLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rival">Rival *</Label>
                      <Input
                        id="rival"
                        type="text"
                        value={formData.rival}
                        onChange={(e) => setFormData({ ...formData, rival: e.target.value })}
                        placeholder="Nombre del equipo rival"
                        required
                        disabled={formLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fecha">Fecha *</Label>
                      <Input
                        id="fecha"
                        type="date"
                        value={formData.fecha}
                        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                        required
                        disabled={formLoading}
                      />
                    </div>
                  </div>

                  {/* Columna Derecha */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="horario">Horario *</Label>
                      <Input
                        id="horario"
                        type="time"
                        value={formData.horario}
                        onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                        required
                        disabled={formLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estadio">Estadio</Label>
                      <Input
                        id="estadio"
                        type="text"
                        value={formData.estadio}
                        onChange={(e) => setFormData({ ...formData, estadio: e.target.value })}
                        placeholder="Nombre del estadio"
                        disabled={formLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <select
                        id="estado"
                        value={formData.estado}
                        onChange={(e) =>
                          setFormData({ ...formData, estado: e.target.value as "programado" | "jugado" | "cancelado" })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={formLoading}
                      >
                        <option value="programado">Programado</option>
                        <option value="jugado">Jugado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>

                    {formData.estado === "jugado" && (
                      <div className="space-y-2">
                        <Label htmlFor="resultado">Resultado</Label>
                        <Input
                          id="resultado"
                          type="text"
                          value={formData.resultado}
                          onChange={(e) => setFormData({ ...formData, resultado: e.target.value })}
                          placeholder="Ej: 2-1, 0-3..."
                          disabled={formLoading}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <textarea
                    id="observaciones"
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    placeholder="Notas adicionales sobre el partido..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    disabled={formLoading}
                  />
                </div>

                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                {formSuccess && (
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">{formSuccess}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateDialog(false)
                      setEditingPartido(null)
                      setFormData({
                        torneo: "",
                        jornada: "",
                        rival: "",
                        fecha: "",
                        horario: "",
                        estadio: "",
                        estado: "programado",
                        resultado: "",
                        observaciones: "",
                      })
                    }}
                    disabled={formLoading}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={formLoading} className="flex-1">
                    {formLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingPartido ? "Actualizando..." : "Creando..."}
                      </div>
                    ) : editingPartido ? (
                      "Actualizar Partido"
                    ) : (
                      "Crear Partido"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de partidos */}
        {loadingPartidos ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : partidos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay partidos programados</h3>
              <p className="text-gray-500 text-center mb-6">
                Comienza programando tu primer partido para gestionar el calendario del equipo.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Programar Primer Partido
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partidos.map((partido) => (
              <Card key={partido.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Trophy className="w-5 h-5 text-yellow-600" />
                        <CardTitle className="text-lg">{partido.torneo}</CardTitle>
                      </div>
                      {partido.jornada && <p className="text-sm text-gray-600 mb-2">{partido.jornada}</p>}
                      <Badge variant={getEstadoBadgeVariant(partido.estado)}>{partido.estado}</Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(partido)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(partido.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Users className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="font-medium">vs {partido.rival}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      <span>{formatFecha(partido.fecha)}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Clock className="w-4 h-4 mr-2 text-gray-500" />
                      <span>{partido.horario}</span>
                    </div>
                    {partido.estadio && (
                      <div className="flex items-center text-sm">
                        <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                        <span>{partido.estadio}</span>
                      </div>
                    )}
                    {partido.resultado && (
                      <div className="flex items-center text-sm">
                        <Trophy className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="font-medium">Resultado: {partido.resultado}</span>
                      </div>
                    )}
                  </div>
                  {partido.observaciones && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-600">{partido.observaciones}</p>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500">Creado: {partido.fechaCreacion.toLocaleDateString()}</p>
                    <p className="text-xs text-gray-500">Por: {partido.creadoPor}</p>
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
