"use client"

import type React from "react"

import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Añadir después de las importaciones
import { cn } from "@/lib/utils"

// Importar los iconos necesarios al inicio del archivo:
import { ArrowLeft } from 'lucide-react'

// Componente Badge personalizado con colores adicionales
const CustomBadge = ({
  variant,
  children,
}: {
  variant: "blue" | "green" | "yellow" | "orange" | "red" | "default" | "secondary" | "destructive" | "outline"
  children: React.ReactNode
}) => {
  const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"

  const variantClasses = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-800",
    orange: "bg-orange-100 text-orange-800",
    red: "bg-red-100 text-red-800",
    default: "bg-primary/10 text-primary hover:bg-primary/20",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  }

  return <span className={cn(baseClasses, variantClasses[variant])}>{children}</span>
}

interface Jugador {
  id: string
  nombre: string
  apellido: string
  email: string
  clienteId: string
}

interface RespuestaBienestar {
  jugadorId: string
  fecha: string
  respuestas: { [key: string]: number | string }
  clienteId: string
}

interface RespuestaPercepcion {
  jugadorId: string
  fecha: string
  nivelEsfuerzo: number
  comentarios: string
  clienteId: string
}

interface DatosJugador {
  jugador: Jugador
  bienestar: RespuestaBienestar | null
  percepcion: RespuestaPercepcion | null
}

// Move this function definition before the useEffect hooks
function obtenerFechaHoy() {
  const hoy = new Date()
  return hoy.toISOString().split("T")[0] // Formato YYYY-MM-DD
}

