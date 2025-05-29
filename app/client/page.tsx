"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar, Clock, MapPin, CheckCircle, AlertCircle, User, LogOut, Settings } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useTheme } from "@/components/theme/ThemeProvider"

export default function ClientPage() {
  const { user, clienteData, signOut } = useAuth()
  const router = useRouter()
  const { theme } = useTheme()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }

  // Obtener las iniciales del usuario
  const getInitials = () => {
    if (user?.nombre && user?.apellido) {
      return `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase()
    } else if (user?.nombre) {
      return user.nombre.charAt(0).toUpperCase()
    } else if (user) {
      return user.email.charAt(0).toUpperCase()
    }
    return "U"
  }

  // Obtener el nombre del usuario
  const getUserDisplayName = () => {
    if (user?.nombre && user?.apellido) {
      return `${user.nombre} ${user.apellido}`
    } else if (user?.nombre) {
      return user.nombre
    } else if (user) {
      const name = user.email.split("@")[0]
      return name.charAt(0).toUpperCase() + name.slice(1)
    }
    return "Usuario"
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background, color: theme.text }}>
      {/* Header con tema aplicado */}
      <header className="border-b shadow-sm" style={{ borderBottomColor: theme.border }}>
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            {clienteData?.logo && (
              <img src={clienteData.logo || "/placeholder.svg"} alt="Logo" className="h-8 w-auto" />
            )}
            <h1 className="text-xl font-semibold" style={{ color: theme.primary }}>
              {clienteData?.cliente?.clubName || "Portal del Cliente"}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <Badge
              variant="secondary"
              style={{
                backgroundColor: theme.secondary,
                color: theme.text,
              }}
            >
              {clienteData?.tipoUsuario === "staff" ? "Staff" : "Cliente"}
            </Badge>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      {user?.fotoPerfil ? (
                        <AvatarImage src={user.fotoPerfil || "/placeholder.svg"} alt={user.email} />
                      ) : (
                        <AvatarFallback style={{ backgroundColor: theme.primary, color: theme.background }}>
                          {getInitials()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configuración</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: theme.primary }}>
                Portal del {clienteData?.tipoUsuario === "staff" ? "Staff" : "Cliente"}
              </h1>
              <p style={{ color: theme.text, opacity: 0.7 }}>Bienvenido de vuelta, {getUserDisplayName()}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge
                variant="secondary"
                style={{
                  backgroundColor: theme.accent,
                  color: theme.text,
                }}
              >
                {clienteData?.cliente?.clubName || "Sin cliente asignado"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Horarios de Hoy */}
          <Card style={{ borderColor: theme.border }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: theme.text }}>
                Horarios de Hoy
              </CardTitle>
              <Clock className="h-4 w-4" style={{ color: theme.primary }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: theme.primary }}>
                3
              </div>
              <p className="text-xs" style={{ color: theme.text, opacity: 0.7 }}>
                turnos programados
              </p>
              <Button
                className="w-full mt-4"
                variant="outline"
                style={{
                  borderColor: theme.border,
                  color: theme.primary,
                }}
              >
                Ver Horarios
              </Button>
            </CardContent>
          </Card>

          {/* Próximos Turnos */}
          <Card style={{ borderColor: theme.border }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: theme.text }}>
                Próximos Turnos
              </CardTitle>
              <Calendar className="h-4 w-4" style={{ color: theme.primary }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: theme.primary }}>
                12
              </div>
              <p className="text-xs" style={{ color: theme.text, opacity: 0.7 }}>
                esta semana
              </p>
              <Button
                className="w-full mt-4"
                variant="outline"
                style={{
                  borderColor: theme.border,
                  color: theme.primary,
                }}
              >
                Ver Calendario
              </Button>
            </CardContent>
          </Card>

          {/* Ubicaciones */}
          <Card style={{ borderColor: theme.border }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: theme.text }}>
                Ubicaciones
              </CardTitle>
              <MapPin className="h-4 w-4" style={{ color: theme.primary }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: theme.primary }}>
                5
              </div>
              <p className="text-xs" style={{ color: theme.text, opacity: 0.7 }}>
                ubicaciones asignadas
              </p>
              <Button
                className="w-full mt-4"
                variant="outline"
                style={{
                  borderColor: theme.border,
                  color: theme.primary,
                }}
              >
                Ver Ubicaciones
              </Button>
            </CardContent>
          </Card>

          {/* Tareas Pendientes */}
          <Card className="md:col-span-2 lg:col-span-3" style={{ borderColor: theme.border }}>
            <CardHeader>
              <CardTitle style={{ color: theme.primary }}>Tareas y Actividades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div
                  className="flex items-center justify-between p-3 border rounded-lg"
                  style={{ borderColor: theme.border }}
                >
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium" style={{ color: theme.text }}>
                        Turno matutino completado
                      </p>
                      <p className="text-sm" style={{ color: theme.text, opacity: 0.7 }}>
                        Sucursal Centro - 08:00 a 14:00
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: theme.accent,
                      color: theme.text,
                    }}
                  >
                    Completado
                  </Badge>
                </div>

                <div
                  className="flex items-center justify-between p-3 border rounded-lg"
                  style={{ borderColor: theme.border }}
                >
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="font-medium" style={{ color: theme.text }}>
                        Turno vespertino pendiente
                      </p>
                      <p className="text-sm" style={{ color: theme.text, opacity: 0.7 }}>
                        Sucursal Norte - 15:00 a 21:00
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                  >
                    Pendiente
                  </Badge>
                </div>

                <div
                  className="flex items-center justify-between p-3 border rounded-lg"
                  style={{ borderColor: theme.border }}
                >
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5" style={{ color: theme.primary }} />
                    <div>
                      <p className="font-medium" style={{ color: theme.text }}>
                        Reunión de equipo
                      </p>
                      <p className="text-sm" style={{ color: theme.text, opacity: 0.7 }}>
                        Mañana - 10:00 a 11:00
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: theme.border,
                      color: theme.text,
                    }}
                  >
                    Programado
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
