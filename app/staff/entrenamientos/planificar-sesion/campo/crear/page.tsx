"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2, Clock, Users, Timer, Loader2 } from 'lucide-react'
import { collection, query, where, getDocs, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"

interface Tarea {
  id: string
  nombre: string
  clasificacion: string
  objetivo: string
  descripcion?: string
  imagenUrl?: string
  linkTarea?: string
}

interface TareaAsignada {
  tareaId: string
  nombre: string
  cantidadBloques: number
  tiempoBloque: number // en minutos
  tiempoPausa: number // en minutos
}

export default function CrearSesionCampoPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  
  // Estados del formulario
  const [fecha, setFecha] = useState("")
  const [hora, setHora] = useState("")
  const [nroMicrociclo, setNroMicrociclo] = useState("")
  const [nroSesion, setNroSesion] = useState("")
  const [tipoSesion, setTipoSesion] = useState("")
  const [referenciaPartido, setReferenciaPartido] = useState("")
  
  // Estados para tareas
  const [tareasDisponibles, setTareasDisponibles] = useState<Tarea[]>([])
  const [tareasAsignadas, setTareasAsignadas] = useState<TareaAsignada[]>([])
  const [tareaSeleccionada, setTareaSeleccionada] = useState("")
  const [cantidadBloques, setCantidadBloques] = useState("")
  const [tiempoBloque, setTiempoBloque] = useState("")
  const [tiempoPausa, setTiempoPausa] = useState("")
  
  // Estados de carga
  const [loadingTareas, setLoadingTareas] = useState(true)
  const [saving, setSaving] = useState(false)
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

  // Cargar tareas disponibles
  useEffect(() => {
    const cargarTareas = async () => {
      if (!clienteId) return

      setLoadingTareas(true)
      try {
        const tareasRef = collection(db, "tarea")
        const q = query(
          tareasRef,
          where("clienteId", "==", clienteId),
          where("tipoTarea", "==", "campo")
        )

        const querySnapshot = await getDocs(q)
        const tareasData: Tarea[] = []

        querySnapshot.forEach((doc) => {
          tareasData.push({
            id: doc.id,
            ...doc.data()
          } as Tarea)
        })

        setTareasDisponibles(tareasData)
      } catch (error) {
        console.error("Error cargando tareas:", error)
      } finally {
        setLoadingTareas(false)
      }
    }

    cargarTareas()
  }, [clienteId])

  const agregarTarea = () => {
    if (!tareaSeleccionada || !cantidadBloques || !tiempoBloque || !tiempoPausa) {
      alert("Por favor completa todos los campos de la tarea")
      return
    }

    const tarea = tareasDisponibles.find(t => t.id === tareaSeleccionada)
    if (!tarea) return

    const nuevaTarea: TareaAsignada = {
      tareaId: tarea.id,
      nombre: tarea.nombre,
      cantidadBloques: parseInt(cantidadBloques),
      tiempoBloque: parseInt(tiempoBloque),
      tiempoPausa: parseInt(tiempoPausa)
    }

    setTareasAsignadas([...tareasAsignadas, nuevaTarea])
    
    // Limpiar formulario de tarea
    setTareaSeleccionada("")
    setCantidadBloques("")
    setTiempoBloque("")
    setTiempoPausa("")
  }

  const eliminarTarea = (index: number) => {
    setTareasAsignadas(tareasAsignadas.filter((_, i) => i !== index))
  }

  const syncSesionWithCalendar = async (sesionData: any, action: "create") => {
    if (!clienteId) return
  
    try {
      const fechaSesion = sesionData.fecha
      const horario = sesionData.hora
  
      // Crear título para el calendario
      let tituloActividad = `⚽ Sesión ${sesionData.nroSesion} - ${sesionData.tipoSesion}`
      if (sesionData.nroMicrociclo) {
        tituloActividad += ` (Microciclo ${sesionData.nroMicrociclo})`
      }
      if (sesionData.totalTareas) {
        tituloActividad += ` - ${sesionData.totalTareas} tareas`
      }
  
      // Datos de la actividad para el calendario
      const actividadData = {
        titulo: tituloActividad,
        hora: horario,
        fecha: fechaSesion,
        clienteId: clienteId,
        creadoPor: user?.email || "",
        fechaCreacion: new Date(),
      }
  
      const actividadesRef = collection(db, `calendario/${clienteId}/actividades`)
      await addDoc(actividadesRef, actividadData)
      console.log("✅ Actividad de la sesión creada en el calendario")
  
      console.log("✅ Calendario sincronizado con la sesión de campo")
    } catch (firestoreError) {
      console.log("⚠️ Error sincronizando calendario en Firestore:", firestoreError)
      
      // Fallback a localStorage
      try {
        const savedCalendar = localStorage.getItem(`calendario_${clienteId}`) || "{}"
        const calendarData = JSON.parse(savedCalendar)

        let tituloActividad = `${sesionData.hora} - ⚽ Sesión ${sesionData.nroSesion} - ${sesionData.tipoSesion}`
        if (sesionData.nroMicrociclo) {
          tituloActividad += ` (Microciclo ${sesionData.nroMicrociclo})`
        }
        if (sesionData.totalTareas) {
          tituloActividad += ` - ${sesionData.totalTareas} tareas`
        }

        calendarData[sesionData.fecha] = [...(calendarData[sesionData.fecha] || []), tituloActividad]
        localStorage.setItem(`calendario_${clienteId}`, JSON.stringify(calendarData))
        console.log("✅ Calendario actualizado en localStorage")
      } catch (localError) {
        console.error("❌ Error actualizando calendario en localStorage:", localError)
      }
    }
  }

  const guardarSesion = async () => {
    if (!fecha || !hora || !nroMicrociclo || !nroSesion || !tipoSesion) {
      alert("Por favor completa todos los campos obligatorios")
      return
    }

    if (tareasAsignadas.length === 0) {
      alert("Debes agregar al menos una tarea a la sesión")
      return
    }

    setSaving(true)
    try {
      // Preparar datos de la sesión
      const sesionData = {
        fecha,
        hora,
        nroMicrociclo: parseInt(nroMicrociclo),
        nroSesion: parseInt(nroSesion),
        tipoSesion,
        referenciaPartido,
        clienteId,
        creadoPorEmail: user?.email,
        fechaCreacion: new Date(),
        // Convertir tareas asignadas a formato tarea1, tarea2, etc.
        ...tareasAsignadas.reduce((acc, tarea, index) => {
          const tareaKey = `tarea${index + 1}`
          acc[tareaKey] = {
            tareaId: tarea.tareaId,
            nombre: tarea.nombre,
            cantidadBloques: tarea.cantidadBloques,
            tiempoBloque: tarea.tiempoBloque,
            tiempoPausa: tarea.tiempoPausa
          }
          return acc
        }, {} as any),
        totalTareas: tareasAsignadas.length
      }

      // Guardar en Firestore
      const sesionRef = collection(db, "sesion-campo")
      await addDoc(sesionRef, sesionData)

      // Sincronizar con calendario
      await syncSesionWithCalendar(sesionData, "create")

      alert("Sesión de campo guardada exitosamente y sincronizada con el calendario")
      router.push("/staff/entrenamientos/planificar-sesion/campo")
    } catch (error) {
      console.error("Error guardando sesión:", error)
      alert("Error al guardar la sesión")
    } finally {
      setSaving(false)
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/staff/entrenamientos/planificar-sesion/campo")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Sesiones de Campo
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nueva Sesión de Campo</h1>
            <p className="text-gray-600 mt-2">
              Planifica una sesión de entrenamiento de campo con tareas específicas
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>
                Datos básicos de la sesión de entrenamiento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha">Fecha *</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="hora">Hora *</Label>
                  <Input
                    id="hora"
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="microciclo">Nro de Microciclo *</Label>
                  <Input
                    id="microciclo"
                    type="number"
                    placeholder="Ej: 1"
                    value={nroMicrociclo}
                    onChange={(e) => setNroMicrociclo(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="sesion">Nro de Sesión *</Label>
                  <Input
                    id="sesion"
                    type="number"
                    placeholder="Ej: 1"
                    value={nroSesion}
                    onChange={(e) => setNroSesion(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo">Tipo de Sesión *</Label>
                  <Input
                    id="tipo"
                    type="text"
                    placeholder="Ej: Entrenamiento, Preparación, Recuperación"
                    value={tipoSesion}
                    onChange={(e) => setTipoSesion(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="referencia">Referencia de Partido</Label>
                  <Input
                    id="referencia"
                    placeholder="Ej: MD-3"
                    value={referenciaPartido}
                    onChange={(e) => setReferenciaPartido(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agregar Tareas */}
          <Card>
            <CardHeader>
              <CardTitle>Agregar Tarea</CardTitle>
              <CardDescription>
                Selecciona una tarea de campo y configura sus parámetros
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingTareas ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Cargando tareas...</span>
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="tarea">Seleccionar Tarea</Label>
                    <Select value={tareaSeleccionada} onValueChange={setTareaSeleccionada}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una tarea" />
                      </SelectTrigger>
                      <SelectContent>
                        {tareasDisponibles.map((tarea) => (
                          <SelectItem key={tarea.id} value={tarea.id}>
                            {tarea.nombre} - {tarea.clasificacion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="bloques">Cantidad de Bloques</Label>
                      <Input
                        id="bloques"
                        type="number"
                        placeholder="Ej: 3"
                        value={cantidadBloques}
                        onChange={(e) => setCantidadBloques(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tiempo-bloque">Tiempo del Bloque (min)</Label>
                      <Input
                        id="tiempo-bloque"
                        type="number"
                        placeholder="Ej: 15"
                        value={tiempoBloque}
                        onChange={(e) => setTiempoBloque(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tiempo-pausa">Tiempo de Pausa (min)</Label>
                      <Input
                        id="tiempo-pausa"
                        type="number"
                        placeholder="Ej: 5"
                        value={tiempoPausa}
                        onChange={(e) => setTiempoPausa(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button onClick={agregarTarea} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Tarea
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tareas Asignadas */}
          {tareasAsignadas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tareas Asignadas ({tareasAsignadas.length})</CardTitle>
                <CardDescription>
                  Tareas configuradas para esta sesión
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tareasAsignadas.map((tarea, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          Tarea {index + 1}: {tarea.nombre}
                        </h4>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {tarea.cantidadBloques} bloques
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {tarea.tiempoBloque} min/bloque
                          </div>
                          <div className="flex items-center">
                            <Timer className="h-4 w-4 mr-1" />
                            {tarea.tiempoPausa} min pausa
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarTarea(index)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botones de Acción */}
          <div className="flex justify-end space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push("/staff/entrenamientos/planificar-sesion/campo")}
            >
              Cancelar
            </Button>
            <Button
              onClick={guardarSesion}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Sesión"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
