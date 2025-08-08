"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Calendar, Clock, Edit, Loader2, Plus, Trash2, Dumbbell, ListChecks } from 'lucide-react'
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"

interface SesionGimnasio {
  id: string
  fecha: string
  hora: string
  nroMicrociclo: number
  nroSesion: number
  totalEjercicios: number
  clienteId: string
  creadoPorEmail: string
  fechaCreacion: any
}

export default function SesionesGimnasioPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [clienteId, setClienteId] = useState("")
  const [loadingSesiones, setLoadingSesiones] = useState(true)
  const [sesiones, setSesiones] = useState<SesionGimnasio[]>([])

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  // Obtener clienteId del usuario staff
  useEffect(() => {
    const fetchClienteId = async () => {
      if (!user) return
      try {
        const staffRef = collection(db, "staff")
        const q = query(staffRef, where("email", "==", user.email))
        const snap = await getDocs(q)
        if (!snap.empty) {
          setClienteId(snap.docs[0].data().clienteId)
        } else {
          const fallback = user.email?.split("@")[0] || user.uid
          setClienteId(fallback)
        }
      } catch (e) {
        const fallback = user?.email?.split("@")[0] || user?.uid || ""
        setClienteId(fallback)
      }
    }
    fetchClienteId()
  }, [user])

  // Cargar sesiones
  useEffect(() => {
    const loadSesiones = async () => {
      if (!clienteId) return
      setLoadingSesiones(true)
      try {
        const sesionesRef = collection(db, "sesion-gimnasio")
        const q = query(sesionesRef, where("clienteId", "==", clienteId))
        const snap = await getDocs(q)
        const list: SesionGimnasio[] = []
        snap.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) })
        })
        // Ordenar por fecha/hora desc
        list.sort((a, b) => {
          const aDate = new Date(`${a.fecha}T${a.hora}`)
          const bDate = new Date(`${b.fecha}T${b.hora}`)
          return bDate.getTime() - aDate.getTime()
        })
        setSesiones(list)
      } finally {
        setLoadingSesiones(false)
      }
    }
    loadSesiones()
  }, [clienteId])

  const formatearFecha = (fecha: string) =>
    new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
  const formatearHora = (hora: string) => hora.substring(0, 5)

  const eliminarSesion = async (sesion: SesionGimnasio) => {
    if (!confirm("¿Eliminar esta sesión de gimnasio?")) return
    try {
      await deleteDoc(doc(db, "sesion-gimnasio", sesion.id))

      // Sincronizar eliminación con calendario
      try {
        const actividadesRef = collection(db, `calendario/${clienteId}/actividades`)
        const actividadesQ = query(actividadesRef, where("fecha", "==", sesion.fecha))
        const actSnap = await getDocs(actividadesQ)
        const match = actSnap.docs.find((d) => {
          const data = d.data()
          return typeof data.titulo === "string" && data.titulo.includes("Sesión Gimnasio") && data.titulo.includes(`${sesion.nroSesion}`)
        })
        if (match) {
          await deleteDoc(doc(db, `calendario/${clienteId}/actividades`, match.id))
        }
      } catch (e) {
        console.warn("No se pudo sincronizar eliminación con calendario:", e)
      }

      setSesiones((prev) => prev.filter((s) => s.id !== sesion.id))
      alert("Sesión eliminada")
    } catch (e) {
      console.error(e)
      alert("Error al eliminar la sesión")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push("/staff/entrenamientos/planificar-sesion")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Planificar Sesión
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Dumbbell className="h-7 w-7 text-purple-600" />
                Sesiones de Gimnasio
              </h1>
              <p className="text-gray-600 mt-2">Gestiona y visualiza las sesiones de gimnasio</p>
            </div>
            <Button onClick={() => router.push("/staff/entrenamientos/planificar-sesion/gimnasio/crear")} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Sesión de Gimnasio
            </Button>
          </div>
        </div>

        {loadingSesiones ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Cargando sesiones...</span>
          </div>
        ) : sesiones.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <ListChecks className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay sesiones de gimnasio</h3>
              <p className="text-gray-600 mb-6">Crea tu primera sesión de gimnasio</p>
              <Button onClick={() => router.push("/staff/entrenamientos/planificar-sesion/gimnasio/crear")} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Crear Sesión
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
                      <CardTitle className="text-lg">Sesión Gimnasio {sesion.nroSesion}</CardTitle>
                      <CardDescription>Microciclo {sesion.nroMicrociclo}</CardDescription>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex items-center gap-1">
                      <Dumbbell className="h-3 w-3" /> {sesion.totalEjercicios} ejercicios
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

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/staff/entrenamientos/planificar-sesion/gimnasio/editar/${sesion.id}`)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => eliminarSesion(sesion)}
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
