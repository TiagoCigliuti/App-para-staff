"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { db } from "@/lib/firebaseConfig"
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore"
import { ArrowLeft, Calendar, CheckCircle2, Dumbbell, Loader2, Plus, Trash2, UserCircle2, Search, ListChecks } from 'lucide-react'

interface StaffUserLite {
  clienteId: string
  email: string
}

interface JugadorLite {
  id: string
  nombre: string
  apellido: string
  nombreVisualizacion?: string
  clienteId: string
}

interface EjercicioGimnasio {
  id: string
  nombre: string
  clasificacion?: string
  gruposMusculares?: string[]
  imagenUrl?: string
  clienteId: string
}

type AsignacionEjercicio = {
  ejercicioId: string
  nombre: string
  series: number
  isometrico: boolean
  repeticiones?: number
  tiempoSegundos?: number
  // Campos solo para UI
  tiempoMin?: string
  tiempoSec?: string
}

interface SesionIndividual {
  id: string
  jugadorId: string
  jugadorNombre: string
  objetivo: string
  frecuenciaSemanal: number
  circulacion: number
  totalEjercicios: number
  ejercicios: AsignacionEjercicio[]
  clienteId: string
  creadoPorEmail: string
  fechaCreacion: any
}

export default function SesionIndividualizadaPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [clienteId, setClienteId] = useState("")
  const [loadingCliente, setLoadingCliente] = useState(true)

  const [jugadores, setJugadores] = useState<JugadorLite[]>([])
  const [ejercicios, setEjercicios] = useState<EjercicioGimnasio[]>([])
  const [sesiones, setSesiones] = useState<SesionIndividual[]>([])
  const [loadingSesiones, setLoadingSesiones] = useState(true)
  const [error, setError] = useState<string>("")

  // Form state
  const [creating, setCreating] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [formError, setFormError] = useState("")

  const [selectedJugadorId, setSelectedJugadorId] = useState("")
  const [objetivo, setObjetivo] = useState("")
  const [frecuenciaSemanal, setFrecuenciaSemanal] = useState("3")
  const [circulacion, setCirculacion] = useState("1")

  const [searchJugador, setSearchJugador] = useState("")
  const [searchEjercicio, setSearchEjercicio] = useState("")
  const [selectedEjercicios, setSelectedEjercicios] = useState<AsignacionEjercicio[]>([])

  // Redirect if not auth
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  // Resolve clienteId for staff
  useEffect(() => {
    const fetchClienteId = async () => {
      if (!user) return
      setLoadingCliente(true)
      setError("")
      try {
        const staffRef = collection(db, "staff")
        const qStaff = query(staffRef, where("email", "==", user.email))
        const snap = await getDocs(qStaff)
        if (!snap.empty) {
          const data = snap.docs[0].data() as StaffUserLite
          setClienteId((data as any).clienteId)
        } else {
          // Fallback
          const fallback = user.email?.split("@")[0] || user.uid
          setClienteId(fallback || "")
        }
      } catch (e: any) {
        const fallback = user?.email?.split("@")[0] || user?.uid || ""
        setClienteId(fallback)
      } finally {
        setLoadingCliente(false)
      }
    }
    if (user) fetchClienteId()
  }, [user])

  // Load collections after clienteId resolved
  useEffect(() => {
    const loadData = async () => {
      if (!clienteId) return
      setLoadingSesiones(true)
      setError("")
      try {
        // Load jugadores
        const jugadoresRef = collection(db, "jugadores")
        const qJug = query(jugadoresRef, where("clienteId", "==", clienteId))
        const jugSnap = await getDocs(qJug)
        const jugList: JugadorLite[] = []
        jugSnap.forEach((d) => {
          const jd = d.data() as any
          jugList.push({
            id: d.id,
            nombre: jd.nombre,
            apellido: jd.apellido,
            nombreVisualizacion: jd.nombreVisualizacion,
            clienteId: jd.clienteId,
          })
        })
        setJugadores(jugList)

        // Load ejercicios de gimnasio
        const gymRef = collection(db, "gimnasio")
        const qGym = query(gymRef, where("clienteId", "==", clienteId))
        const gymSnap = await getDocs(qGym)
        const gymList: EjercicioGimnasio[] = []
        gymSnap.forEach((d) => {
          const ed = d.data() as any
          gymList.push({
            id: d.id,
            nombre: ed.nombre,
            clasificacion: ed.clasificacion,
            gruposMusculares: ed.gruposMusculares || (ed.grupoMuscular ? [ed.grupoMuscular] : []),
            imagenUrl: ed.imagenUrl,
            clienteId: ed.clienteId,
          })
        })
        setEjercicios(gymList)

        // Load sesiones individualizadas
        const sesRef = collection(db, "sesion-individual")
        const qSes = query(sesRef, where("clienteId", "==", clienteId))
        const sesSnap = await getDocs(qSes)
        const sesList: SesionIndividual[] = []
        sesSnap.forEach((d) => {
          const sd = d.data() as any
          sesList.push({
            id: d.id,
            ...sd,
          } as SesionIndividual)
        })
        // Sort: newest first by fechaCreacion if present
        sesList.sort((a, b) => {
          const aDate = (a.fechaCreacion?.toDate?.() as Date) || new Date(0)
          const bDate = (b.fechaCreacion?.toDate?.() as Date) || new Date(0)
          return bDate.getTime() - aDate.getTime()
        })
        setSesiones(sesList)
      } catch (e: any) {
        setError(e?.message || "Error cargando datos")
      } finally {
        setLoadingSesiones(false)
      }
    }
    if (clienteId) loadData()
  }, [clienteId])

  const jugadoresFiltrados = useMemo(() => {
    if (!searchJugador.trim()) return jugadores
    const term = searchJugador.toLowerCase()
    return jugadores.filter(
      (j) =>
        j.nombre.toLowerCase().includes(term) ||
        j.apellido.toLowerCase().includes(term) ||
        (j.nombreVisualizacion || "").toLowerCase().includes(term),
    )
  }, [jugadores, searchJugador])

  const ejerciciosFiltrados = useMemo(() => {
    if (!searchEjercicio.trim()) return ejercicios
    const term = searchEjercicio.toLowerCase()
    return ejercicios.filter(
      (e) =>
        e.nombre.toLowerCase().includes(term) ||
        (e.clasificacion || "").toLowerCase().includes(term) ||
        (e.gruposMusculares || []).some((g) => g.toLowerCase().includes(term)),
    )
  }, [ejercicios, searchEjercicio])

  const addEjercicio = (ej: EjercicioGimnasio) => {
    if (selectedEjercicios.some((s) => s.ejercicioId === ej.id)) return
    const nuevo: AsignacionEjercicio = {
      ejercicioId: ej.id,
      nombre: ej.nombre,
      series: 3,
      isometrico: false,
      repeticiones: 10,
      tiempoSegundos: undefined,
      tiempoMin: "",
      tiempoSec: "",
    }
    setSelectedEjercicios((prev) => [...prev, nuevo])
  }

  const removeEjercicio = (ejercicioId: string) => {
    setSelectedEjercicios((prev) => prev.filter((e) => e.ejercicioId !== ejercicioId))
  }

  const updateAsignacion = (id: string, patch: Partial<AsignacionEjercicio>) => {
    setSelectedEjercicios((prev) =>
      prev.map((e) => (e.ejercicioId === id ? { ...e, ...patch } : e)),
    )
  }

  const resetForm = () => {
    setSelectedJugadorId("")
    setObjetivo("")
    setFrecuenciaSemanal("3")
    setCirculacion("1")
    setSearchEjercicio("")
    setSelectedEjercicios([])
    setFormError("")
  }

  const handleSave = async () => {
    if (!user || !clienteId) return
    setFormError("")
    // Validations
    if (!selectedJugadorId) {
      setFormError("Selecciona un jugador")
      return
    }
    if (!objetivo.trim()) {
      setFormError("Ingresa un objetivo")
      return
    }
    const freq = Number.parseInt(frecuenciaSemanal || "0", 10)
    if (!Number.isFinite(freq) || freq < 1) {
      setFormError("La frecuencia semanal debe ser un número válido (>= 1)")
      return
    }
    const circ = Number.parseInt(circulacion || "0", 10)
    if (!Number.isFinite(circ) || circ < 1) {
      setFormError("La circulación debe ser un número válido (>= 1)")
      return
    }
    if (selectedEjercicios.length === 0) {
      setFormError("Agrega al menos un ejercicio")
      return
    }
    for (const asig of selectedEjercicios) {
      if (!asig.series || asig.series < 1) {
        setFormError(`Define las series para ${asig.nombre}`)
        return
      }
      if (asig.isometrico) {
        const mins = Number.parseInt(asig.tiempoMin || "0", 10) || 0
        const secs = Number.parseInt(asig.tiempoSec || "0", 10) || 0
        const total = mins * 60 + secs
        if (total <= 0) {
          setFormError(`Define el tiempo para ${asig.nombre} (isométrico)`)
          return
        }
      } else {
        if (!asig.repeticiones || asig.repeticiones < 1) {
          setFormError(`Define las repeticiones para ${asig.nombre}`)
          return
        }
      }
    }

    const jugador = jugadores.find((j) => j.id === selectedJugadorId)
    if (!jugador) {
      setFormError("Jugador inválido")
      return
    }

    const ejerciciosPayload = selectedEjercicios.map((e) => {
      const payload: AsignacionEjercicio = {
        ejercicioId: e.ejercicioId,
        nombre: e.nombre,
        series: Number.parseInt(String(e.series), 10),
        isometrico: e.isometrico,
      }
      if (e.isometrico) {
        const mins = Number.parseInt(e.tiempoMin || "0", 10) || 0
        const secs = Number.parseInt(e.tiempoSec || "0", 10) || 0
        payload.tiempoSegundos = mins * 60 + secs
      } else {
        payload.repeticiones = Number.parseInt(String(e.repeticiones || 0), 10)
      }
      return payload
    })

    const docData = {
      jugadorId: jugador.id,
      jugadorNombre: jugador.nombreVisualizacion || `${jugador.nombre} ${jugador.apellido}`,
      objetivo: objetivo.trim(),
      frecuenciaSemanal: freq,
      circulacion: circ,
      totalEjercicios: ejerciciosPayload.length,
      ejercicios: ejerciciosPayload,
      clienteId,
      creadoPorEmail: user.email || "",
      fechaCreacion: new Date(),
    }

    try {
      setSaveLoading(true)
      const ref = await addDoc(collection(db, "sesion-individual"), docData)
      // After save
      setSesiones((prev) => [
        { id: ref.id, ...docData } as SesionIndividual,
        ...prev,
      ])
      resetForm()
      setCreating(false)
    } catch (e: any) {
      setFormError(e?.message || "Error guardando sesión individualizada")
    } finally {
      setSaveLoading(false)
    }
  }

  const eliminarSesion = async (ses: SesionIndividual) => {
    if (!confirm("¿Eliminar esta sesión individualizada?")) return
    try {
      await deleteDoc(doc(db, "sesion-individual", ses.id))
      setSesiones((prev) => prev.filter((s) => s.id !== ses.id))
      alert("Sesión eliminada")
    } catch (e) {
      alert("Error al eliminar la sesión")
    }
  }

  if (loading || loadingCliente) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center text-gray-600">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Cargando módulo de sesión individualizada...
        </div>
      </div>
    )
  }

  if (!user) return null

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

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sesiones Individualizadas</h1>
              <p className="text-gray-600 mt-2">
                Crea y gestiona sesiones personalizadas por jugador
              </p>
            </div>
            {!creating && (
              <Button onClick={() => setCreating(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Sesión Individualizada
              </Button>
            )}
          </div>
        </div>

        {/* Creation Form */}
        {creating && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Nueva Sesión Individualizada</CardTitle>
              <CardDescription>
                Define el jugador, objetivo, la frecuencia y agrega ejercicios de gimnasio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Jugador */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 space-y-2">
                  <Label htmlFor="jugador">Elegir Jugador</Label>
                  <div className="relative">
                    <Input
                      placeholder="Buscar jugador..."
                      value={searchJugador}
                      onChange={(e) => setSearchJugador(e.target.value)}
                      className="pl-9"
                    />
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                  <select
                    id="jugador"
                    value={selectedJugadorId}
                    onChange={(e) => setSelectedJugadorId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Selecciona un jugador</option>
                    {jugadoresFiltrados.map((j) => (
                      <option key={j.id} value={j.id}>
                        {(j.nombreVisualizacion || `${j.nombre} ${j.apellido}`)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Frecuencia y Circulación */}
                <div className="space-y-2">
                  <Label htmlFor="frecuencia">Frecuencia semanal</Label>
                  <Input
                    id="frecuencia"
                    type="number"
                    min={1}
                    max={14}
                    value={frecuenciaSemanal}
                    onChange={(e) => setFrecuenciaSemanal(e.target.value)}
                    placeholder="3"
                  />
                  <p className="text-xs text-gray-500">Veces por semana</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="circulacion">Circulación</Label>
                  <Input
                    id="circulacion"
                    type="number"
                    min={1}
                    max={20}
                    value={circulacion}
                    onChange={(e) => setCirculacion(e.target.value)}
                    placeholder="1"
                  />
                  <p className="text-xs text-gray-500">Número de circuitos/series globales</p>
                </div>
              </div>

              {/* Objetivo */}
              <div className="space-y-2">
                <Label htmlFor="objetivo">Objetivo</Label>
                <Textarea
                  id="objetivo"
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  placeholder="Describe el objetivo de la sesión (p. ej., fuerza isométrica de core, trabajo unilateral, etc.)"
                  rows={3}
                />
              </div>

              {/* Buscar y agregar ejercicios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Dumbbell className="h-5 w-5 text-purple-600 mr-2" />
                      <h3 className="font-semibold">Elegir ejercicios de gimnasio</h3>
                    </div>
                  </div>
                  <div className="relative mb-3">
                    <Input
                      placeholder="Buscar ejercicio por nombre, clasificación o grupo muscular..."
                      value={searchEjercicio}
                      onChange={(e) => setSearchEjercicio(e.target.value)}
                      className="pl-9"
                    />
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>

                  <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
                    {ejerciciosFiltrados.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">No hay ejercicios</div>
                    ) : (
                      ejerciciosFiltrados.map((e) => (
                        <div key={e.id} className="p-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{e.nombre}</p>
                            <div className="flex gap-2 mt-1">
                              {e.clasificacion && (
                                <Badge variant="secondary">{e.clasificacion}</Badge>
                              )}
                              {(e.gruposMusculares || []).slice(0, 2).map((g, idx) => (
                                <Badge key={idx} variant="outline" className="text-blue-700 border-blue-200">
                                  {g}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addEjercicio(e)}
                            disabled={selectedEjercicios.some((s) => s.ejercicioId === e.id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Agregar
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Ejercicios seleccionados con parámetros */}
                <div>
                  <h3 className="font-semibold mb-2">Ejercicios seleccionados</h3>
                  {selectedEjercicios.length === 0 ? (
                    <Card>
                      <CardContent className="py-6 text-sm text-gray-600">
                        Aún no has agregado ejercicios.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {selectedEjercicios.map((e) => (
                        <Card key={e.ejercicioId}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-base">{e.nombre}</CardTitle>
                                <CardDescription>Configura series y repeticiones/tiempo</CardDescription>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEjercicio(e.ejercicioId)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                aria-label={`Quitar ${e.nombre}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`series-${e.ejercicioId}`}>Series</Label>
                              <Input
                                id={`series-${e.ejercicioId}`}
                                type="number"
                                min={1}
                                max={20}
                                value={e.series}
                                onChange={(ev) =>
                                  updateAsignacion(e.ejercicioId, { series: Number.parseInt(ev.target.value || "0", 10) || 0 })
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <Switch
                                  checked={e.isometrico}
                                  onCheckedChange={(checked) =>
                                    updateAsignacion(e.ejercicioId, {
                                      isometrico: !!checked,
                                      // Reset opposing fields
                                      repeticiones: checked ? undefined : (e.repeticiones || 10),
                                      tiempoMin: checked ? (e.tiempoMin || "") : "",
                                      tiempoSec: checked ? (e.tiempoSec || "") : "",
                                      tiempoSegundos: checked ? undefined : undefined,
                                    })
                                  }
                                />
                                Isométrico
                              </Label>

                              {!e.isometrico ? (
                                <div className="space-y-2">
                                  <Label htmlFor={`reps-${e.ejercicioId}`}>Repeticiones</Label>
                                  <Input
                                    id={`reps-${e.ejercicioId}`}
                                    type="number"
                                    min={1}
                                    max={200}
                                    value={e.repeticiones || ""}
                                    onChange={(ev) =>
                                      updateAsignacion(e.ejercicioId, {
                                        repeticiones: Number.parseInt(ev.target.value || "0", 10) || 0,
                                      })
                                    }
                                  />
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Label htmlFor={`time-${e.ejercicioId}`}>Tiempo (min:seg)</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      id={`time-min-${e.ejercicioId}`}
                                      type="number"
                                      placeholder="min"
                                      min={0}
                                      max={60}
                                      value={e.tiempoMin || ""}
                                      onChange={(ev) =>
                                        updateAsignacion(e.ejercicioId, { tiempoMin: ev.target.value.replace("-", "") })
                                      }
                                    />
                                    <Input
                                      id={`time-sec-${e.ejercicioId}`}
                                      type="number"
                                      placeholder="seg"
                                      min={0}
                                      max={59}
                                      value={e.tiempoSec || ""}
                                      onChange={(ev) => {
                                        const val = ev.target.value.replace("-", "")
                                        const num = Number.parseInt(val || "0", 10)
                                        const clamped = Number.isFinite(num) ? Math.min(59, Math.max(0, num)) : 0
                                        updateAsignacion(e.ejercicioId, { tiempoSec: String(clamped) })
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm()
                    setCreating(false)
                  }}
                  disabled={saveLoading}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saveLoading}>
                  {saveLoading ? (
                    <span className="inline-flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Guardando...
                    </span>
                  ) : (
                    <span className="inline-flex items-center">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Guardar Sesión
                    </span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error general de carga */}
        {error && (
          <div className="mb-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Lista de sesiones */}
        {loadingSesiones ? (
          <div className="flex items-center justify-center py-12 text-gray-600">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Cargando sesiones...
          </div>
        ) : sesiones.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <ListChecks className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay sesiones individualizadas</h3>
              <p className="text-gray-600 mb-6">Crea tu primera sesión individual para un jugador.</p>
              {!creating && (
                <Button onClick={() => setCreating(true)} className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Sesión
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sesiones.map((s) => (
              <Card key={s.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <UserCircle2 className="h-5 w-5 text-emerald-600" />
                        {s.jugadorNombre}
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">{s.objetivo}</CardDescription>
                    </div>
                    <Badge variant="secondary">{s.totalEjercicios} ej.</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {(s.fechaCreacion?.toDate?.() as Date)?.toLocaleDateString?.() || "—"}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-700">
                    <div className="flex items-center gap-1">
                      Frecuencia:
                      <span className="font-medium ml-1">{s.frecuenciaSemanal}x/sem</span>
                    </div>
                    <div>
                      Circulación: <span className="font-medium">{s.circulacion}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    {/* Edición futura
                    <Button variant="outline" size="sm" onClick={() => router.push(`/staff/entrenamientos/planificar-sesion/individualizada/editar/${s.id}`)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => eliminarSesion(s)}
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
