"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Dumbbell, Loader2, Plus, Trash2 } from 'lucide-react'
import { collection, doc, getDoc, getDocs, query, updateDoc, where, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"

type Circulacion = "series" | "circuito"
type TipoCarga = "repeticiones" | "tiempo"

interface EjercicioGimnasio { id: string; nombre: string; clasificacion?: string }
interface EjercicioAsignado { ejercicioId: string; nombre: string; series: number; tipoCarga: TipoCarga; repeticiones?: string; tiempoSegundos?: number }
interface BloqueTrabajo { objetivo: string; circulacion: Circulacion; ejercicios: EjercicioAsignado[] }
interface SesionGimnasioDoc {
  fecha: string
  hora: string
  nroMicrociclo: number
  nroSesion: number
  bloques: BloqueTrabajo[]
  totalEjercicios: number
  clienteId: string
  creadoPorEmail: string
  fechaCreacion: any
}

export default function EditarSesionGimnasioPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const sesionId = params.id as string

  const [clienteId, setClienteId] = useState("")
  const [fecha, setFecha] = useState("")
  const [hora, setHora] = useState("")
  const [nroMicrociclo, setNroMicrociclo] = useState("")
  const [nroSesion, setNroSesion] = useState("")
  const [ejerciciosDisponibles, setEjerciciosDisponibles] = useState<EjercicioGimnasio[]>([])
  const [bloques, setBloques] = useState<BloqueTrabajo[]>([])
  const [loadingSesion, setLoadingSesion] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sesionOriginal, setSesionOriginal] = useState<SesionGimnasioDoc | null>(null)

  useEffect(() => { if (!loading && !user) router.push("/login") }, [user, loading, router])

  // clienteId
  useEffect(() => {
    const fetchClienteId = async () => {
      if (!user) return
      try {
        const staffRef = collection(db, "staff")
        const qStaff = query(staffRef, where("email", "==", user.email))
        const snap = await getDocs(qStaff)
        if (!snap.empty) setClienteId(snap.docs[0].data().clienteId)
        else setClienteId(user.email?.split("@")[0] || user.uid)
      } catch {
        setClienteId(user?.email?.split("@")[0] || user?.uid || "")
      }
    }
    fetchClienteId()
  }, [user])

  // Cargar ejercicios
  useEffect(() => {
    const loadEj = async () => {
      if (!clienteId) return
      const ref = collection(db, "gimnasio")
      const qG = query(ref, where("clienteId", "==", clienteId))
      const snap = await getDocs(qG)
      const list: EjercicioGimnasio[] = []
      snap.forEach((d) => list.push({ id: d.id, nombre: (d.data() as any).nombre, clasificacion: (d.data() as any).clasificacion }))
      setEjerciciosDisponibles(list.sort((a, b) => a.nombre.localeCompare(b.nombre)))
    }
    loadEj()
  }, [clienteId])

  // Cargar sesión
  useEffect(() => {
    const loadSesion = async () => {
      if (!sesionId) return
      setLoadingSesion(true)
      try {
        const ref = doc(db, "sesion-gimnasio", sesionId)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          alert("Sesión no encontrada")
          router.push("/staff/entrenamientos/planificar-sesion/gimnasio")
          return
        }
        const data = snap.data() as SesionGimnasioDoc
        setSesionOriginal(data)
        setFecha(data.fecha)
        setHora(data.hora)
        setNroMicrociclo(String(data.nroMicrociclo))
        setNroSesion(String(data.nroSesion))
        setBloques(data.bloques || [])
      } catch (e) {
        console.error("Error cargando sesión:", e)
        alert("Error al cargar la sesión")
        router.push("/staff/entrenamientos/planificar-sesion/gimnasio")
      } finally {
        setLoadingSesion(false)
      }
    }
    loadSesion()
  }, [sesionId, router])

  const addBloque = () => setBloques((p) => [...p, { objetivo: "", circulacion: "series", ejercicios: [] }])
  const removeBloque = (idx: number) => setBloques((p) => p.filter((_, i) => i !== idx))

  const [formEjercicio, setFormEjercicio] = useState<Record<number, { ejercicioId: string; series: string; tipoCarga: TipoCarga; repeticiones: string; tiempoSegundos: string }>>({})

  const addEjercicio = (bloqueIdx: number) => {
    const f = formEjercicio[bloqueIdx]
    if (!f || !f.ejercicioId || !f.series || (!f.repeticiones && !f.tiempoSegundos)) {
      alert("Completa los datos del ejercicio")
      return
    }
    const ej = ejerciciosDisponibles.find((e) => e.id === f.ejercicioId)
    if (!ej) return
    const nuevo: EjercicioAsignado = {
      ejercicioId: ej.id,
      nombre: ej.nombre,
      series: parseInt(f.series),
      tipoCarga: f.tipoCarga,
      repeticiones: f.tipoCarga === "repeticiones" ? f.repeticiones : undefined,
      tiempoSegundos: f.tipoCarga === "tiempo" ? parseInt(f.tiempoSegundos) : undefined,
    }
    setBloques((prev) => prev.map((b, i) => (i === bloqueIdx ? { ...b, ejercicios: [...b.ejercicios, nuevo] } : b)))
    setFormEjercicio((prev) => ({ ...prev, [bloqueIdx]: { ejercicioId: "", series: "", tipoCarga: "repeticiones", repeticiones: "", tiempoSegundos: "" } }))
  }

  const removeEjercicio = (bloqueIdx: number, ejercicioIdx: number) =>
    setBloques((prev) => prev.map((b, i) => (i === bloqueIdx ? { ...b, ejercicios: b.ejercicios.filter((_, j) => j !== ejercicioIdx) } : b)))

  const totalEjercicios = useMemo(() => bloques.reduce((acc, b) => acc + b.ejercicios.length, 0), [bloques])

  const syncCalendarUpdate = async (updated: { fecha: string; hora: string; nroMicrociclo: number; nroSesion: number; totalEjercicios: number }) => {
    if (!clienteId || !sesionOriginal) return
    try {
      // borrar anterior
      const actividadesRef = collection(db, `calendario/${clienteId}/actividades`)
      const actividadesQ = query(actividadesRef, where("fecha", "==", sesionOriginal.fecha))
      const actSnap = await getDocs(actividadesQ)
      const prev = actSnap.docs.find((d) => {
        const data = d.data()
        return typeof data.titulo === "string" && data.titulo.includes("Sesión Gimnasio") && data.titulo.includes(`${sesionOriginal.nroSesion}`)
      })
      if (prev) await deleteDoc(doc(db, `calendario/${clienteId}/actividades`, prev.id))

      // crear nueva
      const titulo = `🏋️ Sesión Gimnasio ${updated.nroSesion} (Microciclo ${updated.nroMicrociclo}) - ${updated.totalEjercicios} ejercicios`
      await addDoc(actividadesRef, {
        titulo,
        hora: updated.hora,
        fecha: updated.fecha,
        clienteId,
        creadoPor: user?.email || "",
        fechaCreacion: new Date(),
      } as any)
    } catch (e) {
      console.warn("No se pudo sincronizar calendario:", e)
    }
  }

  const actualizarSesion = async () => {
    if (!fecha || !hora || !nroMicrociclo || !nroSesion) {
      alert("Completa Fecha, Hora, Microciclo y Sesión")
      return
    }
    if (bloques.length === 0 || totalEjercicios === 0) {
      alert("Agrega al menos un bloque y un ejercicio")
      return
    }
    setSaving(true)
    try {
      const data = {
        fecha,
        hora,
        nroMicrociclo: parseInt(nroMicrociclo),
        nroSesion: parseInt(nroSesion),
        bloques,
        totalEjercicios,
        clienteId,
        fechaModificacion: new Date(),
      }
      await updateDoc(doc(db, "sesion-gimnasio", sesionId), data as any)
      await syncCalendarUpdate({
        fecha: data.fecha,
        hora: data.hora,
        nroMicrociclo: data.nroMicrociclo,
        nroSesion: data.nroSesion,
        totalEjercicios: data.totalEjercicios,
      })
      alert("Sesión actualizada")
      router.push("/staff/entrenamientos/planificar-sesion/gimnasio")
    } catch (e) {
      console.error(e)
      alert("Error al actualizar la sesión")
    } finally {
      setSaving(false)
    }
  }

  if (loading || loadingSesion) {
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
              Editar Sesión de Gimnasio
            </h1>
            <p className="text-gray-600 mt-2">Modifica bloques y ejercicios</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Datos generales */}
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>Campos obligatorios</CardDescription>
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
                  <Input id="micro" type="number" value={nroMicrociclo} onChange={(e) => setNroMicrociclo(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="sesion">Sesión *</Label>
                  <Input id="sesion" type="number" value={nroSesion} onChange={(e) => setNroSesion(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bloques */}
          {bloques.map((bloque, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Bloque {idx + 1}</CardTitle>
                    <CardDescription>Objetivo, circulación y ejercicios</CardDescription>
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
                  <Label>Objetivo *</Label>
                  <Input
                    value={bloque.objetivo}
                    onChange={(e) => setBloques((p) => p.map((b, i) => (i === idx ? { ...b, objetivo: e.target.value } : b)))}
                  />
                </div>
                <div>
                  <Label>Circulación *</Label>
                  <Select
                    value={bloque.circulacion}
                    onValueChange={(v: Circulacion) => setBloques((p) => p.map((b, i) => (i === idx ? { ...b, circulacion: v } : b)))}
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

                {bloque.ejercicios.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Ejercicios ({bloque.ejercicios.length})</Label>
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
                            [idx]: { ...prev[idx], series: e.target.value, ejercicioId: prev[idx]?.ejercicioId || "", tipoCarga: prev[idx]?.tipoCarga || "repeticiones" },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Select
                        value={formEjercicio[idx]?.tipoCarga || "repeticiones"}
                        onValueChange={(v: TipoCarga) =>
                          setFormEjercicio((prev) => ({ ...prev, [idx]: { ...prev[idx], tipoCarga: v } }))
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {formEjercicio[idx]?.tipoCarga === "tiempo" ? (
                      <Input
                        placeholder="Tiempo (segundos)"
                        type="number"
                        value={formEjercicio[idx]?.tiempoSegundos || ""}
                        onChange={(e) => setFormEjercicio((prev) => ({ ...prev, [idx]: { ...prev[idx], tiempoSegundos: e.target.value } }))}
                      />
                    ) : (
                      <Input
                        placeholder="Repeticiones (ej: 12 o 10-12)"
                        value={formEjercicio[idx]?.repeticiones || ""}
                        onChange={(e) => setFormEjercicio((prev) => ({ ...prev, [idx]: { ...prev[idx], repeticiones: e.target.value } }))}
                      />
                    )}
                    <div className="flex">
                      <Button type="button" onClick={() => addEjercicio(idx)} className="ml-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar al bloque
                      </Button>
                    </div>
                  </div>
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
            <Button variant="outline" onClick={() => router.push("/staff/entrenamientos/planificar-sesion/gimnasio")}>Cancelar</Button>
            <Button onClick={actualizarSesion} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Actualizando...</>) : "Actualizar Sesión"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
