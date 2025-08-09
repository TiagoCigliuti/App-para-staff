"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"
import { collection, addDoc, getDocs, query, where, updateDoc, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Heart, Moon, Brain, Zap, CheckCircle, Calendar, Edit3, Save, X } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
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

const escalas = {
  estadoAnimo: [
    { valor: 1, label: "Muy bueno", descripcion: "Me siento muy bien anímicamente" },
    { valor: 2, label: "Bueno", descripcion: "Me siento bien anímicamente" },
    { valor: 3, label: "Regular", descripcion: "Me siento regular anímicamente" },
    { valor: 4, label: "Malo", descripcion: "Me siento mal anímicamente" },
    { valor: 5, label: "Muy malo", descripcion: "Me siento muy mal anímicamente" },
  ],
  horasSueno: [
    { valor: 1, label: "Más de 10hs", descripcion: "Dormí más de 10 horas" },
    { valor: 2, label: "Entre 8 y 10hs", descripcion: "Dormí entre 8 y 10 horas" },
    { valor: 3, label: "Entre 7 y 8hs", descripcion: "Dormí entre 7 y 8 horas" },
    { valor: 4, label: "Entre 5 y 7hs", descripcion: "Dormí entre 5 y 7 horas" },
    { valor: 5, label: "Menos de 5hs", descripcion: "Dormí menos de 5 horas" },
  ],
  calidadSueno: [
    { valor: 1, label: "Muy buena", descripcion: "Dormí muy bien, excelente descanso" },
    { valor: 2, label: "Buena", descripcion: "Dormí bien, buen descanso" },
    { valor: 3, label: "Regular", descripcion: "Dormí regular" },
    { valor: 4, label: "Mala", descripcion: "Dormí mal, poco descanso" },
    { valor: 5, label: "Muy mala", descripcion: "Dormí muy mal, no descansé" },
  ],
  nivelRecuperacion: [
    { valor: 1, label: "Totalmente recuperado", descripcion: "Me siento completamente recuperado" },
    { valor: 2, label: "Parcialmente recuperado", descripcion: "Me siento bastante recuperado" },
    { valor: 3, label: "Regular", descripcion: "Me siento medianamente recuperado" },
    { valor: 4, label: "Algo cansado", descripcion: "Me siento algo cansado" },
    { valor: 5, label: "Muy cansado", descripcion: "Me siento muy cansado" },
  ],
  dolorMuscular: [
    { valor: 1, label: "Sin dolor", descripcion: "No tengo ningún dolor" },
    { valor: 2, label: "Muy poco dolor", descripcion: "Tengo muy poco dolor" },
    { valor: 3, label: "Algo dolorido", descripcion: "Tengo algo de dolor" },
    { valor: 4, label: "Dolorido", descripcion: "Tengo bastante dolor" },
    { valor: 5, label: "Muy dolorido", descripcion: "Tengo mucho dolor" },
  ],
}

