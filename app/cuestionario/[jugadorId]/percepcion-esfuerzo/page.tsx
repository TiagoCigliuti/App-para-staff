"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"
import { collection, addDoc, getDocs, query, where, updateDoc, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Activity, CheckCircle, Edit3, Save, X } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { getCuestionarioUserClienteId } from "@/lib/cuestionario-utils"

type Jugador = {
  id: string
  email?: string
  clienteId?: string
  nombre?: string
  apellido?: string
  displayName?: string
  uid?: string
  estado?: string
}

const escalaRPE = [
  { valor: 1, label: "Sin esfuerzo", descripcion: "No siento ningún esfuerzo" },
  { valor: 2, label: "Muy ligero", descripcion: "Apenas perceptible" },
  { valor: 3, label: "Ligero", descripcion: "Fácil, puedo conversar" },
  { valor: 4, label: "Moderado", descripcion: "Un poco difícil" },
  { valor: 5, label: "Intenso", descripcion: "Difícil, respiración pesada" },
  { valor: 6, label: "Muy intenso", descripcion: "Muy difícil" },
  { valor: 7, label: "Extremo", descripcion: "Extremadamente difícil" },
  { valor: 8, label: "Muy extremo", descripcion: "Muy, muy difícil" },
  { valor: 9, label: "Casi máximo", descripcion: "Casi imposible" },
  { valor: 10, label: "Máximo", descripcion: "Máximo esfuerzo" },
]

function localDateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
function localTimeHMS(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}
const zonaHoraria = Intl.DateTimeFormat().resolvedOptions().timeZone

