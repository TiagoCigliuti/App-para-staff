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
import { ArrowLeft, Heart, Moon, Brain, Zap, CheckCircle, Calendar, Edit3, Save, X } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface CuestionarioBienestar {
  id?: string
  jugadorId: string
  jugadorEmail: string
  clienteId: string
  fecha: string
  estadoAnimo: number
  horasSueno: number
  calidadSueno: number
  nivelRecuperacion: number
  dolorMuscular: number
  tipoDolorMuscular?: string
  zonaDolorMuscular?: string
  comentarios: string
  fechaCreacion: Date
  uid?: string
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

// Zonas del cuerpo para el dolor muscular (enfocado en fútbol)
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

// Función para verificar si ya se completó el cuestionario hoy
const yaCompletoHoy = (ultimoCuestionario: CuestionarioBienestar | null) => {
  if (!ultimoCuestionario) return false

  const fechaHoy = getFechaISO()
  return ultimoCuestionario.fecha === fechaHoy
}

// Función para verificar si cambió el día y resetear si es necesario
const checkAndResetIfNewDay = (
  ultimoCuestionario: CuestionarioBienestar | null,
  setFormData: any,
  setYaCompletadoHoy: any,
) => {
  const fechaHoy = getFechaISO()
  const lastCompletionDate = ultimoCuestionario?.fecha

  // Si hay un cuestionario previo pero es de otro día, resetear
  if (lastCompletionDate && lastCompletionDate !== fechaHoy) {
    setFormData({
      estadoAnimo: null,
      horasSueno: null,
      calidadSueno: null,
      nivelRecuperacion: null,
      dolorMuscular: null,
      tipoDolorMuscular: "general",
      zonaDolorMuscular: "",
      comentarios: "",
    })
    setYaCompletadoHoy(false)
    return false // No completado hoy
  }

  return yaCompletoHoy(ultimoCuestionario)
}

export default function CuestionarioBienestarPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [jugadorData, setJugadorData] = useState<any>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [ultimoCuestionario, setUltimoCuestionario] = useState<CuestionarioBienestar | null>(null)
  const [yaCompletadoHoy, setYaCompletadoHoy] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [originalFormData, setOriginalFormData] = useState<any>(null)

  // Estado del formulario - inicializado sin valores por defecto
  const [formData, setFormData] = useState({
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
        estadoAnimo: null,
        horasSueno: null,
        calidadSueno: null,
        nivelRecuperacion: null,
        dolorMuscular: null,
        tipoDolorMuscular: "general",
        zonaDolorMuscular: "",
        comentarios: "",
      })
      setYaCompletadoHoy(false)
      setUltimoCuestionario(null)
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
      const formStateKey = `wellness-form-${jugadorData.id}-${getFechaISO()}`
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
      const formStateKey = `wellness-form-${jugadorData.id}-${getFechaISO()}`
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
            console.log("✅ Estado del formulario restaurado desde localStorage")
          }
        } catch (error) {
          console.log("⚠️ Error restaurando estado del formulario:", error)
        }
      }
    }
  }, [jugadorData, loadingData])

  const loadJugadorData = async () => {
    try {
      setLoadingData(true)
      console.log("🔄 Cargando datos del jugador:", user?.email)
      console.log("🔄 Usuario autenticado:", auth.currentUser)

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

          // Cargar cuestionario usando el ID del jugador encontrado
          await loadUltimoCuestionario(jugadorInfo.id)
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

          // Cargar cuestionario usando el UID
          await loadUltimoCuestionario(currentUserId)
        }
      } catch (error: any) {
        console.error("❌ Error cargando jugador:", error)
        setError("Error cargando datos del jugador: " + error.message)
      }
    } finally {
      setLoadingData(false)
    }
  }

  const loadUltimoCuestionario = async (jugadorId: string) => {
    try {
      console.log("🔄 Cargando último cuestionario para jugador:", jugadorId)
      const bienestarRef = collection(db, "bienestar")
      console.log("🔄 Referencia a colección bienestar:", bienestarRef)

      // Primero buscar si existe un cuestionario para hoy específicamente
      const fechaHoy = getFechaISO()
      const cuestionarioHoyQuery = query(
        bienestarRef,
        where("jugadorId", "==", jugadorId),
        where("fecha", "==", fechaHoy),
      )

      const snapshotHoy = await getDocs(cuestionarioHoyQuery)

      if (!snapshotHoy.empty) {
        // Existe un cuestionario para hoy - sincronizar respuestas
        const cuestionarioHoy = { id: snapshotHoy.docs[0].id, ...snapshotHoy.docs[0].data() } as CuestionarioBienestar
        setUltimoCuestionario(cuestionarioHoy)
        setYaCompletadoHoy(true)

        // Sincronizar las respuestas en el formulario
        const formDataFromDB = {
          estadoAnimo: cuestionarioHoy.estadoAnimo,
          horasSueno: cuestionarioHoy.horasSueno,
          calidadSueno: cuestionarioHoy.calidadSueno,
          nivelRecuperacion: cuestionarioHoy.nivelRecuperacion,
          dolorMuscular: cuestionarioHoy.dolorMuscular,
          tipoDolorMuscular: cuestionarioHoy.tipoDolorMuscular || "general",
          zonaDolorMuscular: cuestionarioHoy.zonaDolorMuscular || "",
          comentarios: cuestionarioHoy.comentarios || "",
        }

        setFormData(formDataFromDB)
        setOriginalFormData({ ...formDataFromDB }) // Guardar copia original para cancelar edición

        console.log("✅ Cuestionario de hoy encontrado y sincronizado:", cuestionarioHoy)
        return
      }

      // Si no existe cuestionario para hoy, buscar el más reciente para mostrar historial
      const ultimoQuery = query(
        bienestarRef,
        where("jugadorId", "==", jugadorId),
        orderBy("fechaCreacion", "desc"),
        limit(1),
      )
      const snapshot = await getDocs(ultimoQuery)

      if (!snapshot.empty) {
        const ultimo = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CuestionarioBienestar
        setUltimoCuestionario(ultimo)

        // Verificar si es de hoy (por si acaso)
        const completadoHoy = ultimo.fecha === fechaHoy
        setYaCompletadoHoy(completadoHoy)

        if (completadoHoy) {
          // Sincronizar respuestas si es de hoy
          const formDataFromDB = {
            estadoAnimo: ultimo.estadoAnimo,
            horasSueno: ultimo.horasSueno,
            calidadSueno: ultimo.calidadSueno,
            nivelRecuperacion: ultimo.nivelRecuperacion,
            dolorMuscular: ultimo.dolorMuscular,
            tipoDolorMuscular: ultimo.tipoDolorMuscular || "general",
            zonaDolorMuscular: ultimo.zonaDolorMuscular || "",
            comentarios: ultimo.comentarios || "",
          }

          setFormData(formDataFromDB)
          setOriginalFormData({ ...formDataFromDB })
        }

        console.log("✅ Último cuestionario encontrado:", ultimo)
        console.log("📅 Es de hoy:", completadoHoy)
      } else {
        console.log("ℹ️ No se encontraron cuestionarios previos")
        setYaCompletadoHoy(false)
      }
    } catch (error: any) {
      console.log("⚠️ Error cargando cuestionario:", error)

      // Fallback: buscar en localStorage
      try {
        const fechaHoy = getFechaISO()
        const formStateKey = `wellness-form-${jugadorId}-${fechaHoy}`
        const savedState = localStorage.getItem(formStateKey)

        if (savedState) {
          const { formData: savedFormData, completedToday } = JSON.parse(savedState)
          const savedDate = new Date().toDateString()
          const today = new Date().toDateString()

          if (savedDate === today && completedToday) {
            setFormData(savedFormData)
            setOriginalFormData({ ...savedFormData })
            setYaCompletadoHoy(true)
            console.log("✅ Estado sincronizado desde localStorage")
          }
        }
      } catch (localError) {
        console.log("⚠️ Error en fallback localStorage:", localError)
      }
    }
  }

  const validarFormulario = () => {
    if (formData.estadoAnimo === null) {
      setError("Por favor, selecciona tu estado de ánimo")
      return false
    }
    if (formData.horasSueno === null) {
      setError("Por favor, selecciona las horas de sueño")
      return false
    }
    if (formData.calidadSueno === null) {
      setError("Por favor, selecciona la calidad del sueño")
      return false
    }
    if (formData.nivelRecuperacion === null) {
      setError("Por favor, selecciona tu nivel de recuperación")
      return false
    }
    if (formData.dolorMuscular === null) {
      setError("Por favor, selecciona tu nivel de dolor muscular")
      return false
    }
    if (formData.dolorMuscular >= 3 && formData.tipoDolorMuscular === "especifico" && !formData.zonaDolorMuscular) {
      setError("Por favor, especifica la zona del dolor muscular")
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
    if (!jugadorData || !ultimoCuestionario) return

    // Validar formulario
    if (!validarFormulario()) {
      return
    }

    setSubmitting(true)
    setError("")

    try {
      console.log("🔄 Guardando cambios del cuestionario...")

      // Verificar que el usuario esté autenticado
      if (!auth.currentUser) {
        throw new Error("Usuario no autenticado")
      }

      const fechaHoy = getFechaISO()
      const cuestionarioActualizado: Partial<CuestionarioBienestar> = {
        estadoAnimo: formData.estadoAnimo!,
        horasSueno: formData.horasSueno!,
        calidadSueno: formData.calidadSueno!,
        nivelRecuperacion: formData.nivelRecuperacion!,
        dolorMuscular: formData.dolorMuscular!,
        comentarios: formData.comentarios,
      }

      // Añadir información de dolor muscular si es necesario
      if (formData.dolorMuscular! >= 3) {
        cuestionarioActualizado.tipoDolorMuscular = formData.tipoDolorMuscular
        if (formData.tipoDolorMuscular === "especifico") {
          cuestionarioActualizado.zonaDolorMuscular = formData.zonaDolorMuscular
        }
      } else {
        // Limpiar campos de dolor si no hay dolor significativo
        cuestionarioActualizado.tipoDolorMuscular = undefined
        cuestionarioActualizado.zonaDolorMuscular = undefined
      }

      console.log("📝 Actualizaciones a guardar:", cuestionarioActualizado)

      try {
        const bienestarRef = collection(db, "bienestar")

        // Buscar documento existente para hoy
        const existingQuery = query(
          bienestarRef,
          where("jugadorId", "==", jugadorData.id),
          where("fecha", "==", fechaHoy),
        )
        const existingSnapshot = await getDocs(existingQuery)

        if (!existingSnapshot.empty) {
          // Actualizar documento existente
          const existingDoc = existingSnapshot.docs[0]
          await updateDoc(existingDoc.ref, cuestionarioActualizado)
          console.log("✅ Cuestionario actualizado exitosamente:", existingDoc.id)

          // Actualizar estado local
          const updatedCuestionario = { ...ultimoCuestionario, ...cuestionarioActualizado }
          setUltimoCuestionario(updatedCuestionario)
          setOriginalFormData({ ...formData }) // Actualizar la copia original

          setIsEditing(false)
          setError("")

          // Mostrar mensaje de éxito temporal
          const successMessage = "Cambios guardados exitosamente"
          setError("")

          // Crear un alert temporal de éxito
          const tempAlert = document.createElement("div")
          tempAlert.className =
            "fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50"
          tempAlert.innerHTML = `
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
              </svg>
              ${successMessage}
            </div>
          `
          document.body.appendChild(tempAlert)

          setTimeout(() => {
            if (document.body.contains(tempAlert)) {
              document.body.removeChild(tempAlert)
            }
          }, 3000)
        } else {
          setError("No se encontró el cuestionario para actualizar")
        }
      } catch (firestoreError: any) {
        console.error("❌ Error actualizando en Firestore:", firestoreError)

        if (firestoreError.code === "permission-denied") {
          setError("Error de permisos: No tienes autorización para actualizar este cuestionario.")
        } else {
          setError("Error actualizando: " + firestoreError.message)
        }

        // Fallback a localStorage
        console.log("🔄 Actualizando en localStorage como fallback...")
        try {
          const savedCuestionarios = localStorage.getItem("bienestar-" + jugadorData.id) || "[]"
          const cuestionarios = JSON.parse(savedCuestionarios)

          // Buscar y actualizar
          const existingIndex = cuestionarios.findIndex((c: any) => c.fecha === fechaHoy)
          if (existingIndex >= 0) {
            cuestionarios[existingIndex] = { ...cuestionarios[existingIndex], ...cuestionarioActualizado }
            localStorage.setItem("bienestar-" + jugadorData.id, JSON.stringify(cuestionarios))
            console.log("✅ Actualizado en localStorage")

            setIsEditing(false)
            setOriginalFormData({ ...formData })
          }
        } catch (localStorageError: any) {
          console.error("❌ Error actualizando en localStorage:", localStorageError)
          setError("Error guardando cambios")
        }
      }
    } catch (error: any) {
      console.error("❌ Error general:", error)
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
      console.log("🔄 Iniciando guardado del cuestionario...")

      // Verificar que el usuario esté autenticado
      if (!auth.currentUser) {
        throw new Error("Usuario no autenticado")
      }

      const fechaHoy = getFechaISO()
      const cuestionario: CuestionarioBienestar = {
        jugadorId: jugadorData.id,
        jugadorEmail: user?.email || "",
        clienteId: jugadorData.clienteId || "temp_client",
        fecha: fechaHoy,
        estadoAnimo: formData.estadoAnimo!,
        horasSueno: formData.horasSueno!,
        calidadSueno: formData.calidadSueno!,
        nivelRecuperacion: formData.nivelRecuperacion!,
        dolorMuscular: formData.dolorMuscular!,
        fechaCreacion: new Date(),
        comentarios: formData.comentarios,
        uid: auth.currentUser.uid,
      }

      // Añadir información de dolor muscular si es necesario
      if (formData.dolorMuscular! >= 3) {
        cuestionario.tipoDolorMuscular = formData.tipoDolorMuscular
        if (formData.tipoDolorMuscular === "especifico") {
          cuestionario.zonaDolorMuscular = formData.zonaDolorMuscular
        }
      }

      console.log("📝 Cuestionario a guardar:", cuestionario)

      // Verificar que db esté definido
      if (!db) {
        throw new Error("Base de datos no inicializada")
      }

      try {
        console.log("🔄 Verificando si existe cuestionario para hoy...")
        const bienestarRef = collection(db, "bienestar")

        // Buscar documento existente para hoy
        const existingQuery = query(
          bienestarRef,
          where("jugadorId", "==", jugadorData.id),
          where("fecha", "==", fechaHoy),
        )
        const existingSnapshot = await getDocs(existingQuery)

        let docRef

        if (!existingSnapshot.empty) {
          // Actualizar documento existente
          const existingDoc = existingSnapshot.docs[0]
          await updateDoc(existingDoc.ref, cuestionario)
          docRef = existingDoc.ref
          console.log("✅ Cuestionario actualizado en documento existente:", existingDoc.id)
        } else {
          // Crear nuevo documento
          docRef = await addDoc(bienestarRef, cuestionario)
          console.log("✅ Nuevo cuestionario creado:", docRef.id)
        }

        // Actualizar el estado local
        setUltimoCuestionario({ ...cuestionario, id: docRef.id })
        setOriginalFormData({ ...formData }) // Guardar copia original
        setYaCompletadoHoy(true)

        setSuccess(true)
        setTimeout(() => {
          router.push("/jugador")
        }, 2000)
      } catch (firestoreError: any) {
        console.error("❌ Error guardando en Firestore:", firestoreError)

        if (firestoreError.code === "permission-denied") {
          setError("Error de permisos: Verifica que estés autenticado correctamente.")
        } else {
          setError("Error de Firestore: " + firestoreError.message)
        }

        // Fallback a localStorage
        console.log("🔄 Guardando en localStorage como fallback...")
        try {
          const savedCuestionarios = localStorage.getItem("bienestar-" + jugadorData.id) || "[]"
          const cuestionarios = JSON.parse(savedCuestionarios)

          // Buscar y actualizar o agregar
          const existingIndex = cuestionarios.findIndex((c: any) => c.fecha === fechaHoy)
          const cuestionarioConId = { ...cuestionario, id: Date.now().toString() }

          if (existingIndex >= 0) {
            cuestionarios[existingIndex] = cuestionarioConId
          } else {
            cuestionarios.push(cuestionarioConId)
          }

          localStorage.setItem("bienestar-" + jugadorData.id, JSON.stringify(cuestionarios))
          console.log("✅ Guardado en localStorage")

          setUltimoCuestionario(cuestionarioConId)
          setOriginalFormData({ ...formData })
          setYaCompletadoHoy(true)
          setSuccess(true)

          setTimeout(() => {
            router.push("/jugador")
          }, 2000)
        } catch (localStorageError: any) {
          console.error("❌ Error guardando en localStorage:", localStorageError)
          setError("Error guardando datos")
        }
      }
    } catch (error: any) {
      console.error("❌ Error general:", error)
      setError("Error general al guardar el cuestionario: " + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const ScaleSelector = ({
    name,
    value,
    onChange,
    options,
    icon: Icon,
    title,
    description,
    disabled = false,
  }: {
    name: string
    value: number | null
    onChange: (value: number) => void
    options: typeof escalas.estadoAnimo
    icon: any
    title: string
    description: string
    disabled?: boolean
  }) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Icon className="w-5 h-5 mr-2 text-blue-600" />
          {title}
          {disabled && !isEditing && <span className="ml-2 text-sm text-green-600 font-normal">(Completado hoy)</span>}
          {isEditing && <span className="ml-2 text-sm text-orange-600 font-normal">(Editando)</span>}
        </CardTitle>
        <p className="text-sm text-gray-600">{description}</p>
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
                    : "border-blue-500 bg-blue-50 text-blue-700"
                  : disabled
                    ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                    : "border-gray-200 hover:border-gray-300 text-gray-700 cursor-pointer"
              }`}
            >
              <div className="font-semibold text-lg mb-1">{option.valor}</div>
              <div className="text-sm font-medium mb-1">{option.label}</div>
              <div className="text-xs text-gray-500">{option.descripcion}</div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando cuestionario...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Cuestionario Completado!</h2>
            <p className="text-gray-600 mb-4">
              Gracias por registrar tu estado de bienestar de hoy. Esta información ayudará al cuerpo técnico a
              optimizar tu rendimiento.
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
              <h1 className="text-2xl font-bold text-gray-900">Cuestionario de Bienestar</h1>
              <p className="text-gray-600 mt-1">
                {yaCompletadoHoy
                  ? isEditing
                    ? "Editando tu cuestionario de hoy - Modifica las respuestas que desees"
                    : "Cuestionario completado - Revisa tus respuestas de hoy"
                  : "Registra tu estado físico, mental y emocional"}
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
              : "bg-blue-50 border-blue-200"
          }`}
        >
          <div className="flex items-center">
            <Calendar
              className={`w-5 h-5 mr-2 ${
                yaCompletadoHoy ? (isEditing ? "text-orange-600" : "text-green-600") : "text-blue-600"
              }`}
            />
            <span
              className={`font-medium text-lg ${
                yaCompletadoHoy ? (isEditing ? "text-orange-800" : "text-green-800") : "text-blue-800"
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
              <strong>¡Cuestionario completado hoy!</strong> Estas son las respuestas que registraste. Puedes editarlas
              si necesitas hacer algún cambio.
            </AlertDescription>
          </Alert>
        )}

        {isEditing && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <Edit3 className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Modo de edición activado.</strong> Modifica las respuestas que desees y guarda los cambios, o
              cancela para mantener las respuestas originales.
            </AlertDescription>
          </Alert>
        )}

        {ultimoCuestionario && !yaCompletadoHoy && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Heart className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Último registro:</strong> {new Date(ultimoCuestionario.fechaCreacion).toLocaleDateString("es-ES")}{" "}
              - Estado de ánimo: {ultimoCuestionario.estadoAnimo}/5, Calidad del sueño:{" "}
              {ultimoCuestionario.calidadSueno}/5
            </AlertDescription>
          </Alert>
        )}

        {/* Debug info */}
        {process.env.NODE_ENV === "development" && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-800">
              <strong>Debug:</strong> Usuario: {user?.email}, Autenticado: {auth.currentUser ? "Sí" : "No"}, UID:{" "}
              {auth.currentUser?.uid}, Completado hoy: {yaCompletadoHoy ? "Sí" : "No"}, Editando:{" "}
              {isEditing ? "Sí" : "No"}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <ScaleSelector
            name="estadoAnimo"
            value={formData.estadoAnimo}
            onChange={(value) => setFormData({ ...formData, estadoAnimo: value })}
            options={escalas.estadoAnimo}
            icon={Brain}
            title="Estado de Ánimo"
            description="¿Cómo te sientes anímicamente hoy?"
            disabled={yaCompletadoHoy && !isEditing}
          />

          <ScaleSelector
            name="horasSueno"
            value={formData.horasSueno}
            onChange={(value) => setFormData({ ...formData, horasSueno: value })}
            options={escalas.horasSueno}
            icon={Moon}
            title="Horas de Sueño"
            description="¿Cuántas horas dormiste anoche?"
            disabled={yaCompletadoHoy && !isEditing}
          />

          <ScaleSelector
            name="calidadSueno"
            value={formData.calidadSueno}
            onChange={(value) => setFormData({ ...formData, calidadSueno: value })}
            options={escalas.calidadSueno}
            icon={Moon}
            title="Calidad del Sueño"
            description="¿Cómo fue la calidad de tu sueño anoche?"
            disabled={yaCompletadoHoy && !isEditing}
          />

          <ScaleSelector
            name="nivelRecuperacion"
            value={formData.nivelRecuperacion}
            onChange={(value) => setFormData({ ...formData, nivelRecuperacion: value })}
            options={escalas.nivelRecuperacion}
            icon={Zap}
            title="Nivel de Recuperación/Cansancio"
            description="¿Qué tan recuperado o cansado te sientes?"
            disabled={yaCompletadoHoy && !isEditing}
          />

          <ScaleSelector
            name="dolorMuscular"
            value={formData.dolorMuscular}
            onChange={(value) => setFormData({ ...formData, dolorMuscular: value })}
            options={escalas.dolorMuscular}
            icon={Heart}
            title="Dolor Muscular"
            description="¿Tienes algún dolor o molestia muscular?"
            disabled={yaCompletadoHoy && !isEditing}
          />

          {/* Sección condicional para detalles del dolor muscular */}
          {formData.dolorMuscular !== null && formData.dolorMuscular >= 3 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">
                  Detalles del Dolor Muscular
                  {yaCompletadoHoy && !isEditing && (
                    <span className="ml-2 text-sm text-green-600 font-normal">(Completado hoy)</span>
                  )}
                  {isEditing && <span className="ml-2 text-sm text-orange-600 font-normal">(Editando)</span>}
                </CardTitle>
                <p className="text-sm text-gray-600">
                  {yaCompletadoHoy && !isEditing
                    ? "Estos son los detalles que registraste sobre tu dolor muscular"
                    : "Por favor, proporciona más información sobre tu dolor muscular"}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">Tipo de dolor muscular:</h3>
                  <RadioGroup
                    value={formData.tipoDolorMuscular}
                    onValueChange={(value) =>
                      (yaCompletadoHoy && !isEditing) || setFormData({ ...formData, tipoDolorMuscular: value })
                    }
                    className="flex flex-col space-y-2"
                    disabled={yaCompletadoHoy && !isEditing}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="general" id="general" disabled={yaCompletadoHoy && !isEditing} />
                      <Label htmlFor="general" className={yaCompletadoHoy && !isEditing ? "text-gray-500" : ""}>
                        General (todo el cuerpo)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="especifico" id="especifico" disabled={yaCompletadoHoy && !isEditing} />
                      <Label htmlFor="especifico" className={yaCompletadoHoy && !isEditing ? "text-gray-500" : ""}>
                        Específico (zona concreta)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {formData.tipoDolorMuscular === "especifico" && (
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
                            checked={formData.zonaDolorMuscular === zona}
                            onChange={(e) =>
                              (yaCompletadoHoy && !isEditing) ||
                              setFormData({ ...formData, zonaDolorMuscular: e.target.value })
                            }
                            className="mr-2"
                            disabled={yaCompletadoHoy && !isEditing}
                          />
                          <Label
                            htmlFor={`zona-${zona}`}
                            className={`text-sm ${yaCompletadoHoy && !isEditing ? "text-gray-500" : ""}`}
                          >
                            {zona}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <Label
                        htmlFor="otra-zona"
                        className={`text-sm font-medium ${yaCompletadoHoy && !isEditing ? "text-gray-500" : ""}`}
                      >
                        Otra zona (especificar):
                      </Label>
                      <Textarea
                        id="otra-zona"
                        placeholder={
                          yaCompletadoHoy && !isEditing
                            ? "Zona especificada"
                            : "Describe la zona del dolor si no está en la lista"
                        }
                        value={
                          !zonasDolorMuscular.includes(formData.zonaDolorMuscular) ? formData.zonaDolorMuscular : ""
                        }
                        onChange={(e) =>
                          (yaCompletadoHoy && !isEditing) ||
                          setFormData({ ...formData, zonaDolorMuscular: e.target.value })
                        }
                        className="mt-1"
                        disabled={yaCompletadoHoy && !isEditing}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Comentarios */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Comentarios Adicionales
                {yaCompletadoHoy && !isEditing && (
                  <span className="ml-2 text-sm text-green-600 font-normal">(Completado hoy)</span>
                )}
                {isEditing && <span className="ml-2 text-sm text-orange-600 font-normal">(Editando)</span>}
              </CardTitle>
              <p className="text-sm text-gray-600">
                {yaCompletadoHoy && !isEditing
                  ? formData.comentarios || "No se registraron comentarios adicionales"
                  : "¿Hay algo más que quieras comentar sobre tu estado actual?"}
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
                    : "Ej: Me duele un poco la rodilla izquierda, dormí mal por ruido, me siento ansioso por el partido..."
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
              <Button type="submit" disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700">
                {submitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </div>
                ) : (
                  "Completar Cuestionario"
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
