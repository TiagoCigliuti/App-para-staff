"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Dumbbell, Loader2, Plus, Trash2 } from 'lucide-react'
import { collection, addDoc, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"

type Circulacion = "series" | "circuito"
type TipoCarga = "repeticiones" | "tiempo"

interface EjercicioGimnasio {
  id: string
  nombre: string
  clasificacion?: string
}

interface EjercicioAsignado {
  ejercicioId: string
  nombre: string
  series: number
  tipoCarga: TipoCarga
  repeticiones?: string
  tiempoSegundos?: number
}

interface BloqueTrabajo {
  objetivo: string
  circulacion: Circulacion
  ejercicios: EjercicioAsignado[]
}

function deepClean<T>(val: T): T {
  if (Array.isArray(val)) {
    return val.map((v) => deepClean(v)).filter((v) => v !== undefined) as unknown as T
  }
  if (val && typeof val === "object") {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(val as Record<string, any>)) {
      if (v === undefined) continue
      const cleaned = deepClean(v as any)
      if (cleaned !== undefined) out[k] = cleaned
    }
    return out as T
  }
  return val
}

export default function CrearSesionGimnasioPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [clienteId, setClienteId] = useState("")
  const [fecha, setFecha] = useState("")
  const [hora, setHora] = useState("")
  const [nroMicrociclo, setNroMicrociclo] = useState("")
  const [nroSesion, setNroSesion] = useState("")
  const [ejerciciosDisponibles, setEjerciciosDisponibles] = useState<EjercicioGimnasio[]>([])
  const [bloques, setBloques] = useState<BloqueTrabajo[]>([
    { objetivo: "", circulacion: "series", ejercicios: [] },
  ])
  const [saving, setSaving] = useState(false)
  const [cargandoEjercicios, setCargandoEjercicios] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  // Obtener clienteId
  useEffect(() => {
    const obtenerClienteId = async () => {
      if (!user) return
      try {
        const staffRef = collection(db, "staff")
        const qStaff = query(staffRef, where("email", "==", user.email))
        const snap = await getDocs(qStaff)
        if (!snap.empty) {
          setClienteId(snap.docs[0].data().clienteId)
        } else {
          const fallback = user.email?.split("@")[0] || user.uid
          setClienteId(fallback)
        }
      } catch {
        const fallback = user?.email?.split("@")[0] || user?.uid || ""
        setClienteId(fallback)
      }
    }
    obtenerClienteId()
  }, [user])

  // Cargar ejercicios de la colección "gimnasio"
  useEffect(() => {
    const loadEjercicios = async () => {
      if (!clienteId) return
      setCargandoEjercicios(true)
      try {
        const ref = collection(db, "gimnasio")
        const qG = query(ref, where("clienteId", "==", clienteId))
        const snap = await getDocs(qG)
        const list: EjercicioGimnasio[] = []
        snap.forEach((d) => list.push({ id: d.id, nombre: (d.data() as any).nombre, clasificacion: (d.data() as any).clasificacion }))
        // Ordenar por nombre
        list.sort((a, b) => a.nombre.localeCompare(b.nombre))
        setEjerciciosDisponibles(list)
      } finally {
        setCargandoEjercicios(false)
      }
    }
    loadEjercicios()
  }, [clienteId])

  const addBloque = () => setBloques((prev) => [...prev, { objetivo: "", circulacion: "series", ejercicios: [] }])
  const removeBloque = (idx: number) => setBloques((prev) => prev.filter((_, i) => i !== idx))

  // Form temporal por bloque para agregar un ejercicio
  const [formEjercicio, setFormEjercicio] = useState<Record<
    number,
    { ejercicioId: string; series: string; tipoCarga: TipoCarga; repeticiones: string; tiempoSegundos: string }
  >>({})

  const handleAgregarEjercicio = (bloqueIdx: number) => {
    const form = formEjercicio[bloqueIdx]
    if (!form || !form.ejercicioId || !form.series || (!form.repeticiones && !form.tiempoSegundos)) {
      alert("Completa los datos del ejercicio a agregar")
      return
    }
    const ej = ejerciciosDisponibles.find((e) => e.id === form.ejercicioId)
    if (!ej) return
    const nuevo: EjercicioAsignado = {
      ejercicioId: ej.id,
      nombre: ej.nombre,
      series: parseInt(form.series, 10),
      tipoCarga: form.tipoCarga,
      repeticiones: form.tipoCarga === "repeticiones" ? form.repeticiones : undefined,
      tiempoSegundos: form.tipoCarga === "tiempo" ? parseInt(form.tiempoSegundos || "0", 10) : undefined,
    }
    setBloques((prev) =>
      prev.map((b, i) => (i === bloqueIdx ? { ...b, ejercicios: [...b.ejercicios, nuevo] } : b)),
    )
    setFormEjercicio((prev) => ({ ...prev, [bloqueIdx]: { ejercicioId: "", series: "", tipoCarga: "repeticiones", repeticiones: "", tiempoSegundos: "" } }))
  }

  const removeEjercicio = (bloqueIdx: number, ejercicioIdx: number) => {
    setBloques((prev) =>
      prev.map((b, i) => (i === bloqueIdx ? { ...b, ejercicios: b.ejercicios.filter((_, j) => j !== ejercicioIdx) } : b)),
    )
  }

  const totalEjercicios = useMemo(() => bloques.reduce((acc, b) => acc + b.ejercicios.length, 0), [bloques])

  const syncSesionWithCalendar = async (data: any) => {
    try {
      const actividadesRef = collection(db, `calendario/${clienteId}/actividades`)
      const tituloParts = [`🏋️ Sesión Gimnasio ${data.nroSesion}`]
      if (data.nroMicrociclo) tituloParts.push(`(Microciclo ${data.nroMicrociclo})`)
      if (data.totalEjercicios) tituloParts.push(`- ${data.totalEjercicios} ejercicios`)
      const actividad = {
        titulo: tituloParts.join(" "),
        hora: data.hora,
        fecha: data.fecha,
        clienteId,
        creadoPor: user?.email || "",
        fechaCreacion: new Date(),
      }
      await addDoc(actividadesRef, actividad)
      console.log("Calendario sincronizado con sesión de gimnasio")
    } catch (e) {
      console.warn("No se pudo sincronizar con calendario, usando localStorage fallback", e)
      try {
        const key = `calendario_${clienteId}`
        const raw = localStorage.getItem(key) || "{}"
        const parsed = JSON.parse(raw)
        const title = `${data.hora} - 🏋️ Sesión Gimnasio ${data.nroSesion} (Microciclo ${data.nroMicrociclo}) - ${data.totalEjercicios} ejercicios`
        parsed[data.fecha] = [...(parsed[data.fecha] || []), title]
        localStorage.setItem(key, JSON.stringify(parsed))
      } catch (e2) {
        console.error("Error en fallback de calendario:", e2)
      }
    }
  }

  const guardarSesion = async () => {
    if (!fecha || !hora || !nroMicrociclo || !nroSesion) {
      alert("Completa Fecha, Hora, Microciclo y Sesión")
      return
    }
    if (!clienteId) {
      alert("No se pudo resolver el clienteId del usuario. Intenta recargar e iniciar sesión nuevamente.")
      return
    }
    if (bloques.length === 0 || totalEjercicios === 0) {
      alert("Agrega al menos un bloque y un ejercicio")
      return
    }
    setSaving(true)
    try {
      const dataRaw = {
        fecha,
        hora,
        nroMicrociclo: parseInt(nroMicrociclo, 10),
        nroSesion: parseInt(nroSesion, 10),
        bloques, // puede contener campos opcionales undefined
        totalEjercicios,
        clienteId,
        creadoPorEmail: user?.email || null,
        fechaCreacion: new Date(),
      }
      // Eliminar undefined en todo el árbol antes de guardar
      const data = deepClean(dataRaw)

      await addDoc(collection(db, "sesion-gimnasio"), data)
      await syncSesionWithCalendar(data)
      alert("Sesión de gimnasio creada y sincronizada con el calendario")
      router.push("/staff/entrenamientos/planificar-sesion/gimnasio")
    } catch (e) {
      console.error(e)
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
  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push("/staff/entrenamientos/planificar-sesion/gimnasio")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Sesiones de Gimnasio
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Dumbbell className="h-8 w-8 text-purple-600" />
              Nueva Sesión de Gimnasio
            </h1>
            <p className="text-gray-600 mt-2">Planifica bloques de trabajo con ejercicios de gimnasio</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Datos generales */}
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>Campos obligatorios de la sesión</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha">Fecha *</Label>
                  <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="hora">Hora *</Label>
                  <Input id="hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="micro">Microciclo *</Label>
                  <Input id="micro" type="number" value={nroMicrociclo} onChange={(e) => setNroMicrociclo(e.target.value)} placeholder="Ej: 1" />
                </div>
                <div>
                  <Label htmlFor="sesion">Sesión *</Label>
                  <Input id="sesion" type="number" value={nroSesion} onChange={(e) => setNroSesion(e.target.value)} placeholder="Ej: 1" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bloques de trabajo */}
          {bloques.map((bloque, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Bloque {idx + 1}</CardTitle>
                    <CardDescription>Define objetivo, circulación y ejercicios</CardDescription>
                  </div>
                  {bloques.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeBloque(idx)} className="text-red-600 hover:text-red-800 hover:bg-red-50">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar bloque
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Objetivo del bloque *</Label>
                  <Input
                    placeholder="Ej: Fuerza máxima tren superior"
                    value={bloque.objetivo}
                    onChange={(e) =>
                      setBloques((prev) => prev.map((b, i) => (i === idx ? { ...b, objetivo: e.target.value } : b)))
                    }
                  />
                </div>
                <div>
                  <Label>Circulación *</Label>
                  <Select
                    value={bloque.circulacion}
                    onValueChange={(v: Circulacion) =>
                      setBloques((prev) => prev.map((b, i) => (i === idx ? { ...b, circulacion: v } : b)))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona circulación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="series">Series</SelectItem>
                      <SelectItem value="circuito">Circuito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Lista ejercicios agregados */}
                {bloque.ejercicios.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-700">Ejercicios en este bloque ({bloque.ejercicios.length})</Label>
                    {bloque.ejercicios.map((ejer, j) => (
                      <div key={j} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{ejer.nombre}</div>
                          <div className="text-gray-600">
                            {ejer.series} series ·{" "}
                            {ejer.tipoCarga === "repeticiones" ? `${ejer.repeticiones || ""} reps` : `${ejer.tiempoSegundos || 0} s`}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeEjercicio(idx, j)} className="text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Agregar ejercicio */}
                <div className="space-y-3 border-t pt-4">
                  <Label className="text-sm">Agregar ejercicio</Label>
                  {cargandoEjercicios ? (
                    <div className="flex items-center text-sm text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Cargando ejercicios...
                    </div>
                  ) : ejerciciosDisponibles.length === 0 ? (
                    <div className="text-sm text-gray-600">
                      No hay ejercicios en la colección "gimnasio". Crea algunos en Gestión de Tareas &gt; Gimnasio.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <Select
                            value={formEjercicio[idx]?.ejercicioId || ""}
                            onValueChange={(val) =>
                              setFormEjercicio((prev) => ({
                                ...prev,
                                [idx]: {
                                  ejercicioId: val,
                                  series: prev[idx]?.series || "",
                                  tipoCarga: prev[idx]?.tipoCarga || "repeticiones",
                                  repeticiones: prev[idx]?.repeticiones || "",
                                  tiempoSegundos: prev[idx]?.tiempoSegundos || "",
                                },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona ejercicio" />
                            </SelectTrigger>
                            <SelectContent>
                              {ejerciciosDisponibles.map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                  {e.nombre} {e.clasificacion ? `· ${e.clasificacion}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Input
                            placeholder="Series"
                            type="number"
                            value={formEjercicio[idx]?.series || ""}
                            onChange={(e) =>
                              setFormEjercicio((prev) => ({
                                ...prev,
                                [idx]: {
                                  ...prev[idx],
                                  series: e.target.value,
                                  ejercicioId: prev[idx]?.ejercicioId || "",
                                  tipoCarga: prev[idx]?.tipoCarga || "repeticiones",
                                  repeticiones: prev[idx]?.repeticiones || "",
                                  tiempoSegundos: prev[idx]?.tiempoSegundos || "",
                                },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Select
                            value={formEjercicio[idx]?.tipoCarga || "repeticiones"}
                            onValueChange={(v: TipoCarga) =>
                              setFormEjercicio((prev) => ({
                                ...prev,
                                [idx]: {
                                  ...prev[idx],
                                  tipoCarga: v,
                                  ejercicioId: prev[idx]?.ejercicioId || "",
                                  series: prev[idx]?.series || "",
                                },
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Tipo de carga" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="repeticiones">Repeticiones</SelectItem>
                              <SelectItem value="tiempo">Tiempo (s)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Campo dependiente */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {formEjercicio[idx]?.tipoCarga === "tiempo" ? (
                          <div>
                            <Input
                              placeholder="Tiempo (segundos)"
                              type="number"
                              value={formEjercicio[idx]?.tiempoSegundos || ""}
                              onChange={(e) =>
                                setFormEjercicio((prev) => ({
                                  ...prev,
                                  [idx]: { ...prev[idx], tiempoSegundos: e.target.value },
                                }))
                              }
                            />
                          </div>
                        ) : (
                          <div>
                            <Input
                              placeholder="Repeticiones (ej: 12 o 10-12)"
                              value={formEjercicio[idx]?.repeticiones || ""}
                              onChange={(e) =>
                                setFormEjercicio((prev) => ({
                                  ...prev,
                                  [idx]: { ...prev[idx], repeticiones: e.target.value },
                                }))
                              }
                            />
                          </div>
                        )}
                        <div className="flex">
                          <Button type="button" onClick={() => handleAgregarEjercicio(idx)} className="ml-auto">
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar al bloque
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex items-center">
            <Button type="button" variant="outline" onClick={addBloque} className="mr-3">
              <Plus className="h-4 w-4 mr-2" />
              Agregar bloque
            </Button>
            <span className="text-sm text-gray-600">Total de ejercicios: {totalEjercicios}</span>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.push("/staff/entrenamientos/planificar-sesion/gimnasio")}>
              Cancelar
            </Button>
            <Button onClick={guardarSesion} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
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
