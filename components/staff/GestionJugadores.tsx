"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Plus, Edit, Trash2, ArrowLeft, Users, Trophy, Calendar, MoreHorizontal, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTheme } from "@/components/theme/ThemeProvider"
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebaseConfig"
import CrearJugador from "./CrearJugador"
import { useToast } from "@/components/ui/use-toast"

// Interface para jugadores
interface Jugador {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono?: string
  fechaNacimiento?: string
  nivel: "Principiante" | "Intermedio" | "Avanzado" | "Profesional"
  estado: "Activo" | "Inactivo" | "Suspendido"
  fechaRegistro: string
  ultimaActividad?: string
  partidasJugadas: number
  torneosParticipados: number
  fotoPerfil?: string
  posicion?: string
  altura?: number
  peso?: number
  username?: string
}

export default function GestionJugadores() {
  const router = useRouter()
  const { user, clienteData } = useAuth()
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedJugador, setSelectedJugador] = useState<Jugador | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { theme } = useTheme()
  const { toast } = useToast()
  const [posicionesExistentes, setPosicionesExistentes] = useState<string[]>([])

  // Función para cargar jugadores con onSnapshot (tiempo real)
  useEffect(() => {
    const fetchClientIdAndPlayers = async () => {
      try {
        setLoading(true)
        console.log("Iniciando carga de jugadores en tiempo real...")

        const currentUser = auth.currentUser
        if (!currentUser) {
          console.log("No hay usuario autenticado")
          setJugadores([])
          setLoading(false)
          return
        }

        console.log("Usuario autenticado:", currentUser.uid)

        // Obtener datos del usuario desde Firestore
        const userRef = doc(db, "users", currentUser.uid)
        const userSnap = await getDoc(userRef)

        if (!userSnap.exists()) {
          console.log("No se encontraron datos del usuario en Firestore")
          setJugadores([])
          setLoading(false)
          return
        }

        const userData = userSnap.data()
        const clientId = userData.clientId

        if (!clientId) {
          console.log("No se encontró clientId en los datos del usuario")
          setJugadores([])
          setLoading(false)
          return
        }

        console.log("ClientId obtenido:", clientId)

        // Configurar listener en tiempo real para jugadores
        // IMPORTANTE: Asegurarse de que la consulta sea exactamente por el mismo clientId
        const playersRef = collection(db, "players")
        const q = query(playersRef, where("clientId", "==", clientId))

        console.log("Consultando jugadores con clientId:", clientId)

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            console.log("Snapshot recibido, documentos:", snapshot.docs.length)

            const jugadoresData: Jugador[] = []
            const posiciones = new Set<string>()

            snapshot.docs.forEach((doc) => {
              const data = doc.data()
              console.log("Jugador encontrado:", doc.id, data)

              // Extraer nombre y apellido del campo "name" si existe
              const nombreCompleto = data.name || ""
              const partesNombre = nombreCompleto.split(" ")
              const nombre = data.firstName || partesNombre[0] || ""
              const apellido = data.lastName || partesNombre.slice(1).join(" ") || ""

              // Agregar posición a la lista de posiciones existentes
              if (data.position) {
                posiciones.add(data.position)
              }

              jugadoresData.push({
                id: doc.id,
                nombre: nombre,
                apellido: apellido,
                email: data.email || "",
                telefono: data.telefono || data.phone || "",
                fechaNacimiento: data.fechaNacimiento || "",
                nivel: data.nivel || "Principiante",
                estado: data.status === "active" ? "Activo" : "Inactivo",
                fechaRegistro: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                ultimaActividad: data.lastActivity?.toDate?.()?.toISOString() || "",
                partidasJugadas: data.partidasJugadas || 0,
                torneosParticipados: data.torneosParticipados || 0,
                fotoPerfil: data.fotoPerfil || "",
                posicion: data.position || "", // Usar "position" como campo principal
                altura: data.altura || 0,
                peso: data.peso || 0,
                username: data.username || "",
              })
            })

            console.log("Total jugadores procesados:", jugadoresData.length)
            setJugadores(jugadoresData)
            setPosicionesExistentes(Array.from(posiciones))
            setLoading(false)
          },
          (error) => {
            console.error("Error en onSnapshot:", error)
            setJugadores([])
            setLoading(false)
          },
        )

        // Cleanup function
        return () => {
          console.log("Desconectando listener de jugadores")
          unsubscribe()
        }
      } catch (error) {
        console.error("Error al configurar listener de jugadores:", error)
        setJugadores([])
        setLoading(false)
      }
    }

    fetchClientIdAndPlayers()
  }, []) // Solo se ejecuta una vez al montar el componente

  // Función para recargar jugadores después de crear uno nuevo
  const handleJugadorCreated = () => {
    setShowCreateDialog(false)
    toast({
      title: "Jugador creado exitosamente",
      description: "El jugador ha sido agregado a la lista automáticamente",
      duration: 3000,
    })
    // No necesitamos recargar manualmente porque onSnapshot se encarga de las actualizaciones
  }

  // Filtrar jugadores por término de búsqueda
  const jugadoresFiltrados = jugadores.filter(
    (jugador) =>
      jugador.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jugador.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jugador.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (jugador.username && jugador.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (jugador.posicion && jugador.posicion.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case "Activo":
        return "bg-green-100 text-green-800"
      case "Inactivo":
        return "bg-gray-100 text-gray-800"
      case "Suspendido":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getNivelBadgeColor = (nivel: string) => {
    switch (nivel) {
      case "Principiante":
        return "bg-blue-100 text-blue-800"
      case "Intermedio":
        return "bg-yellow-100 text-yellow-800"
      case "Avanzado":
        return "bg-orange-100 text-orange-800"
      case "Profesional":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando jugadores...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      {/* Header */}
      <header
        className="border-b shadow-sm"
        style={{
          backgroundColor: theme.background,
          borderBottomColor: theme.border,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/staff")}
                className="flex items-center"
                style={{ color: theme.text }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Panel
              </Button>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: theme.primary }}>
                  Gestión de Jugadores
                </h1>
                <p style={{ color: theme.text, opacity: 0.7 }}>Administra los jugadores registrados</p>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={() => setShowCreateDialog(true)}
                style={{
                  backgroundColor: theme.primary,
                  color: theme.background,
                  borderColor: theme.primary,
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Jugador
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Estadísticas rápidas */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card style={{ borderColor: theme.border, backgroundColor: theme.background }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: theme.text }}>
                Total Jugadores
              </CardTitle>
              <Users className="h-4 w-4" style={{ color: theme.primary }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: theme.primary }}>
                {jugadores.length}
              </div>
              <p className="text-xs" style={{ color: theme.text, opacity: 0.7 }}>
                Registrados
              </p>
            </CardContent>
          </Card>

          <Card style={{ borderColor: theme.border, backgroundColor: theme.background }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: theme.text }}>
                Jugadores Activos
              </CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: theme.primary }}>
                {jugadores.filter((j) => j.estado === "Activo").length}
              </div>
              <p className="text-xs" style={{ color: theme.text, opacity: 0.7 }}>
                En actividad
              </p>
            </CardContent>
          </Card>

          <Card style={{ borderColor: theme.border, backgroundColor: theme.background }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: theme.text }}>
                Partidas Totales
              </CardTitle>
              <Trophy className="h-4 w-4" style={{ color: theme.primary }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: theme.primary }}>
                {jugadores.reduce((total, j) => total + j.partidasJugadas, 0)}
              </div>
              <p className="text-xs" style={{ color: theme.text, opacity: 0.7 }}>
                Jugadas
              </p>
            </CardContent>
          </Card>

          <Card style={{ borderColor: theme.border, backgroundColor: theme.background }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: theme.text }}>
                Torneos
              </CardTitle>
              <Calendar className="h-4 w-4" style={{ color: theme.primary }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: theme.primary }}>
                {jugadores.reduce((total, j) => total + j.torneosParticipados, 0)}
              </div>
              <p className="text-xs" style={{ color: theme.text, opacity: 0.7 }}>
                Participaciones
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda y filtros */}
        <Card className="mb-6" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
          <CardHeader>
            <CardTitle style={{ color: theme.primary }}>Buscar Jugadores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4" style={{ color: theme.text, opacity: 0.5 }} />
              <Input
                placeholder="Buscar por nombre, apellido, email, usuario o posición..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  color: theme.text,
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabla de jugadores */}
        <Card style={{ borderColor: theme.border, backgroundColor: theme.background }}>
          <CardHeader>
            <CardTitle style={{ color: theme.primary }}>Lista de Jugadores ({jugadoresFiltrados.length})</CardTitle>
            <CardDescription style={{ color: theme.text, opacity: 0.7 }}>
              Gestiona la información de todos los jugadores registrados - Actualización automática
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow style={{ borderBottomColor: theme.border }}>
                  <TableHead style={{ color: theme.text }}>Jugador</TableHead>
                  <TableHead style={{ color: theme.text }}>Contacto</TableHead>
                  <TableHead style={{ color: theme.text }}>Posición</TableHead>
                  <TableHead style={{ color: theme.text }}>Estado</TableHead>
                  <TableHead style={{ color: theme.text }}>Físico</TableHead>
                  <TableHead style={{ color: theme.text }}>Estadísticas</TableHead>
                  <TableHead className="text-right" style={{ color: theme.text }}>
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jugadoresFiltrados.map((jugador) => (
                  <TableRow key={jugador.id} style={{ borderBottomColor: theme.border }}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          {jugador.fotoPerfil ? (
                            <AvatarImage src={jugador.fotoPerfil || "/placeholder.svg"} alt={jugador.nombre} />
                          ) : (
                            <AvatarFallback style={{ backgroundColor: theme.primary, color: theme.background }}>
                              {getInitials(jugador.nombre, jugador.apellido)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <div className="font-medium" style={{ color: theme.text }}>
                            {jugador.nombre} {jugador.apellido}
                          </div>
                          <div className="text-sm" style={{ color: theme.text, opacity: 0.5 }}>
                            @{jugador.username || "sin-usuario"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm" style={{ color: theme.text }}>
                          {jugador.email}
                        </div>
                        {jugador.telefono && (
                          <div className="text-sm" style={{ color: theme.text, opacity: 0.5 }}>
                            {jugador.telefono}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm" style={{ color: theme.text }}>
                        {jugador.posicion || "Sin posición"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getEstadoBadgeColor(jugador.estado)}>{jugador.estado}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {jugador.altura && <div style={{ color: theme.text }}>{jugador.altura} cm</div>}
                        {jugador.peso && <div style={{ color: theme.text, opacity: 0.5 }}>{jugador.peso} kg</div>}
                        {!jugador.altura && !jugador.peso && (
                          <div style={{ color: theme.text, opacity: 0.5 }}>Sin datos</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div style={{ color: theme.text }}>{jugador.partidasJugadas} partidas</div>
                        <div style={{ color: theme.text, opacity: 0.5 }}>{jugador.torneosParticipados} torneos</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" style={{ color: theme.text }} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedJugador(jugador)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {jugadoresFiltrados.length === 0 && (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12" style={{ color: theme.text, opacity: 0.4 }} />
                <h3 className="mt-2 text-sm font-medium" style={{ color: theme.text }}>
                  No se encontraron jugadores
                </h3>
                <p className="mt-1 text-sm" style={{ color: theme.text, opacity: 0.5 }}>
                  {searchTerm ? "Intenta con otros términos de búsqueda" : "Comienza agregando un nuevo jugador"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para crear nuevo jugador */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <CrearJugador onJugadorCreated={handleJugadorCreated} posicionesExistentes={posicionesExistentes} />
        </DialogContent>
      </Dialog>

      {/* Dialog para ver perfil del jugador */}
      <Dialog open={!!selectedJugador} onOpenChange={() => setSelectedJugador(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Perfil del Jugador</DialogTitle>
          </DialogHeader>
          {selectedJugador && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  {selectedJugador.fotoPerfil ? (
                    <AvatarImage src={selectedJugador.fotoPerfil || "/placeholder.svg"} alt={selectedJugador.nombre} />
                  ) : (
                    <AvatarFallback className="bg-blue-600 text-white text-lg">
                      {getInitials(selectedJugador.nombre, selectedJugador.apellido)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedJugador.nombre} {selectedJugador.apellido}
                  </h3>
                  <p className="text-gray-600">@{selectedJugador.username}</p>
                  <p className="text-gray-600">{selectedJugador.email}</p>
                  <div className="flex space-x-2 mt-2">
                    <Badge className={getEstadoBadgeColor(selectedJugador.estado)}>{selectedJugador.estado}</Badge>
                    {selectedJugador.posicion && <Badge variant="outline">{selectedJugador.posicion}</Badge>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Información Personal</h4>
                  <div className="mt-2 space-y-1 text-sm">
                    {selectedJugador.telefono && (
                      <p>
                        <span className="text-gray-500">Teléfono:</span> {selectedJugador.telefono}
                      </p>
                    )}
                    {selectedJugador.fechaNacimiento && (
                      <p>
                        <span className="text-gray-500">Fecha de Nacimiento:</span>{" "}
                        {new Date(selectedJugador.fechaNacimiento).toLocaleDateString()}
                      </p>
                    )}
                    {selectedJugador.altura && (
                      <p>
                        <span className="text-gray-500">Altura:</span> {selectedJugador.altura} cm
                      </p>
                    )}
                    {selectedJugador.peso && (
                      <p>
                        <span className="text-gray-500">Peso:</span> {selectedJugador.peso} kg
                      </p>
                    )}
                    <p>
                      <span className="text-gray-500">Registro:</span>{" "}
                      {new Date(selectedJugador.fechaRegistro).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">Estadísticas</h4>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>
                      <span className="text-gray-500">Partidas Jugadas:</span> {selectedJugador.partidasJugadas}
                    </p>
                    <p>
                      <span className="text-gray-500">Torneos:</span> {selectedJugador.torneosParticipados}
                    </p>
                    {selectedJugador.ultimaActividad && (
                      <p>
                        <span className="text-gray-500">Última Actividad:</span>{" "}
                        {new Date(selectedJugador.ultimaActividad).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
