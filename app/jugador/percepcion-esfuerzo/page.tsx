"use client"

import type React from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { collection, addDoc, getDocs, query, where, orderBy, limit, updateDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebaseConfig"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Activity, CheckCircle, Calendar, Edit3, Save, X } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

interface PercepcionEsfuerzo {
  id?: string
  jugadorId: string
  jugadorEmail: string
  clienteId: string
  fecha: string
  nivelEsfuerzo: number
  comentarios: string
  fechaCreacion: Date
  uid: string
}

const escalaRPE = [
  { valor: 1, label: "Sin esfuerzo", descripcion: "No siento ningún esfuerzo" },
  { valor: 2, label: "Esfuerzo muy ligero", descripcion: "Apenas perceptible" },
  { valor: 3, label: "Esfuerzo ligero", descripcion: "Fácil, puedo mantener conversación" },
  { valor: 4, label: "Esfuerzo moderado", descripcion: "Un poco difícil pero cómodo" },
  { valor: 5, label: "Esfuerzo intenso", descripcion: "Difícil, respiración pesada" },
  { valor: 6, label: "Esfuerzo muy intenso", descripcion: "Muy difícil, casi sin aliento" },
  { valor: 7, label: "Esfuerzo extremo", descripcion: "Extremadamente difícil" },
  { valor: 8, label: "Esfuerzo muy extremo", descripcion: "Muy, muy difícil" },
  { valor: 9, label: "Esfuerzo casi máximo", descripcion: "Casi imposible continuar" },
  { valor: 10, label: "Esfuerzo máximo", descripcion: "Máximo esfuerzo posible" },
]

// Función para obtener la fecha actual formateada en español
const getFechaActual = () => {
  const fecha = new Date()
  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]

  const diaSemana = diasSemana[fecha.getDay()]
  const dia = fecha.getDate()
  const mes = meses[fecha.getMonth()]
  const año = fecha.getFullYear()

  return `${diaSemana} ${dia} de ${mes} de ${año}`
}

// Función para obtener la fecha en formato YYYY-MM-DD
const getFechaISO = () => {
  return new Date().toISOString().split("T")[0]
}

// Función para verificar si ya se completó el registro hoy
const yaCompletoHoy = (ultimoRegistro: PercepcionEsfuerzo | null) => {
  if (!ultimoRegistro) return false
  const fechaHoy = getFechaISO()
  return ultimoRegistro.fecha === fechaHoy
}

export default function PercepcionEsfuerzoPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [jugadorData, setJugadorData] = useState<any>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [ultimoRegistro, setUltimoRegistro] = useState<PercepcionEsfuerzo | null>(null)
  const [yaCompletadoHoy, setYaCompletadoHoy] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [originalFormData, setOriginalFormData] = useState<any>(null)

  // Estado del formulario - inicializado sin valores por defecto
  const [formData, setFormData] = useState({
    nivelEsfuerzo: null as number | null,
    comentarios: "",
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadJugadorData()
    }
  }, [user])

  // Efecto para reiniciar el formulario a medianoche
  useEffect(() => {
    const resetFormAtMidnight = () => {
      setFormData({
        nivelEsfuerzo: null,
        comentarios: "",
      })
      setYaCompletadoHoy(false)
      setUltimoRegistro(null)
      setSuccess(false)
      setError("")
      setIsEditing(false)
      setOriginalFormData(null)
    }

    const scheduleNextReset = () => {
      const now = new Date()
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0) // Next midnight

      const timeUntilMidnight = midnight.getTime() - now.getTime()

      return setTimeout(() => {
        resetFormAtMidnight()

        // Schedule daily resets
        const dailyInterval = setInterval(resetFormAtMidnight, 24 * 60 * 60 * 1000)

        // Store interval ID for cleanup
        return () => clearInterval(dailyInterval)
      }, timeUntilMidnight)
    }

    const timeoutId = scheduleNextReset()

    return () => clearTimeout(timeoutId)
  }, [])

  // Efecto para guardar el estado del formulario en localStorage
  useEffect(() => {
    if (jugadorData?.id && yaCompletadoHoy) {
      const formStateKey = `rpe-form-${jugadorData.id}-${getFechaISO()}`
      localStorage.setItem(
        formStateKey,
        JSON.stringify({
          formData,
          completedToday: yaCompletadoHoy,
          timestamp: new Date().toISOString(),
        }),
      )
    }
  }, [formData, yaCompletadoHoy, jugadorData])

  // Efecto para recuperar el estado del formulario desde localStorage al cargar
  useEffect(() => {
    if (jugadorData?.id && !loadingData) {
      const formStateKey = `rpe-form-${jugadorData.id}-${getFechaISO()}`
      const savedState = localStorage.getItem(formStateKey)

      if (savedState) {
        try {
          const { formData: savedFormData, completedToday, timestamp } = JSON.parse(savedState)
          const savedDate = new Date(timestamp).toDateString()
          const today = new Date().toDateString()

          // Solo restaurar si es del mismo día
          if (savedDate === today && completedToday) {
            setFormData(savedFormData)
            setYaCompletadoHoy(true)
            console.log("✅ Estado del formulario RPE restaurado desde localStorage")
          }
        } catch (error) {
          console.log("⚠️ Error restaurando estado del formulario RPE:", error)
        }
      }
    }
  }, [jugadorData, loadingData])

  const loadJugadorData = async () => {
    try {
      setLoadingData(true)
      console.log("🔄 Cargando datos del jugador:", user?.email)

      // Verificar que el usuario esté autenticado
      if (!auth.currentUser) {
        throw new Error("Usuario no autenticado")
      }

      const currentUserId = auth.currentUser.uid
      console.log("🔐 UID del usuario actual:", currentUserId)

      // Buscar jugador en Firestore por email
      try {
        const jugadoresRef = collection(db, "jugadores")
        const jugadorQuery = query(jugadoresRef, where("email", "==", user?.email))
        const jugadorSnapshot = await getDocs(jugadorQuery)

        if (!jugadorSnapshot.empty) {
          const jugadorInfo = { id: jugadorSnapshot.docs[0].id, ...jugadorSnapshot.docs[0].data() }
          setJugadorData(jugadorInfo)
          console.log("✅ Jugador encontrado:", jugadorInfo)

          // Cargar registro usando el ID del jugador encontrado
          await loadUltimoRegistro(jugadorInfo.id)
        } else {
          console.log("⚠️ Jugador no encontrado en Firestore, usando UID como ID")
          // Usar el UID como ID del jugador
          const tempJugador = {
            id: currentUserId,
            email: user?.email,
            clienteId: "temp_client",
            nombre: user?.displayName?.split(" ")[0] || "Jugador",
            apellido: user?.displayName?.split(" ")[1] || "Temporal",
          }
          setJugadorData(tempJugador)
          console.log("✅ Jugador temporal creado con UID:", tempJugador)

          // Cargar registro usando el UID
          await loadUltimoRegistro(currentUserId)
        }
      } catch (error: any) {
        console.error("❌ Error cargando jugador:", error)
        setError("Error cargando datos del jugador: " + error.message)
      }
    } finally {
      setLoadingData(false)
    }
  }

  const loadUltimoRegistro = async (jugadorId: string) => {
    try {
      console.log("🔄 Cargando último registro RPE para jugador:", jugadorId)
      const percepcionRef = collection(db, "percepcion-esfuerzo")

      // Primero buscar si existe un registro para hoy específicamente
      const fechaHoy = getFechaISO()
      const registroHoyQuery = query(percepcionRef, where("jugadorId", "==", jugadorId), where("fecha", "==", fechaHoy))

      const snapshotHoy = await getDocs(registroHoyQuery)

      if (!snapshotHoy.empty) {
        // Existe un registro para hoy - sincronizar respuestas
        const registroHoy = { id: snapshotHoy.docs[0].id, ...snapshotHoy.docs[0].data() } as PercepcionEsfuerzo
        setUltimoRegistro(registroHoy)
        setYaCompletadoHoy(true)

        // Sincronizar las respuestas en el formulario
        const formDataFromDB = {
          nivelEsfuerzo: registroHoy.nivelEsfuerzo,
          comentarios: registroHoy.comentarios || "",
        }

        setFormData(formDataFromDB)
        setOriginalFormData({ ...formDataFromDB }) // Guardar copia original para cancelar edición

        console.log("✅ Registro RPE de hoy encontrado y sincronizado:", registroHoy)
        return
      }

      // Si no existe registro para hoy, buscar el más reciente para mostrar historial
      const ultimoQuery = query(
        percepcionRef,
        where("jugadorId", "==", jugadorId),
        orderBy("fechaCreacion", "desc"),
        limit(1),
      )
      const snapshot = await getDocs(ultimoQuery)

      if (!snapshot.empty) {
        const ultimo = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as PercepcionEsfuerzo
        setUltimoRegistro(ultimo)

        // Verificar si es de hoy (por si acaso)
        const completadoHoy = ultimo.fecha === fechaHoy
        setYaCompletadoHoy(completadoHoy)

        if (completadoHoy) {
          // Sincronizar respuestas si es de hoy
          const formDataFromDB = {
            nivelEsfuerzo: ultimo.nivelEsfuerzo,
            comentarios: ultimo.comentarios || "",
          }

          setFormData(formDataFromDB)
          setOriginalFormData({ ...formDataFromDB })
        }

        console.log("✅ Último registro RPE encontrado:", ultimo)
        console.log("📅 Es de hoy:", completadoHoy)
      } else {
        console.log("ℹ️ No se encontraron registros RPE previos")
        setYaCompletadoHoy(false)
      }
    } catch (error: any) {
      console.log("⚠️ Error cargando registro RPE:", error)

      // Fallback: buscar en localStorage
      try {
        const fechaHoy = getFechaISO()
        const formStateKey = `rpe-form-${jugadorId}-${fechaHoy}`
        const savedState = localStorage.getItem(formStateKey)

        if (savedState) {
          const { formData: savedFormData, completedToday } = JSON.parse(savedState)
          const savedDate = new Date().toDateString()
          const today = new Date().toDateString()

          if (savedDate === today && completedToday) {
            setFormData(savedFormData)
            setOriginalFormData({ ...savedFormData })
            setYaCompletadoHoy(true)
            console.log("✅ Estado RPE sincronizado desde localStorage")
          }
        }
      } catch (localError) {
        console.log("⚠️ Error en fallback localStorage RPE:", localError)
      }
    }
  }

  const validarFormulario = () => {
    if (formData.nivelEsfuerzo === null) {
      setError("Por favor, selecciona tu nivel de esfuerzo percibido")
      return false
    }
    return true
  }

  const handleEdit = () => {
    setIsEditing(true)
    setError("")
  }

  const handleCancelEdit = () => {
    if (originalFormData) {
      setFormData({ ...originalFormData })
    }
    setIsEditing(false)
    setError("")
  }

  const handleSaveEdit = async () => {
    if (!jugadorData || !ultimoRegistro) return

    // Validar formulario
    if (!validarFormulario()) {
      return
    }

    setSubmitting(true)
    setError("")

    try {
      console.log("🔄 Guardando cambios del registro RPE...")

      // Verificar que el usuario esté autenticado
      if (!auth.currentUser) {
        throw new Error("Usuario no autenticado")
      }

      const fechaHoy = getFechaISO()
      const registroActualizado: Partial<PercepcionEsfuerzo> = {
        nivelEsfuerzo: formData.nivelEsfuerzo!,
        comentarios: formData.comentarios,
      }

      console.log("📝 Actualizaciones RPE a guardar:", registroActualizado)

      try {
        const percepcionRef = collection(db, "percepcion-esfuerzo")

        // Buscar documento existente para hoy
        const existingQuery = query(
          percepcionRef,
          where("jugadorId", "==", jugadorData.id),
          where("fecha", "==", fechaHoy),
        )
        const existingSnapshot = await getDocs(existingQuery)

        if (!existingSnapshot.empty) {
          // Actualizar documento existente
          const existingDoc = existingSnapshot.docs[0]
          await updateDoc(existingDoc.ref, registroActualizado)
          console.log("✅ Registro RPE actualizado exitosamente:", existingDoc.id)

          // Actualizar estado local
          const updatedRegistro = { ...ultimoRegistro, ...registroActualizado }
          setUltimoRegistro(updatedRegistro)
          setOriginalFormData({ ...formData }) // Actualizar la copia original

          setIsEditing(false)
          setError("")

          // Mostrar mensaje de éxito temporal
          const tempAlert = document.createElement("div")
          tempAlert.className =
            "fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50"
          tempAlert.innerHTML = `
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
              </svg>
              Cambios guardados exitosamente
            </div>
          `
          document.body.appendChild(tempAlert)

          setTimeout(() => {
            if (document.body.contains(tempAlert)) {
              document.body.removeChild(tempAlert)
            }
          }, 3000)
        } else {
          setError("No se encontró el registro para actualizar")
        }
      } catch (firestoreError: any) {
        console.error("❌ Error actualizando RPE en Firestore:", firestoreError)

        if (firestoreError.code === "permission-denied") {
          setError("Error de permisos: No tienes autorización para actualizar este registro.")
        } else {
          setError("Error actualizando: " + firestoreError.message)
        }

        // Fallback a localStorage
        console.log("🔄 Actualizando RPE en localStorage como fallback...")
        try {
          const savedRegistros = localStorage.getItem("percepcion-esfuerzo-" + jugadorData.id) || "[]"
          const registros = JSON.parse(savedRegistros)

          // Buscar y actualizar
          const existingIndex = registros.findIndex((r: any) => r.fecha === fechaHoy)
          if (existingIndex >= 0) {
            registros[existingIndex] = { ...registros[existingIndex], ...registroActualizado }
            localStorage.setItem("percepcion-esfuerzo-" + jugadorData.id, JSON.stringify(registros))
            console.log("✅ RPE actualizado en localStorage")

            setIsEditing(false)
            setOriginalFormData({ ...formData })
          }
        } catch (localStorageError: any) {
          console.error("❌ Error actualizando RPE en localStorage:", localStorageError)
          setError("Error guardando cambios")
        }
      }
    } catch (error: any) {
      console.error("❌ Error general RPE:", error)
      setError("Error general al guardar cambios: " + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jugadorData) return

    // Si está editando, usar la función de guardar edición
    if (isEditing) {
      await handleSaveEdit()
      return
    }

    // Validar formulario
    if (!validarFormulario()) {
      return
    }

    setSubmitting(true)
    setError("")

    try {
      console.log("🔄 Iniciando guardado del registro RPE...")

      // Verificar que el usuario esté autenticado
      if (!auth.currentUser) {
        throw new Error("Usuario no autenticado")
      }

      const fechaHoy = getFechaISO()
      const registro: PercepcionEsfuerzo = {
        jugadorId: jugadorData.id,
        jugadorEmail: user?.email || "",
        clienteId: jugadorData.clienteId || "temp_client",
        fecha: fechaHoy,
        nivelEsfuerzo: formData.nivelEsfuerzo!,
        comentarios: formData.comentarios,
        fechaCreacion: new Date(),
        uid: auth.currentUser.uid,
      }

      console.log("📝 Registro RPE a guardar:", registro)

      try {
        console.log("🔄 Verificando si existe registro RPE para hoy...")
        const percepcionRef = collection(db, "percepcion-esfuerzo")

        // Buscar documento existente para hoy
        const existingQuery = query(
          percepcionRef,
          where("jugadorId", "==", jugadorData.id),
          where("fecha", "==", fechaHoy),
        )
        const existingSnapshot = await getDocs(existingQuery)

        let docRef

        if (!existingSnapshot.empty) {
          // Actualizar documento existente
          const existingDoc = existingSnapshot.docs[0]
          await updateDoc(existingDoc.ref, registro)
          docRef = existingDoc.ref
          console.log("✅ Registro RPE actualizado en documento existente:", existingDoc.id)
        } else {
          // Crear nuevo documento
          docRef = await addDoc(percepcionRef, registro)
          console.log("✅ Nuevo registro RPE creado:", docRef.id)
        }

        // Actualizar el estado local
        setUltimoRegistro({ ...registro, id: docRef.id })
        setOriginalFormData({ ...formData }) // Guardar copia original
        setYaCompletadoHoy(true)

        setSuccess(true)
        setTimeout(() => {
          router.push("/jugador")
        }, 2000)
      } catch (firestoreError: any) {
        console.error("❌ Error guardando RPE en Firestore:", firestoreError)

        if (firestoreError.code === "permission-denied") {
          setError("Error de permisos: Verifica que estés autenticado correctamente.")
        } else {
          setError("Error de Firestore: " + firestoreError.message)
        }

        // Fallback a localStorage
        console.log("🔄 Guardando RPE en localStorage como fallback...")
        try {
          const savedRegistros = localStorage.getItem("percepcion-esfuerzo-" + jugadorData.id) || "[]"
          const registros = JSON.parse(savedRegistros)

          // Buscar y actualizar o agregar
          const existingIndex = registros.findIndex((r: any) => r.fecha === fechaHoy)
          const registroConId = { ...registro, id: Date.now().toString() }

          if (existingIndex >= 0) {
            registros[existingIndex] = registroConId
          } else {
            registros.push(registroConId)
          }

          localStorage.setItem("percepcion-esfuerzo-" + jugadorData.id, JSON.stringify(registros))
          console.log("✅ RPE guardado en localStorage")

          setUltimoRegistro(registroConId)
          setOriginalFormData({ ...formData })
          setYaCompletadoHoy(true)
          setSuccess(true)

          setTimeout(() => {
            router.push("/jugador")
          }, 2000)
        } catch (localStorageError: any) {
          console.error("❌ Error guardando RPE en localStorage:", localStorageError)
          setError("Error guardando datos")
        }
      }
    } catch (error: any) {
      console.error("❌ Error general RPE:", error)
      setError("Error general al guardar el registro: " + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando formulario...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Registro Completado!</h2>
            <p className="text-gray-600 mb-4">
              Gracias por registrar tu percepción del esfuerzo. Esta información ayudará a monitorear tu carga de
              entrenamiento.
            </p>
            <p className="text-sm text-gray-500">
              Completado a las {new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-sm text-gray-500 mt-2">Redirigiendo al panel principal...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Button variant="ghost" onClick={() => router.push("/jugador")} className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Percepción del Esfuerzo</h1>
              <p className="text-gray-600 mt-1">
                {yaCompletadoHoy
                  ? isEditing
                    ? "Editando tu registro de hoy - Modifica tu nivel de esfuerzo"
                    : "Registro completado - Revisa tu percepción de esfuerzo de hoy"
                  : "Registra tu nivel de esfuerzo percibido (RPE)"}
              </p>
            </div>
            {yaCompletadoHoy && !isEditing && (
              <Button onClick={handleEdit} variant="outline" className="ml-4 bg-transparent">
                <Edit3 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Fecha actual */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div
          className={`border rounded-lg p-4 mb-6 ${
            yaCompletadoHoy
              ? isEditing
                ? "bg-orange-50 border-orange-200"
                : "bg-green-50 border-green-200"
              : "bg-orange-50 border-orange-200"
          }`}
        >
          <div className="flex items-center">
            <Calendar
              className={`w-5 h-5 mr-2 ${
                yaCompletadoHoy ? (isEditing ? "text-orange-600" : "text-green-600") : "text-orange-600"
              }`}
            />
            <span
              className={`font-medium text-lg ${
                yaCompletadoHoy ? (isEditing ? "text-orange-800" : "text-green-800") : "text-orange-800"
              }`}
            >
              {getFechaActual()}
            </span>
            {yaCompletadoHoy && !isEditing && <CheckCircle className="w-5 h-5 ml-2 text-green-600" />}
            {isEditing && <Edit3 className="w-5 h-5 ml-2 text-orange-600" />}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {yaCompletadoHoy && !isEditing && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>¡Registro completado hoy!</strong> Esta es la percepción de esfuerzo que registraste. Puedes
              editarla si necesitas hacer algún cambio.
            </AlertDescription>
          </Alert>
        )}

        {isEditing && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <Edit3 className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Modo de edición activado.</strong> Modifica tu nivel de esfuerzo y comentarios, luego guarda los
              cambios o cancela para mantener el registro original.
            </AlertDescription>
          </Alert>
        )}

        {ultimoRegistro && !yaCompletadoHoy && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <Activity className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Último registro:</strong> {new Date(ultimoRegistro.fechaCreacion).toLocaleDateString("es-ES")} -
              RPE: {ultimoRegistro.nivelEsfuerzo}/10
            </AlertDescription>
          </Alert>
        )}

        {/* Debug info */}
        {process.env.NODE_ENV === "development" && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-800">
              <strong>Debug RPE:</strong> Usuario: {user?.email}, Autenticado: {auth.currentUser ? "Sí" : "No"}, UID:{" "}
              {auth.currentUser?.uid}, Completado hoy: {yaCompletadoHoy ? "Sí" : "No"}, Editando:{" "}
              {isEditing ? "Sí" : "No"}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Escala RPE */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Activity className="w-5 h-5 mr-2 text-orange-600" />
                Nivel de Esfuerzo Percibido (RPE)
                {yaCompletadoHoy && !isEditing && (
                  <span className="ml-2 text-sm text-green-600 font-normal">(Completado hoy)</span>
                )}
                {isEditing && <span className="ml-2 text-sm text-orange-600 font-normal">(Editando)</span>}
              </CardTitle>
              <p className="text-sm text-gray-600">
                {yaCompletadoHoy && !isEditing
                  ? `Registraste un nivel de esfuerzo de ${formData.nivelEsfuerzo}/10`
                  : "Selecciona del 1 al 10 qué tan intenso fue tu esfuerzo durante la actividad"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {escalaRPE.map((opcion) => (
                  <button
                    key={opcion.valor}
                    type="button"
                    onClick={() =>
                      (yaCompletadoHoy && !isEditing) || setFormData({ ...formData, nivelEsfuerzo: opcion.valor })
                    }
                    disabled={yaCompletadoHoy && !isEditing}
                    className={`p-4 rounded-lg border-2 transition-all text-center ${
                      formData.nivelEsfuerzo === opcion.valor
                        ? yaCompletadoHoy && !isEditing
                          ? "border-green-500 bg-green-50 text-green-700"
                          : isEditing
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-orange-500 bg-orange-50 text-orange-700"
                        : yaCompletadoHoy && !isEditing
                          ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                          : "border-gray-200 hover:border-gray-300 text-gray-700 cursor-pointer"
                    }`}
                  >
                    <div className="font-bold text-2xl mb-1">{opcion.valor}</div>
                    <div className="text-sm font-medium mb-1">{opcion.label}</div>
                    <div className="text-xs text-gray-500">{opcion.descripcion}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Comentarios sobre molestias */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                ¿Finalizaste con alguna molestia?
                {yaCompletadoHoy && !isEditing && (
                  <span className="ml-2 text-sm text-green-600 font-normal">(Completado hoy)</span>
                )}
                {isEditing && <span className="ml-2 text-sm text-orange-600 font-normal">(Editando)</span>}
              </CardTitle>
              <p className="text-sm text-gray-600">
                {yaCompletadoHoy && !isEditing
                  ? formData.comentarios || "No se registraron comentarios adicionales"
                  : "Describe si tienes alguna molestia específica después de la actividad"}
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.comentarios}
                onChange={(e) =>
                  (yaCompletadoHoy && !isEditing) || setFormData({ ...formData, comentarios: e.target.value })
                }
                placeholder={
                  yaCompletadoHoy && !isEditing
                    ? "No se registraron comentarios adicionales"
                    : "Ej: Siento una leve molestia en la rodilla derecha, me duele un poco la espalda, no tengo ninguna molestia..."
                }
                rows={4}
                className="w-full resize-none"
                disabled={yaCompletadoHoy && !isEditing}
              />
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex gap-4 pt-6">
            <Button type="button" variant="outline" onClick={() => router.push("/jugador")} className="flex-1">
              Volver al Panel
            </Button>

            {isEditing && (
              <Button type="button" variant="outline" onClick={handleCancelEdit} className="flex-1 bg-transparent">
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            )}

            {!yaCompletadoHoy && (
              <Button type="submit" disabled={submitting} className="flex-1 bg-orange-600 hover:bg-orange-700">
                {submitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </div>
                ) : (
                  "Registrar Esfuerzo"
                )}
              </Button>
            )}

            {isEditing && (
              <Button type="submit" disabled={submitting} className="flex-1 bg-orange-600 hover:bg-orange-700">
                {submitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </div>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