const zonasDolorMuscular = [
  "Espalda",
  "Glúteo izquierdo",
  "Glúteo derecho",
  "Cuádriceps izquierdo",
  "Cuádriceps derecho",
  "Isquiotibiales izquierdo",
  "Isquiotibiales derecho",
  "Aductor izquierdo",
  "Aductor derecho",
  "Rodilla izquierda",
  "Rodilla derecha",
  "Pantorrilla izquierda",
  "Pantorrilla derecha",
  "Tobillo izquierdo",
  "Tobillo derecho",
  "Pie izquierdo",
  "Pie derecho",
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

const fechaLarga = () => {
  const fecha = new Date()
  return fecha.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
}

export default function BienestarAsPage() {
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
    estadoAnimo: null as number | null,
    horasSueno: null as number | null,
    calidadSueno: null as number | null,
    nivelRecuperacion: null as number | null,
    dolorMuscular: null as number | null,
    tipoDolorMuscular: "general",
    zonaDolorMuscular: "",
    comentarios: "",
  })

  useEffect(() => {
    async function init() {
      if (!user) return
      setError("")
      // Check cuestionario role and same cliente
      const { clienteId: userClienteId, rol } = await getCuestionarioUserClienteId({ uid: user.uid, email: user.email })
      if (!userClienteId || rol !== "cuestionario") {
        setError("No tienes permisos para operar cuestionarios.")
        return
      }
      // Load jugador
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
      // Load today's record (by local date)
      const bienestarRef = collection(db, "bienestar")
      const f = localDateKey()
      const qHoy = query(bienestarRef, where("jugadorId", "==", j.id), where("fecha", "==", f))
      const snapHoy = await getDocs(qHoy)
      if (!snapHoy.empty) {
        const docHoy = { id: snapHoy.docs[0].id, ...snapHoy.docs[0].data() }
        setUltimo(docHoy)
        setYaHoy(true)
        const fd = {
          estadoAnimo: docHoy.estadoAnimo,
          horasSueno: docHoy.horasSueno,
          calidadSueno: docHoy.calidadSueno,
          nivelRecuperacion: docHoy.nivelRecuperacion,
          dolorMuscular: docHoy.dolorMuscular,
          tipoDolorMuscular: docHoy.tipoDolorMuscular || "general",
          zonaDolorMuscular: docHoy.zonaDolorMuscular || "",
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
    if (form.estadoAnimo == null) return "Selecciona tu estado de ánimo"
    if (form.horasSueno == null) return "Selecciona las horas de sueño"
    if (form.calidadSueno == null) return "Selecciona la calidad del sueño"
    if (form.nivelRecuperacion == null) return "Selecciona el nivel de recuperación"
    if (form.dolorMuscular == null) return "Selecciona el nivel de dolor muscular"
    if (form.dolorMuscular >= 3 && form.tipoDolorMuscular === "especifico" && !form.zonaDolorMuscular)
      return "Especifica la zona del dolor muscular"
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
    const cuestionario: any = {
      jugadorId: jugador.id,
      jugadorEmail: jugador.email || "",
      clienteId: jugador.clienteId || "",
      fecha: fLocal, // fecha local YYYY-MM-DD
      fechaLocal: fLocal,
      horaLocal: localTimeHMS(ahora), // HH:mm:ss local
      zonaHoraria, // IANA timezone
      estadoAnimo: form.estadoAnimo!,
      horasSueno: form.horasSueno!,
      calidadSueno: form.calidadSueno!,
      nivelRecuperacion: form.nivelRecuperacion!,
      dolorMuscular: form.dolorMuscular!,
      comentarios: form.comentarios || "",
      fechaCreacion: ahora, // Date object (will serialize to timestamp)
      uid: jugador.uid || jugador.id,
    }
    if (form.dolorMuscular! >= 3) {
      cuestionario.tipoDolorMuscular = form.tipoDolorMuscular
      if (form.tipoDolorMuscular === "especifico") {
        cuestionario.zonaDolorMuscular = form.zonaDolorMuscular
      }
    }
    try {
      const bienestarRef = collection(db, "bienestar")
      // Check today existing (by local date)
      const qHoy = query(bienestarRef, where("jugadorId", "==", jugador.id), where("fecha", "==", fLocal))
      const snapHoy = await getDocs(qHoy)
      if (!snapHoy.empty) {
        const existing = snapHoy.docs[0]
        await updateDoc(existing.ref, cuestionario)
      } else {
        await addDoc(bienestarRef, cuestionario)
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

  const ScaleSelector = ({
    value,
    onChange,
    options,
    icon: Icon,
    title,
    description,
    disabled = false,
  }: {
    value: number | null
    onChange: (v: number) => void
    options: typeof escalas.estadoAnimo
    icon: any
    title: string
    description: string
    disabled?: boolean
  }) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Icon className="w-5 h-5 mr-2 text-green-600" />
          {title}
          {disabled && !isEditing && <span className="ml-2 text-sm text-green-600 font-normal">(Completado hoy)</span>}
          {isEditing && <span className="ml-2 text-sm text-orange-600 font-normal">(Editando)</span>}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {options.map((option) => (
            <button
              key={option.valor}
              type="button"
              onClick={() => !disabled && onChange(option.valor)}
              disabled={disabled}
              className={`p-4 rounded-lg border-2 transition-all text-center ${
                value === option.valor
                  ? disabled
                    ? isEditing
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-green-500 bg-green-50 text-green-700"
                    : "border-green-500 bg-green-50 text-green-700"
                  : disabled
                    ? "border-muted bg-muted/40 text-muted-foreground cursor-not-allowed"
                    : "border-border hover:border-foreground/30 text-foreground cursor-pointer"
              }`}
            >
              <div className="font-semibold text-lg mb-1">{option.valor}</div>
              <div className="text-sm font-medium mb-1">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.descripcion}</div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )

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
            <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-3" />
            <h2 className="text-xl font-semibold">¡Cuestionario guardado!</h2>
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
            <h1 className="text-xl font-semibold">Bienestar de {jugador.nombre || jugador.displayName || "Jugador"}</h1>
            <p className="text-sm text-muted-foreground">
              {yaHoy
                ? isEditing
                  ? "Editando respuestas de hoy"
                  : "Cuestionario completado hoy"
                : "Completa el cuestionario de hoy"}
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
        <div
          className={`border rounded-lg p-4 mb-6 ${
            yaHoy ? (isEditing ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200") : "bg-muted"
          }`}
        >
          <div className="flex items-center">
            <Calendar className={`w-5 h-5 mr-2 ${yaHoy ? (isEditing ? "text-orange-600" : "text-green-600") : ""}`} />
            <span className={`font-medium text-lg`}>{fechaLarga()}</span>
            {yaHoy && !isEditing && <CheckCircle className="w-5 h-5 ml-2 text-green-600" />}
            {isEditing && <Edit3 className="w-5 h-5 ml-2 text-orange-600" />}
          </div>
        </div>

        {yaHoy && !isEditing && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Ya registraste el cuestionario de hoy. Puedes editarlo si lo necesitas.
            </AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            yaHoy && isEditing ? onSaveEdit() : onSave()
          }}
          className="space-y-6"
        >
          <ScaleSelector
            value={form.estadoAnimo}
            onChange={(v) => setForm((p) => ({ ...p, estadoAnimo: v }))}
            options={escalas.estadoAnimo}
            icon={Brain}
            title="Estado de Ánimo"
            description="¿Cómo te sientes anímicamente hoy?"
            disabled={yaHoy && !isEditing}
          />
          <ScaleSelector
            value={form.horasSueno}
            onChange={(v) => setForm((p) => ({ ...p, horasSueno: v }))}
            options={escalas.horasSueno}
            icon={Moon}
            title="Horas de Sueño"
            description="¿Cuántas horas dormiste anoche?"
            disabled={yaHoy && !isEditing}
          />
          <ScaleSelector
            value={form.calidadSueno}
            onChange={(v) => setForm((p) => ({ ...p, calidadSueno: v }))}
            options={escalas.calidadSueno}
            icon={Moon}
            title="Calidad del Sueño"
            description="¿Cómo fue la calidad de tu sueño anoche?"
            disabled={yaHoy && !isEditing}
          />
          <ScaleSelector
            value={form.nivelRecuperacion}
            onChange={(v) => setForm((p) => ({ ...p, nivelRecuperacion: v }))}
            options={escalas.nivelRecuperacion}
            icon={Zap}
            title="Nivel de Recuperación/Cansancio"
            description="¿Qué tan recuperado o cansado te sientes?"
            disabled={yaHoy && !isEditing}
          />
          <ScaleSelector
            value={form.dolorMuscular}
            onChange={(v) => setForm((p) => ({ ...p, dolorMuscular: v }))}
            options={escalas.dolorMuscular}
            icon={Heart}
            title="Dolor Muscular"
            description="¿Tienes algún dolor o molestia muscular?"
            disabled={yaHoy && !isEditing}
          />

          {form.dolorMuscular !== null && form.dolorMuscular >= 3 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">
                  Detalles del Dolor Muscular
                  {yaHoy && !isEditing && (
                    <span className="ml-2 text-sm text-green-600 font-normal">(Completado hoy)</span>
                  )}
                  {isEditing && <span className="ml-2 text-sm text-orange-600 font-normal">(Editando)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">Tipo de dolor muscular:</h3>
                  <RadioGroup
                    value={form.tipoDolorMuscular}
                    onValueChange={(value) =>
                      (yaHoy && !isEditing) || setForm((p) => ({ ...p, tipoDolorMuscular: value }))
                    }
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="general" id="general" disabled={yaHoy && !isEditing} />
                      <Label htmlFor="general" className={yaHoy && !isEditing ? "text-muted-foreground" : ""}>
                        General (todo el cuerpo)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="especifico" id="especifico" disabled={yaHoy && !isEditing} />
                      <Label htmlFor="especifico" className={yaHoy && !isEditing ? "text-muted-foreground" : ""}>
                        Específico (zona concreta)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {form.tipoDolorMuscular === "especifico" && (
                  <div>
                    <h3 className="text-sm font-medium mb-3">Zona del dolor:</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {zonasDolorMuscular.map((zona) => (
                        <div key={zona} className="flex items-center">
                          <input
                            type="radio"
                            id={`zona-${zona}`}
                            name="zonaDolorMuscular"
                            value={zona}
                            checked={form.zonaDolorMuscular === zona}
                            onChange={(e) =>
                              (yaHoy && !isEditing) || setForm((p) => ({ ...p, zonaDolorMuscular: e.target.value }))
                            }
                            className="mr-2"
                            disabled={yaHoy && !isEditing}
                          />
                          <Label
                            htmlFor={`zona-${zona}`}
                            className={`text-sm ${yaHoy && !isEditing ? "text-muted-foreground" : ""}`}
                          >
                            {zona}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comentarios Adicionales</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.comentarios}
                onChange={(e) => (yaHoy && !isEditing) || setForm((p) => ({ ...p, comentarios: e.target.value }))}
                placeholder="Notas adicionales…"
                rows={4}
                className="w-full resize-none"
                disabled={yaHoy && !isEditing}
              />
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 pt-6">
            <Button type="button" variant="outline" onClick={() => router.push("/cuestionario")} className="flex-1">
              Volver
            </Button>
            {!yaHoy && (
              <Button type="submit" disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700">
                {submitting ? "Guardando..." : "Completar Cuestionario"}
              </Button>
            )}
            {yaHoy && isEditing && (
              <Button type="submit" disabled={submitting} className="flex-1 bg-orange-600 hover:bg-orange-700">
                {submitting ? (
                  "Guardando..."
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Guardar Cambios
                  </>
                )}
              </Button>
            )}
            {yaHoy && isEditing && (
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
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