export default function CargaInternaPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [datosJugadores, setDatosJugadores] = useState<DatosJugador[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(() => {
    const hoy = new Date()
    return hoy.toISOString().split("T")[0] // Formato YYYY-MM-DD
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      cargarDatosJugadores()
    }
  }, [user, fechaSeleccionada])

  const cargarDatosJugadores = async () => {
    try {
      setLoadingData(true)
      setError(null)

      if (!user?.email) {
        setError("Usuario no válido")
        return
      }

      let userClienteId: string | null = null

      try {
        // Paso 1: Buscar el usuario staff en la colección "staff"
        console.log("🔍 Buscando usuario staff:", user.email)
        const staffRef = collection(db, "staff")
        const staffQuery = query(staffRef, where("email", "==", user.email))
        const staffSnapshot = await getDocs(staffQuery)

        if (!staffSnapshot.empty) {
          const staffData = staffSnapshot.docs[0].data()
          userClienteId = staffData.clienteId
          console.log("✅ Usuario staff encontrado en Firestore:", staffData)
          console.log("📋 ClienteId del staff:", userClienteId)
        } else {
          console.log("⚠️ Usuario staff no encontrado en Firestore, intentando localStorage...")
        }
      } catch (firestoreError: any) {
        console.log("⚠️ Error consultando Firestore, usando localStorage:", firestoreError.message)
      }

      // Fallback a localStorage si no se encontró en Firestore
      if (!userClienteId) {
        try {
          const savedStaff = localStorage.getItem("staff")
          if (savedStaff) {
            const staffUsers = JSON.parse(savedStaff)
            const foundStaff = staffUsers.find((s: any) => s.email === user.email)
            if (foundStaff && foundStaff.clienteId) {
              userClienteId = foundStaff.clienteId
              console.log("✅ Usuario staff encontrado en localStorage:", foundStaff)
            }
          }
        } catch (localStorageError) {
          console.error("Error con localStorage:", localStorageError)
        }
      }

      if (!userClienteId) {
        setError("Usuario staff sin clienteId asignado. Contacte al administrador para configurar su acceso.")
        return
      }

      setClienteId(userClienteId)
      console.log("🎯 Buscando jugadores con clienteId:", userClienteId)

      // Paso 2: Buscar jugadores en múltiples colecciones
      let jugadores: Jugador[] = []

      // Intentar primero en la colección "jugadores"
      try {
        console.log("🔍 Buscando en colección 'jugadores'...")
        const jugadoresRef = collection(db, "jugadores")
        const jugadoresQuery = query(
          jugadoresRef,
          where("clienteId", "==", userClienteId),
          where("estado", "==", "activo"),
        )
        const jugadoresSnapshot = await getDocs(jugadoresQuery)

        jugadores = jugadoresSnapshot.docs.map((doc) => ({
          id: doc.id,
          nombre: doc.data().nombre || doc.data().firstName || "",
          apellido: doc.data().apellido || doc.data().lastName || "",
          email: doc.data().email,
          clienteId: doc.data().clienteId,
        }))

        console.log("✅ Jugadores encontrados en colección 'jugadores':", jugadores.length)
      } catch (firestoreError: any) {
        console.log("⚠️ Error consultando colección 'jugadores':", firestoreError.message)
      }

      // Si no encontró jugadores, intentar en la colección "users"
      if (jugadores.length === 0) {
        try {
          console.log("🔍 Buscando en colección 'users'...")
          const usersRef = collection(db, "users")
          const jugadoresQuery = query(
            usersRef,
            where("clienteId", "==", userClienteId),
            where("rol", "==", "jugador"),
            where("estado", "==", "activo"),
          )
          const jugadoresSnapshot = await getDocs(jugadoresQuery)

          jugadores = jugadoresSnapshot.docs.map((doc) => ({
            id: doc.id,
            nombre: doc.data().nombre || doc.data().firstName || "",
            apellido: doc.data().apellido || doc.data().lastName || "",
            email: doc.data().email,
            clienteId: doc.data().clienteId,
          }))

          console.log("✅ Jugadores encontrados en colección 'users':", jugadores.length)
        } catch (firestoreError: any) {
          console.log("⚠️ Error consultando colección 'users':", firestoreError.message)
        }
      }

      // Fallback a localStorage si no se encontraron jugadores en Firestore
      if (jugadores.length === 0) {
        try {
          console.log("🔍 Buscando jugadores en localStorage...")
          const savedUsers = localStorage.getItem("usuarios")
          if (savedUsers) {
            const users = JSON.parse(savedUsers)
            jugadores = users
              .filter((u: any) => u.clienteId === userClienteId && u.rol === "jugador" && u.estado === "activo")
              .map((u: any) => ({
                id: u.id || u.email,
                nombre: u.nombre || u.firstName || "",
                apellido: u.apellido || u.lastName || "",
                email: u.email,
                clienteId: u.clienteId,
              }))
            console.log("✅ Jugadores encontrados en localStorage:", jugadores.length)
          }
        } catch (localStorageError) {
          console.error("Error con localStorage para jugadores:", localStorageError)
        }
      }

      // Si aún no hay jugadores, crear una lista basada en las respuestas existentes
      if (jugadores.length === 0) {
        console.log("🔍 No se encontraron jugadores, creando lista desde respuestas...")
        const jugadoresFromResponses = new Set<string>()

        // Buscar jugadores en respuestas de bienestar
        try {
          const bienestarRef = collection(db, "bienestar")
          const bienestarQuery = query(
            bienestarRef,
            where("clienteId", "==", userClienteId),
            where("fecha", "==", fechaSeleccionada),
          )
          const bienestarSnapshot = await getDocs(bienestarQuery)

          bienestarSnapshot.docs.forEach((doc) => {
            const data = doc.data()
            jugadoresFromResponses.add(data.jugadorId)
          })
        } catch (error) {
          console.log("Error buscando en bienestar:", error)
        }

        // Buscar jugadores en respuestas de percepción
        try {
          const percepcionRef = collection(db, "percepcion-esfuerzo")
          const percepcionQuery = query(
            percepcionRef,
            where("clienteId", "==", userClienteId),
            where("fecha", "==", fechaSeleccionada),
          )
          const percepcionSnapshot = await getDocs(percepcionQuery)

          percepcionSnapshot.docs.forEach((doc) => {
            const data = doc.data()
            jugadoresFromResponses.add(data.jugadorId)
          })
        } catch (error) {
          console.log("Error buscando en percepción:", error)
        }

        // Crear jugadores básicos desde las respuestas
        jugadores = Array.from(jugadoresFromResponses).map((jugadorId) => ({
          id: jugadorId,
          nombre: "Jugador",
          apellido: jugadorId.substring(0, 8),
          email: `${jugadorId}@jugador.com`,
          clienteId: userClienteId!,
        }))

        console.log("✅ Jugadores creados desde respuestas:", jugadores.length)
      }

      if (jugadores.length === 0) {
        setError(`No se encontraron jugadores activos para el cliente: ${userClienteId}`)
        return
      }

      // Paso 3: Obtener respuestas de bienestar de la fecha seleccionada
      const respuestasBienestar: { [key: string]: RespuestaBienestar } = {}

      try {
        const bienestarRef = collection(db, "bienestar")
        const bienestarQuery = query(
          bienestarRef,
          where("clienteId", "==", userClienteId),
          where("fecha", "==", fechaSeleccionada),
        )
        const bienestarSnapshot = await getDocs(bienestarQuery)

        bienestarSnapshot.docs.forEach((doc) => {
          const data = doc.data()
          respuestasBienestar[data.jugadorId] = {
            jugadorId: data.jugadorId,
            fecha: data.fecha,
            respuestas: data.respuestas || data, // Usar data directamente si no hay campo respuestas
            clienteId: data.clienteId,
          }
        })

        console.log("✅ Respuestas de bienestar encontradas:", Object.keys(respuestasBienestar).length)
        console.log("📋 Estructura de bienestar:", respuestasBienestar)
      } catch (firestoreError: any) {
        console.log("⚠️ Error consultando bienestar en Firestore, usando localStorage:", firestoreError.message)

        // Fallback a localStorage para bienestar
        try {
          const savedBienestar = localStorage.getItem(`bienestar_${fechaSeleccionada}`)
          if (savedBienestar) {
            const bienestarData = JSON.parse(savedBienestar)
            if (Array.isArray(bienestarData)) {
              bienestarData
                .filter((b: any) => b.clienteId === userClienteId)
                .forEach((b: any) => {
                  respuestasBienestar[b.jugadorId] = {
                    jugadorId: b.jugadorId,
                    fecha: b.fecha,
                    respuestas: b.respuestas || b, // Usar b directamente si no hay campo respuestas
                    clienteId: b.clienteId,
                  }
                })
            }
            console.log(
              "✅ Respuestas de bienestar encontradas en localStorage:",
              Object.keys(respuestasBienestar).length,
            )
          }
        } catch (localStorageError) {
          console.error("Error con localStorage para bienestar:", localStorageError)
        }
      }

      // Paso 4: Obtener respuestas de percepción del esfuerzo de la fecha seleccionada
      const respuestasPercepcion: { [key: string]: RespuestaPercepcion } = {}

      try {
        const percepcionRef = collection(db, "percepcion-esfuerzo")
        const percepcionQuery = query(
          percepcionRef,
          where("clienteId", "==", userClienteId),
          where("fecha", "==", fechaSeleccionada),
        )
        const percepcionSnapshot = await getDocs(percepcionQuery)

        percepcionSnapshot.docs.forEach((doc) => {
          const data = doc.data()
          console.log("📋 Datos de percepción para jugador:", data.jugadorId, data) // Debug log
          respuestasPercepcion[data.jugadorId] = {
            jugadorId: data.jugadorId,
            fecha: data.fecha,
            nivelEsfuerzo: data.nivelEsfuerzo, // Asegurar que se toma directamente del campo
            comentarios: data.comentarios || "",
            clienteId: data.clienteId,
          }
        })

        console.log("✅ Respuestas de percepción encontradas:", Object.keys(respuestasPercepcion).length)
      } catch (firestoreError: any) {
        console.log("⚠️ Error consultando percepción en Firestore, usando localStorage:", firestoreError.message)

        // Fallback a localStorage para percepción
        try {
          const savedPercepcion = localStorage.getItem(`percepcion_${fechaSeleccionada}`)
          if (savedPercepcion) {
            const percepcionData = JSON.parse(savedPercepcion)
            if (Array.isArray(percepcionData)) {
              percepcionData
                .filter((p: any) => p.clienteId === userClienteId)
                .forEach((p: any) => {
                  console.log("📋 Datos de percepción localStorage para jugador:", p.jugadorId, p) // Debug log
                  respuestasPercepcion[p.jugadorId] = {
                    jugadorId: p.jugadorId,
                    fecha: p.fecha,
                    nivelEsfuerzo: p.nivelEsfuerzo, // Asegurar que se toma directamente del campo
                    comentarios: p.comentarios || "",
                    clienteId: p.clienteId,
                  }
                })
            }
            console.log(
              "✅ Respuestas de percepción encontradas en localStorage:",
              Object.keys(respuestasPercepcion).length,
            )
          }
        } catch (localStorageError) {
          console.error("Error con localStorage para percepción:", localStorageError)
        }
      }

      // Paso 5: Combinar todos los datos
      const datosCompletos: DatosJugador[] = jugadores.map((jugador) => ({
        jugador,
        bienestar: respuestasBienestar[jugador.id] || null,
        percepcion: respuestasPercepcion[jugador.id] || null,
      }))

      setDatosJugadores(datosCompletos)
      console.log("✅ Datos cargados exitosamente:", datosCompletos.length, "jugadores")
    } catch (error: any) {
      console.error("❌ Error general cargando datos:", error)
      setError(`Error de conexión: ${error.message}. Intente nuevamente o contacte al administrador.`)
    } finally {
      setLoadingData(false)
    }
  }

  const formatearRespuesta = (respuesta: number | undefined) => {
    if (respuesta === undefined || respuesta === null) return "-"
    return respuesta.toString()
  }

  const obtenerValorBienestar = (bienestar: RespuestaBienestar | null, campo: string) => {
    if (!bienestar) return undefined

    // Intentar obtener del campo respuestas primero
    if (bienestar.respuestas && bienestar.respuestas[campo] !== undefined) {
      return bienestar.respuestas[campo]
    }

    // Si no existe respuestas, intentar obtener directamente del objeto
    if ((bienestar as any)[campo] !== undefined) {
      return (bienestar as any)[campo]
    }

    return undefined
  }

  const obtenerColorBadge = (valor: number | undefined, tipo: "bienestar" | "percepcion") => {
    if (valor === undefined) return "secondary"

    if (tipo === "bienestar") {
      // Nuevos colores para bienestar basados en valores específicos
      if (valor === 1) return "blue" // Azul para 1
      if (valor === 2) return "green" // Verde para 2
      if (valor === 3) return "yellow" // Amarillo para 3
      if (valor === 4) return "orange" // Naranja para 4
      if (valor === 5) return "red" // Rojo para 5
      return "secondary" // Valor por defecto para otros valores
    } else {
      // Para RPE (percepción de esfuerzo) - nuevos rangos de colores
      if (valor >= 1 && valor <= 2) return "blue" // Azul para 1-2
      if (valor >= 3 && valor <= 4) return "green" // Verde para 3-4
      if (valor >= 5 && valor <= 6) return "yellow" // Amarillo para 5-6
      if (valor >= 7 && valor <= 8) return "orange" // Naranja para 7-8
      if (valor >= 9 && valor <= 10) return "red" // Rojo para 9-10
      return "secondary" // Valor por defecto para otros valores
    }
  }

  // Función para obtener las iniciales del usuario
  const obtenerIniciales = (email: string) => {
    const partes = email.split('@')[0].split('.')
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos de los jugadores...</p>
          {clienteId && <p className="text-sm text-gray-500 mt-2">Cliente: {clienteId}</p>}
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-red-500 text-xl mb-2">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error de Conexión</h3>
              <p className="text-gray-600 mb-4 text-sm">{error}</p>
              <div className="space-y-2">
                <button
                  onClick={cargarDatosJugadores}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2"
                >
                  Reintentar
                </button>
                <div className="text-xs text-gray-500 mt-4">
                  <p>Posibles soluciones:</p>
                  <ul className="list-disc list-inside text-left mt-2 space-y-1">
                    <li>Verificar que las reglas de Firestore permitan lectura</li>
                    <li>Confirmar que el usuario staff tenga clienteId asignado en la colección "staff"</li>
                    <li>Revisar que existan jugadores con el mismo clienteId</li>
                    <li>Verificar la conexión a internet</li>
                  </ul>
                </div>
              </div>
            </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con el estilo exacto de la imagen */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium">Volver</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Carga Interna</h1>
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600">
                  Monitoreo diario del bienestar y percepción del esfuerzo • {clienteId || 'Cliente'}
                </p>
                <div className="flex items-center gap-2">
                  <label htmlFor="fecha" className="text-sm text-gray-600">Fecha:</label>
                  <input
                    id="fecha"
                    type="date"
                    value={fechaSeleccionada}
                    onChange={(e) => setFechaSeleccionada(e.target.value)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Staff</span>
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {user?.email ? obtenerIniciales(user.email) : 'PP'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Estado de los Jugadores - {fechaSeleccionada}</span>
                <button
                  onClick={cargarDatosJugadores}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={loadingData}
                >
                  {loadingData ? "Cargando..." : "Actualizar"}
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {datosJugadores.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No se encontraron jugadores para el día de hoy</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Los jugadores deben completar sus cuestionarios para aparecer aquí
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Jugador</th>
                        <th className="text-center p-3 font-semibold">Estado Ánimo</th>
                        <th className="text-center p-3 font-semibold">Horas Sueño</th>
                        <th className="text-center p-3 font-semibold">Calidad Sueño</th>
                        <th className="text-center p-3 font-semibold">Recuperación</th>
                        <th className="text-center p-3 font-semibold">Dolor Muscular</th>
                        <th className="text-center p-3 font-semibold">Tipo de Dolor</th>
                        <th className="text-center p-3 font-semibold">Zona</th>
                        <th className="text-center p-3 font-semibold">RPE</th>
                        <th className="text-center p-3 font-semibold">Comentarios RPE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datosJugadores.map((datos, index) => (
                        <tr key={datos.jugador.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                          <td className="p-3">
                            <div>
                              <div className="font-medium text-gray-900">
                                {datos.jugador.nombre} {datos.jugador.apellido}
                              </div>
                              <div className="text-sm text-gray-500">{datos.jugador.email}</div>
                            </div>
                          </td>

                          {/* Preguntas de Bienestar */}
                          <td className="p-3 text-center">
                            <CustomBadge
                              variant={obtenerColorBadge(
                                obtenerValorBienestar(datos.bienestar, "estadoAnimo"),
                                "bienestar",
                              )}
                            >
                              {formatearRespuesta(obtenerValorBienestar(datos.bienestar, "estadoAnimo"))}
                            </CustomBadge>
                          </td>
                          <td className="p-3 text-center">
                            <CustomBadge
                              variant={obtenerColorBadge(
                                obtenerValorBienestar(datos.bienestar, "horasSueno"),
                                "bienestar",
                              )}
                            >
                              {formatearRespuesta(obtenerValorBienestar(datos.bienestar, "horasSueno"))}
                            </CustomBadge>
                          </td>
                          <td className="p-3 text-center">
                            <CustomBadge
                              variant={obtenerColorBadge(
                                obtenerValorBienestar(datos.bienestar, "calidadSueno"),
                                "bienestar",
                              )}
                            >
                              {formatearRespuesta(obtenerValorBienestar(datos.bienestar, "calidadSueno"))}
                            </CustomBadge>
                          </td>
                          <td className="p-3 text-center">
                            <CustomBadge
                              variant={obtenerColorBadge(
                                obtenerValorBienestar(datos.bienestar, "nivelRecuperacion"),
                                "bienestar",
                              )}
                            >
                              {formatearRespuesta(obtenerValorBienestar(datos.bienestar, "nivelRecuperacion"))}
                            </CustomBadge>
                          </td>
                          <td className="p-3 text-center">
                            <CustomBadge
                              variant={obtenerColorBadge(
                                obtenerValorBienestar(datos.bienestar, "dolorMuscular"),
                                "bienestar",
                              )}
                            >
                              {formatearRespuesta(obtenerValorBienestar(datos.bienestar, "dolorMuscular"))}
                            </CustomBadge>
                          </td>
                          {/* Tipo de Dolor */}
                          <td className="p-3 text-center max-w-xs">
                            {obtenerValorBienestar(datos.bienestar, "tipoDolorMuscular") ? (
                              <div
                                className="text-sm text-gray-600 truncate"
                                title={obtenerValorBienestar(datos.bienestar, "tipoDolorMuscular")}
                              >
                                {obtenerValorBienestar(datos.bienestar, "tipoDolorMuscular")}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center max-w-xs">
                            {obtenerValorBienestar(datos.bienestar, "zonaDolorMuscular") ? (
                              <div
                                className="text-sm text-gray-600 truncate"
                                title={obtenerValorBienestar(datos.bienestar, "zonaDolorMuscular")}
                              >
                                {obtenerValorBienestar(datos.bienestar, "zonaDolorMuscular")}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>

                          {/* Datos de Percepción del Esfuerzo */}
                          <td className="p-3 text-center">
                            <CustomBadge variant={obtenerColorBadge(datos.percepcion?.nivelEsfuerzo, "percepcion")}>
                              {datos.percepcion?.nivelEsfuerzo ? datos.percepcion.nivelEsfuerzo : "-"}
                            </CustomBadge>
                          </td>
                          <td className="p-3 text-center max-w-xs">
                            {datos.percepcion?.comentarios ? (
                              <div className="text-sm text-gray-600 truncate" title={datos.percepcion.comentarios}>
                                {datos.percepcion.comentarios}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {datosJugadores.filter((d) => d.bienestar !== null).length}
                  </div>
                  <div className="text-sm text-gray-600">Completaron Bienestar</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {datosJugadores.filter((d) => d.percepcion !== null).length}
                  </div>
                  <div className="text-sm text-gray-600">Completaron RPE</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {datosJugadores.filter((d) => d.bienestar !== null && d.percepcion !== null).length}
                  </div>
                  <div className="text-sm text-gray-600">Completaron Ambos</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{datosJugadores.length}</div>
                  <div className="text-sm text-gray-600">Total Jugadores</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
