"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Mail, Calendar, MapPin, Ruler, Weight, Trophy, AlertCircle } from "lucide-react"

interface JugadorUser {
  id: string
  nombre: string
  apellido: string
  nombreVisualizacion: string
  email: string
  clienteId: string
  clienteNombre: string
  rol: string
  estado: string
  posicionPrincipal: string
  posicionSecundaria?: string
  fechaNacimiento: string
  altura?: number
  peso?: number
  foto?: string
  fechaCreacion: Date
}

export default function JugadorPerfilPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [jugadorData, setJugadorData] = useState<JugadorUser | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")

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

  const loadJugadorData = async () => {
    try {
      setLoadingData(true)
      setError("")
      console.log("🔄 Cargando datos del jugador:", user?.email)

      // Buscar jugador en Firestore
      try {
        const jugadoresRef = collection(db, "jugadores")
        const jugadorQuery = query(jugadoresRef, where("email", "==", user?.email))
        const jugadorSnapshot = await getDocs(jugadorQuery)

        if (!jugadorSnapshot.empty) {
          const jugadorInfo = {
            id: jugadorSnapshot.docs[0].id,
            ...jugadorSnapshot.docs[0].data(),
            fechaCreacion: jugadorSnapshot.docs[0].data().fechaCreacion?.toDate() || new Date(),
          } as JugadorUser
          setJugadorData(jugadorInfo)
          console.log("✅ Jugador encontrado:", jugadorInfo)
        } else {
          console.log("⚠️ Jugador no encontrado en Firestore")

          // Buscar en la colección users como fallback
          const usersRef = collection(db, "users")
          const usersQuery = query(usersRef, where("email", "==", user?.email))
          const usersSnapshot = await getDocs(usersQuery)

          if (!usersSnapshot.empty) {
            const userData = usersSnapshot.docs[0].data()
            console.log("✅ Usuario encontrado en colección 'users':", userData)

            if (userData.rol === "jugador") {
              const jugadorInfo: JugadorUser = {
                id: usersSnapshot.docs[0].id,
                nombre: userData.nombre || userData.firstName || "",
                apellido: userData.apellido || userData.lastName || "",
                nombreVisualizacion:
                  userData.nombreVisualizacion ||
                  `${userData.nombre || userData.firstName} ${userData.apellido || userData.lastName}`,
                email: userData.email,
                clienteId: userData.clienteId || "",
                clienteNombre: userData.clienteNombre || "",
                rol: userData.rol,
                estado: userData.estado || "activo",
                posicionPrincipal: userData.posicionPrincipal || "Jugador",
                posicionSecundaria: userData.posicionSecundaria,
                fechaNacimiento: userData.fechaNacimiento || "",
                altura: userData.altura,
                peso: userData.peso,
                foto: userData.foto,
                fechaCreacion: userData.fechaCreacion?.toDate() || new Date(),
              }
              setJugadorData(jugadorInfo)
              console.log("✅ Jugador creado desde 'users':", jugadorInfo)
            } else {
              setError("Usuario no es un jugador")
            }
          } else {
            setError("Usuario no encontrado en el sistema")
          }
        }
      } catch (firestoreError: any) {
        console.log("⚠️ Error consultando Firestore:", firestoreError.message)
        setError("Error cargando datos del jugador")
      }
    } catch (error: any) {
      console.error("❌ Error cargando datos del jugador:", error)
      setError("Error cargando datos del jugador")
    } finally {
      setLoadingData(false)
    }
  }

  const calcularEdad = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return "No especificada"

    const nacimiento = new Date(fechaNacimiento)
    const hoy = new Date()
    let edad = hoy.getFullYear() - nacimiento.getFullYear()
    const mes = hoy.getMonth() - nacimiento.getMonth()
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--
    }
    return `${edad} años`
  }

  const formatearFecha = (fecha: string) => {
    if (!fecha) return "No especificada"
    return new Date(fecha).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando perfil...</p>
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
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!jugadorData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No se encontraron datos del jugador</AlertDescription>
          </Alert>
        </div>
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
              <p className="text-gray-600 mt-1">Información personal y deportiva</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Izquierda - Foto y Info Básica */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="text-center py-8">
                <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                  {jugadorData.foto ? (
                    <img
                      src={jugadorData.foto || "/placeholder.svg"}
                      alt={`Foto de ${jugadorData.nombreVisualizacion}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{jugadorData.nombreVisualizacion}</h2>
                <p className="text-lg text-gray-600 mb-4">
                  {jugadorData.nombre} {jugadorData.apellido}
                </p>
                <Badge variant={jugadorData.estado === "activo" ? "default" : "secondary"} className="mb-4">
                  {jugadorData.estado}
                </Badge>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-center">
                    <Trophy className="w-4 h-4 mr-2" />
                    <span>{jugadorData.posicionPrincipal}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{jugadorData.clienteNombre}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Columna Derecha - Información Detallada */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información Personal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <div className="flex items-center mt-1">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-900">{jugadorData.email}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Fecha de Nacimiento</label>
                    <div className="flex items-center mt-1">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-900">{formatearFecha(jugadorData.fechaNacimiento)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Edad</label>
                    <div className="flex items-center mt-1">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-900">{calcularEdad(jugadorData.fechaNacimiento)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Estado</label>
                    <div className="flex items-center mt-1">
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${jugadorData.estado === "activo" ? "bg-green-400" : "bg-gray-400"}`}
                      ></div>
                      <span className="text-gray-900 capitalize">{jugadorData.estado}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información Deportiva */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="w-5 h-5 mr-2" />
                  Información Deportiva
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Posición Principal</label>
                    <div className="mt-1">
                      <span className="text-gray-900 font-medium">{jugadorData.posicionPrincipal}</span>
                    </div>
                  </div>
                  {jugadorData.posicionSecundaria && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Posición Secundaria</label>
                      <div className="mt-1">
                        <span className="text-gray-900">{jugadorData.posicionSecundaria}</span>
                      </div>
                    </div>
                  )}
                  {jugadorData.altura && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Altura</label>
                      <div className="flex items-center mt-1">
                        <Ruler className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="text-gray-900">{jugadorData.altura} cm</span>
                      </div>
                    </div>
                  )}
                  {jugadorData.peso && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Peso</label>
                      <div className="flex items-center mt-1">
                        <Weight className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="text-gray-900">{jugadorData.peso} kg</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Información del Sistema */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Club/Equipo</label>
                    <div className="mt-1">
                      <span className="text-gray-900">{jugadorData.clienteNombre}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Rol en el Sistema</label>
                    <div className="mt-1">
                      <Badge variant="outline" className="capitalize">
                        {jugadorData.rol}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Fecha de Registro</label>
                    <div className="mt-1">
                      <span className="text-gray-900">
                        {jugadorData.fechaCreacion.toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nota informativa */}
            <Alert className="border-blue-200 bg-blue-50">
              <User className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Nota:</strong> Si necesitas actualizar algún dato de tu perfil, contacta con el cuerpo técnico o
                administrador del sistema.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  )
}
