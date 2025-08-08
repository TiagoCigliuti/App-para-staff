"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus, Calendar, Clock, Users, Target, Loader2, Edit, Trash2 } from 'lucide-react'
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"

interface SesionCampo {
  id: string
  fecha: string
  hora: string
  nroMicrociclo: number
  nroSesion: number
  tipoSesion: string
  referenciaPartido?: string
  totalTareas: number
  clienteId: string
  creadoPorEmail: string
  fechaCreacion: any
}

export default function SesionesCampoPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  
  const [sesiones, setSesiones] = useState<SesionCampo[]>([])
  const [loadingSesiones, setLoadingSesiones] = useState(true)
  const [clienteId, setClienteId] = useState("")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  // Obtener clienteId del usuario staff
  useEffect(() => {
    const obtenerClienteId = async () => {
      if (!user) return

      try {
        const staffRef = collection(db, "staff")
        const q = query(staffRef, where("email", "==", user.email))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          const staffData = querySnapshot.docs[0].data()
          setClienteId(staffData.clienteId)
        } else {
          const fallbackClienteId = user.email?.split('@')[0] || user.uid
          setClienteId(fallbackClienteId)
        }
      } catch (error) {
        console.error("Error obteniendo clienteId:", error)
        const fallbackClienteId = user.email?.split('@')[0] || user.uid
        setClienteId(fallbackClienteId)
      }
    }

    obtenerClienteId()
  }, [user])

  // Cargar sesiones de campo
  useEffect(() => {
    const cargarSesiones = async () => {
      if (!clienteId) return

      setLoadingSesiones(true)
      try {
        const sesionesRef = collection(db, "sesion-campo")
        const q = query(sesionesRef, where("clienteId", "==", clienteId))
        const querySnapshot = await getDocs(q)
        
        const sesionesData: SesionCampo[] = []
        querySnapshot.forEach((doc) => {
          sesionesData.push({
            id: doc.id,
            ...doc.data()
          } as SesionCampo)
        })

        // Ordenar por fecha y hora (más recientes primero)
        sesionesData.sort((a, b) => {
          const fechaA = new Date(`${a.fecha}T${a.hora}`)
          const fechaB = new Date(`${b.fecha}T${b.hora}`)
          return fechaB.getTime() - fechaA.getTime()
        })

        setSesiones(sesionesData)
      } catch (error) {
        console.error("Error cargando sesiones:", error)
      } finally {
        setLoadingSesiones(false)
      }
    }

    cargarSesiones()
  }, [clienteId])

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha + 'T00:00:00')
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatearHora = (hora: string) => {
    return hora.substring(0, 5) // HH:MM
  }

  const getTipoSesionColor = (tipo: string) => {
    const colores = {
      'entrenamiento': 'bg-blue-100 text-blue-800',
      'preparacion': 'bg-green-100 text-green-800',
      'recuperacion': 'bg-purple-100 text-purple-800',
      'tactica': 'bg-orange-100 text-orange-800',
      'tecnica': 'bg-yellow-100 text-yellow-800'
    }
    return colores[tipo as keyof typeof colores] || 'bg-gray-100 text-gray-800'
  }

  const eliminarSesion = async (sesionId: string, sesionData: SesionCampo) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta sesión?')) {
      return
    }

    try {
      // Eliminar de Firestore
      await deleteDoc(doc(db, "sesion-campo", sesionId))
      
      // Actualizar estado local
      setSesiones(sesiones.filter(s => s.id !== sesionId))
      
      // Sincronizar eliminación con calendario
      await syncSesionWithCalendar(sesionData, "delete")
      
      alert('Sesión eliminada exitosamente')
    } catch (error) {
      console.error("Error eliminando sesión:", error)
      alert('Error al eliminar la sesión')
    }
  }

  const syncSesionWithCalendar = async (sesionData: SesionCampo, action: "delete") => {
    if (!clienteId) return
  
    try {
      const fechaSesion = sesionData.fecha
  
      if (action === "delete") {
        // Para eliminación, buscar y eliminar la actividad de la sesión
        const actividadesRef = collection(db, `calendario/${clienteId}/actividades`)
        const actividadesQuery = query(actividadesRef, where("fecha", "==", fechaSesion))
        const actividadesSnapshot = await getDocs(actividadesQuery)
        
        // Buscar la actividad que corresponde a esta sesión
        const actividadSesion = actividadesSnapshot.docs.find(doc => {
          const data = doc.data()
          return data.titulo.includes(`Sesión ${sesionData.nroSesion}`) && data.titulo.includes("⚽")
        })
        
        if (actividadSesion) {
          await deleteDoc(doc(db, `calendario/${clienteId}/actividades`, actividadSesion.id))
          console.log("✅ Actividad de la sesión eliminada del calendario")
        }
        return
      }
  
      console.log("✅ Calendario sincronizado")
    } catch (firestoreError) {
      console.log("⚠️ Error sincronizando calendario en Firestore:", firestoreError)
      
      // Fallback a localStorage
      try {
        const savedCalendar = localStorage.getItem(`calendario_${clienteId}`) || "{}"
        const calendarData = JSON.parse(savedCalendar)
  
        if (action === "delete") {
          // Eliminar del localStorage
          if (calendarData[sesionData.fecha]) {
            calendarData[sesionData.fecha] = calendarData[sesionData.fecha].filter((activity: string) => {
              return !(activity.includes(`Sesión ${sesionData.nroSesion}`) && activity.includes("⚽"))
            })
            if (calendarData[sesionData.fecha].length === 0) {
              delete calendarData[sesionData.fecha]
            }
          }
        }
  
        localStorage.setItem(`calendario_${clienteId}`, JSON.stringify(calendarData))
        console.log("✅ Calendario actualizado en localStorage")
      } catch (localError) {
        console.error("❌ Error actualizando calendario en localStorage:", localError)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/staff/entrenamientos/planificar-sesion")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Planificar Sesión
          </Button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sesiones de Campo</h1>
              <p className="text-gray-600 mt-2">
                Gestiona y visualiza todas las sesiones de entrenamiento de campo
              </p>
            </div>
            
            <Button
              onClick={() => router.push("/staff/entrenamientos/planificar-sesion/campo/crear")}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Sesión de Campo
            </Button>
          </div>
        </div>

        {/* Lista de Sesiones */}
        {loadingSesiones ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span className="text-lg">Cargando sesiones...</span>
          </div>
        ) : sesiones.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Target className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay sesiones de campo
              </h3>
              <p className="text-gray-600 mb-6">
                Comienza creando tu primera sesión de entrenamiento de campo
              </p>
              <Button
                onClick={() => router.push("/staff/entrenamientos/planificar-sesion/campo/crear")}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Sesión
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sesiones.map((sesion) => (
              <Card key={sesion.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        Sesión {sesion.nroSesion}
                      </CardTitle>
                      <CardDescription>
                        Microciclo {sesion.nroMicrociclo}
                      </CardDescription>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoSesionColor(sesion.tipoSesion)}`}>
                      {sesion.tipoSesion}
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatearFecha(sesion.fecha)}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    {formatearHora(sesion.hora)}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    {sesion.totalTareas} {sesion.totalTareas === 1 ? 'tarea' : 'tareas'}
                  </div>
                  
                  {sesion.referenciaPartido && (
                    <div className="text-sm text-gray-600">
                      <strong>Referencia:</strong> {sesion.referenciaPartido}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Creado por: {sesion.creadoPorEmail}
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/staff/entrenamientos/planificar-sesion/campo/editar/${sesion.id}`)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => eliminarSesion(sesion.id, sesion)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar
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