export default function RPEAsPage() {
  const params = useParams<{ jugadorId: string }>()
  const router = useRouter()
  const { user, loading } = useAuth()

  const [jugador, setJugador] = useState<Jugador | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string>("")
  const [ultimo, setUltimo] = useState<any | null>(null)
  const [yaHoy, setYaHoy] = useState(false)
  const [originalForm, setOriginalForm] = useState<any | null>(null)

  const [form, setForm] = useState({
    nivelEsfuerzo: null as number | null,
    comentarios: "",
  })

  useEffect(() => {
    async function init() {
      if (!user) return
      setError("")
      const { clienteId: userClienteId, rol } = await getCuestionarioUserClienteId({ uid: user.uid, email: user.email })
      if (!userClienteId || rol !== "cuestionario") {
        setError("No tienes permisos para operar cuestionarios.")
        return
      }
      const ref = doc(collection(db, "jugadores"), params.jugadorId)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        setError("Jugador no encontrado.")
        return
      }
      const data = snap.data() as any
      const j: Jugador = {
        id: snap.id,
        email: data.email,
        clienteId: data.clienteId,
        nombre: data.nombre,
        apellido: data.apellido,
        displayName: data.displayName,
        uid: data.uid,
        estado: data.estado || (data.activo ? "activo" : "inactivo"),
      }
      if (!j.clienteId || j.clienteId !== userClienteId) {
        setError("El jugador no pertenece a tu cliente.")
        return
      }
      if ((j.estado || "").toLowerCase() !== "activo") {
        setError("El jugador no está activo.")
        return
      }
      setJugador(j)

      const rpeRef = collection(db, "percepcion-esfuerzo")
      const hoy = localDateKey()
      const qHoy = query(rpeRef, where("jugadorId", "==", j.id), where("fecha", "==", hoy))
      const snapHoy = await getDocs(qHoy)
      if (!snapHoy.empty) {
        const docHoy = { id: snapHoy.docs[0].id, ...snapHoy.docs[0].data() }
        setUltimo(docHoy)
        setYaHoy(true)
        const fd = {
          nivelEsfuerzo: docHoy.nivelEsfuerzo,
          comentarios: docHoy.comentarios || "",
        }
        setForm(fd)
        setOriginalForm(fd)
      } else {
        setYaHoy(false)
      }
    }
    if (!loading && user) void init()
  }, [user, loading, params.jugadorId])

  const validar = () => {
    if (form.nivelEsfuerzo == null) return "Selecciona tu nivel de esfuerzo percibido"
    return ""
  }

  const onSave = async () => {
    if (!jugador) return
    const msg = validar()
    if (msg) {
      setError(msg)
      return
    }
    setSubmitting(true)
    setError("")
    const ahora = new Date()
    const fLocal = localDateKey(ahora)
    const rpe = {
      jugadorId: jugador.id,
      jugadorEmail: jugador.email || "",
      clienteId: jugador.clienteId || "",
      fecha: fLocal, // fecha local YYYY-MM-DD
      fechaLocal: fLocal,
      horaLocal: localTimeHMS(ahora), // HH:mm:ss local
      zonaHoraria,
      nivelEsfuerzo: form.nivelEsfuerzo!,
      comentarios: form.comentarios || "",
      fechaCreacion: ahora,
      uid: jugador.uid || jugador.id,
    }
    try {
      const rpeRef = collection(db, "percepcion-esfuerzo")
      const qHoy = query(rpeRef, where("jugadorId", "==", jugador.id), where("fecha", "==", rpe.fecha))
      const snapHoy = await getDocs(qHoy)
      if (!snapHoy.empty) {
        const existing = snapHoy.docs[0]
        await updateDoc(existing.ref, rpe)
      } else {
        await addDoc(rpeRef, rpe)
      }
      setSuccess(true)
      setTimeout(() => {
        router.push("/cuestionario")
      }, 1500)
    } catch (e: any) {
      setError(e?.message || "Error guardando datos")
    } finally {
      setSubmitting(false)
    }
  }

  const onSaveEdit = async () => {
    await onSave()
    setIsEditing(false)
  }

  if (loading || !jugador) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" />
      </main>
    )
  }

  if (success) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <CheckCircle className="w-14 h-14 text-orange-600 mx-auto mb-3" />
            <h2 className="text-xl font-semibold">¡Registro guardado!</h2>
            <p className="text-sm text-muted-foreground">Redirigiendo…</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh]">
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <Button variant="ghost" onClick={() => router.push("/cuestionario")} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">
              Percepción del esfuerzo de {jugador.nombre || jugador.displayName || "Jugador"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {yaHoy
                ? isEditing
                  ? "Editando registro de hoy"
                  : "Registro completado hoy"
                : "Completa el registro de hoy"}
            </p>
          </div>
          {yaHoy && !isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline" className="ml-4 bg-transparent">
              <Edit3 className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {yaHoy && !isEditing && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Ya registraste la percepción de esfuerzo de hoy. Puedes editarla si lo necesitas.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Activity className="w-5 h-5 mr-2 text-orange-600" />
              Nivel de Esfuerzo Percibido (RPE)
              {yaHoy && !isEditing && <span className="ml-2 text-sm text-green-600 font-normal">(Completado hoy)</span>}
              {isEditing && <span className="ml-2 text-sm text-orange-600 font-normal">(Editando)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {escalaRPE.map((op) => (
                <button
                  key={op.valor}
                  type="button"
                  onClick={() => (yaHoy && !isEditing) || setForm((p) => ({ ...p, nivelEsfuerzo: op.valor }))}
                  disabled={yaHoy && !isEditing}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    form.nivelEsfuerzo === op.valor
                      ? yaHoy && !isEditing
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-orange-500 bg-orange-50 text-orange-700"
                      : yaHoy && !isEditing
                        ? "border-muted bg-muted/40 text-muted-foreground cursor-not-allowed"
                        : "border-border hover:border-foreground/30 text-foreground cursor-pointer"
                  }`}
                >
                  <div className="font-bold text-2xl mb-1">{op.valor}</div>
                  <div className="text-sm font-medium mb-1">{op.label}</div>
                  <div className="text-xs text-muted-foreground">{op.descripcion}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">¿Finalizaste con alguna molestia?</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.comentarios}
              onChange={(e) => (yaHoy && !isEditing) || setForm((p) => ({ ...p, comentarios: e.target.value }))}
              placeholder="Describe si tienes alguna molestia después de la actividad"
              rows={4}
              className="w-full resize-none"
              disabled={yaHoy && !isEditing}
            />
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-4 pt-6">
          <Button type="button" variant="outline" onClick={() => router.push("/cuestionario")} className="flex-1">
            Volver
          </Button>
          {!yaHoy && (
            <Button onClick={onSave} disabled={submitting} className="flex-1 bg-orange-600 hover:bg-orange-700">
              {submitting ? "Guardando..." : "Registrar Esfuerzo"}
            </Button>
          )}
          {yaHoy && isEditing && (
            <>
              <Button onClick={onSaveEdit} disabled={submitting} className="flex-1 bg-orange-600 hover:bg-orange-700">
                {submitting ? (
                  "Guardando..."
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Guardar Cambios
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (originalForm) setForm(originalForm)
                  setIsEditing(false)
                }}
                className="flex-1 bg-transparent"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
