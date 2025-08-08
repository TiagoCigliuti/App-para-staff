"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus, Edit, Trash2, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore"
import { ref, deleteObject } from "firebase/storage"
import { db, storage } from "@/lib/firebaseConfig"
import CrearTareaGimnasioForm from "./crear-tarea"

interface TareaGimnasio {
  id: string
  nombre: string
  clasificacion: string
  gruposMusculares: string[] // Cambiado de grupoMuscular a gruposMusculares (array)
  descripcion?: string
  imagenUrl?: string
  linkTarea?: string
  fechaCreacion: any
  creadoPorEmail: string
}

export default function TareasGimnasioPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [showCrearTarea, setShowCrearTarea] = useState(false)
  const [tareas, setTareas] = useState<TareaGimnasio[]>([])
  const [loading, setLoading] = useState(true)
  const [clienteId, setClienteId] = useState<string>("")
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

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

  // Cargar tareas
  useEffect(() => {
    const cargarTareas = async () => {
      if (!clienteId) return

      setLoading(true)
      try {
        const tareasRef = collection(db, "gimnasio")
        const q = query(
          tareasRef,
          where("clienteId", "==", clienteId)
        )

        const querySnapshot = await getDocs(q)
        const tareasData: TareaGimnasio[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          tareasData.push({
            id: doc.id,
            ...data,
            // Asegurar compatibilidad con datos antiguos
            gruposMusculares: data.gruposMusculares || (data.grupoMuscular ? [data.grupoMuscular] : [])
          } as TareaGimnasio)
        })

        // Ordenamos en el cliente por fecha de creación (más recientes primero)
        tareasData.sort((a, b) => {
          const fechaA = a.fechaCreacion?.toDate?.() || new Date(0)
          const fechaB = b.fechaCreacion?.toDate?.() || new Date(0)
          return fechaB.getTime() - fechaA.getTime()
        })

        setTareas(tareasData)
      } catch (error) {
        console.error("Error cargando tareas de gimnasio:", error)
      } finally {
        setLoading(false)
      }
    }

    cargarTareas()
  }, [clienteId])

  const handleEliminarTarea = async (tarea: TareaGimnasio) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el ejercicio "${tarea.nombre}"?`)) {
      return
    }

    setDeletingTaskId(tarea.id)
    try {
      // Eliminar imagen de Storage si existe
      if (tarea.imagenUrl) {
        try {
          const imageRef = ref(storage, tarea.imagenUrl)
          await deleteObject(imageRef)
        } catch (error) {
          console.warn("Error eliminando imagen:", error)
        }
      }

      // Eliminar documento de Firestore
      await deleteDoc(doc(db, "gimnasio", tarea.id))

      // Actualizar estado local
      setTareas(prev => prev.filter(t => t.id !== tarea.id))
      
      alert("Ejercicio eliminado exitosamente")
    } catch (error) {
      console.error("Error eliminando ejercicio:", error)
      alert("Error al eliminar el ejercicio")
    } finally {
      setDeletingTaskId(null)
    }
  }

  const handleEditarTarea = (tareaId: string) => {
    // Por ahora solo mostrar un mensaje, se puede implementar después
    alert("Función de editar en desarrollo")
  }

  const recargarTareas = () => {
    if (clienteId) {
      const cargarTareas = async () => {
        setLoading(true)
        try {
          const tareasRef = collection(db, "gimnasio")
          const q = query(
            tareasRef,
            where("clienteId", "==", clienteId)
          )

          const querySnapshot = await getDocs(q)
          const tareasData: TareaGimnasio[] = []

          querySnapshot.forEach((doc) => {
            const data = doc.data()
            tareasData.push({
              id: doc.id,
              ...data,
              // Asegurar compatibilidad con datos antiguos
              gruposMusculares: data.gruposMusculares || (data.grupoMuscular ? [data.grupoMuscular] : [])
            } as TareaGimnasio)
          })

          // Ordenamos en el cliente por fecha de creación (más recientes primero)
          tareasData.sort((a, b) => {
            const fechaA = a.fechaCreacion?.toDate?.() || new Date(0)
            const fechaB = b.fechaCreacion?.toDate?.() || new Date(0)
            return fechaB.getTime() - fechaA.getTime()
          })

          setTareas(tareasData)
        } catch (error) {
          console.error("Error cargando tareas de gimnasio:", error)
        } finally {
          setLoading(false)
        }
      }

      cargarTareas()
    }
  }

  if (showCrearTarea) {
    return (
      <CrearTareaGimnasioForm 
        onBack={() => {
          setShowCrearTarea(false)
          recargarTareas()
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/staff/entrenamientos/gestion-tareas")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Gestión de Tareas
          </Button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Ejercicios de Gimnasio</h1>
              <p className="text-gray-600 mt-2">
                Gestiona entrenamiento de fuerza, acondicionamiento físico y ejercicios personalizados
              </p>
            </div>
            
            {/* Botón Crear Ejercicio */}
            <Button
              onClick={() => setShowCrearTarea(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Ejercicio
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-600">Cargando ejercicios...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && tareas.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay ejercicios de gimnasio
              </h3>
              <p className="text-gray-600 mb-4">
                Comienza creando tu primer ejercicio de entrenamiento de gimnasio
              </p>
              <Button
                onClick={() => setShowCrearTarea(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Ejercicio
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Ejercicios Grid */}
        {!loading && tareas.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tareas.map((tarea) => (
              <Card key={tarea.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {tarea.nombre}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                          {tarea.clasificacion}
                        </span>
                      </CardDescription>
                    </div>
                    
                    {/* Botones de acción */}
                    <div className="flex space-x-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditarTarea(tarea.id)}
                        className="h-8 w-8 p-0 hover:bg-blue-100"
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEliminarTarea(tarea)}
                        disabled={deletingTaskId === tarea.id}
                        className="h-8 w-8 p-0 hover:bg-red-100"
                      >
                        {deletingTaskId === tarea.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-600" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Imagen */}
                  {tarea.imagenUrl && (
                    <div className="mb-4">
                      <img
                        src={tarea.imagenUrl || "/placeholder.svg"}
                        alt={tarea.nombre}
                        className="w-full h-32 object-cover rounded-lg border"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg?height=128&width=256&text=Imagen+no+disponible"
                        }}
                      />
                    </div>
                  )}

                  {/* Grupos Musculares */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Grupos Musculares:</h4>
                    <div className="flex flex-wrap gap-1">
                      {tarea.gruposMusculares && tarea.gruposMusculares.length > 0 ? (
                        tarea.gruposMusculares.map((grupo, index) => (
                          <span
                            key={index}
                            className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                          >
                            {grupo}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No especificado</span>
                      )}
                    </div>
                  </div>

                  {/* Descripción */}
                  {tarea.descripcion && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Descripción:</h4>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {tarea.descripcion}
                      </p>
                    </div>
                  )}

                  {/* Link */}
                  {tarea.linkTarea && (
                    <div className="mb-4">
                      <a
                        href={tarea.linkTarea}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ver recurso
                      </a>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="text-xs text-gray-500 border-t pt-3">
                    <p>Creado por: {tarea.creadoPorEmail}</p>
                    <p>
                      Fecha: {tarea.fechaCreacion?.toDate?.()?.toLocaleDateString() || 'N/A'}
                    </p>
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
