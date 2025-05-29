"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, GamepadIcon, BarChart3, Trophy, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"
import { useTheme } from "@/components/theme/ThemeProvider"
import StaffHeader from "@/components/layout/StaffHeader"

// Interfaces para las estadísticas
interface StaffStats {
  totalJugadores: number
  jugadoresActivos: number
  partidasHoy: number
  torneosPendientes: number
}

export default function StaffPage() {
  const router = useRouter()
  const { user, clienteData } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<StaffStats>({
    totalJugadores: 0,
    jugadoresActivos: 0,
    partidasHoy: 0,
    torneosPendientes: 0,
  })
  const { theme } = useTheme()

  // Verificar que el usuario sea staff
  useEffect(() => {
    if (!loading && clienteData && !clienteData.esAdmin && clienteData.tipoUsuario !== "staff") {
      router.push("/dashboard")
    }
  }, [clienteData, loading, router])

  // Cargar estadísticas al montar el componente
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)

        // Simular estadísticas por ahora (puedes conectar con tu base de datos real)
        const totalJugadores = Math.floor(Math.random() * 100) + 50
        const jugadoresActivos = Math.floor(totalJugadores * 0.7)
        const partidasHoy = Math.floor(Math.random() * 20) + 5
        const torneosPendientes = Math.floor(Math.random() * 5) + 1

        setStats({
          totalJugadores,
          jugadoresActivos,
          partidasHoy,
          torneosPendientes,
        })
      } catch (error) {
        console.error("Error al cargar estadísticas:", error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchStats()
    }
  }, [user])

  const opciones = [
    {
      titulo: "Gestión de jugadores",
      ruta: "/staff/jugadores",
      descripcion: "Administrar jugadores y sus perfiles",
      icono: Users,
      color: "text-blue-600",
      destacado: false,
    },
    {
      titulo: "Partidas",
      ruta: "/staff/partidas",
      descripcion: "Ver y gestionar partidas en curso",
      icono: GamepadIcon,
      color: "text-green-600",
    },
    {
      titulo: "Torneos",
      ruta: "/staff/torneos",
      descripcion: "Organizar y supervisar torneos",
      icono: Trophy,
      color: "text-yellow-600",
    },
    {
      titulo: "Horarios",
      ruta: "/staff/horarios",
      descripcion: "Gestionar horarios y reservas",
      icono: Calendar,
      color: "text-purple-600",
    },
    {
      titulo: "Reportes",
      ruta: "/staff/reportes",
      descripcion: "Ver estadísticas y reportes",
      icono: BarChart3,
      color: "text-orange-600",
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando panel de staff...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      {/* Header personalizado para staff */}
      <StaffHeader />

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Estadísticas Rápidas */}
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
                {stats.totalJugadores}
              </div>
              <p className="text-xs" style={{ color: theme.text, opacity: 0.7 }}>
                Registrados en el sistema
              </p>
            </CardContent>
          </Card>

          <Card style={{ borderColor: theme.border, backgroundColor: theme.background }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: theme.text }}>
                Jugadores Activos
              </CardTitle>
              <GamepadIcon className="h-4 w-4" style={{ color: theme.primary }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: theme.primary }}>
                {stats.jugadoresActivos}
              </div>
              <p className="text-xs" style={{ color: theme.text, opacity: 0.7 }}>
                Activos esta semana
              </p>
            </CardContent>
          </Card>

          <Card style={{ borderColor: theme.border, backgroundColor: theme.background }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: theme.text }}>
                Partidas Hoy
              </CardTitle>
              <Trophy className="h-4 w-4" style={{ color: theme.primary }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: theme.primary }}>
                {stats.partidasHoy}
              </div>
              <p className="text-xs" style={{ color: theme.text, opacity: 0.7 }}>
                En curso y completadas
              </p>
            </CardContent>
          </Card>

          <Card style={{ borderColor: theme.border, backgroundColor: theme.background }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: theme.text }}>
                Torneos Pendientes
              </CardTitle>
              <Calendar className="h-4 w-4" style={{ color: theme.primary }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: theme.primary }}>
                {stats.torneosPendientes}
              </div>
              <p className="text-xs" style={{ color: theme.text, opacity: 0.7 }}>
                Por organizar
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Opciones de Gestión */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {opciones.map((opcion) => {
            const IconComponent = opcion.icono
            return (
              <Card
                key={opcion.ruta}
                onClick={() => router.push(opcion.ruta)}
                className={`cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 ${
                  opcion.destacado ? "ring-2" : ""
                }`}
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  ...(opcion.destacado && {
                    borderColor: theme.primary,
                    backgroundColor: `${theme.primary}10`, // Fondo con transparencia
                  }),
                }}
              >
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div
                      className="p-3 rounded-full"
                      style={{
                        backgroundColor: theme.secondary,
                        color: theme.primary,
                      }}
                    >
                      <IconComponent className="h-8 w-8" />
                    </div>
                  </div>
                  <CardTitle className="text-xl" style={{ color: theme.primary }}>
                    {opcion.titulo}
                  </CardTitle>
                  <CardDescription style={{ color: theme.text, opacity: 0.7 }}>{opcion.descripcion}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button
                    variant={opcion.destacado ? "default" : "outline"}
                    className="w-full"
                    style={
                      opcion.destacado
                        ? {
                            backgroundColor: theme.primary,
                            color: theme.background,
                            borderColor: theme.primary,
                          }
                        : {
                            borderColor: theme.border,
                            color: theme.primary,
                            backgroundColor: "transparent",
                          }
                    }
                  >
                    {opcion.destacado ? "Acceder Ahora" : "Acceder"}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
