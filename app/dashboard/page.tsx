"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Building, Palette, Shield, AlertTriangle } from "lucide-react"
import ThemeCustomizer from "@/components/theme/ThemeCustomizer"
import { useTheme } from "@/components/theme/ThemeProvider"
import SetupProfile from "@/components/profile/SetupProfile"

export default function DashboardPage() {
  const { user, clienteData, loading } = useAuth()
  const { theme } = useTheme()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No estás autenticado</p>
      </div>
    )
  }

  // Si el usuario no tiene perfil completo, mostrar pantalla de configuración
  if (clienteData?.perfilIncompleto) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Completar Perfil</h1>
          <p className="text-gray-600">Bienvenido, {user.email}. Por favor completa tu perfil para continuar.</p>
        </div>

        <SetupProfile />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Bienvenido de vuelta, {user.email}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* User Info Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Información del Usuario</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Email:</strong> {user.email}
              </p>
              <p className="text-sm">
                <strong>ID:</strong> {user.id}
              </p>
              <Badge variant={clienteData?.esAdmin ? "default" : "secondary"}>
                {clienteData?.esAdmin ? "Administrador" : "Usuario"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Client Info Card */}
        {clienteData?.cliente ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Información del Cliente</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Nombre:</strong> {clienteData.cliente.name}
                </p>
                <p className="text-sm">
                  <strong>ID:</strong> {clienteData.cliente.id}
                </p>
                {clienteData.logo && (
                  <div className="mt-2">
                    <img src={clienteData.logo || "/placeholder.svg"} alt="Logo del cliente" className="h-12 w-auto" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Información del Cliente</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                No tienes un cliente asignado. Contacta con un administrador para que te asigne a un cliente.
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {/* Theme Info Card */}
        {clienteData?.tema ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tema Aplicado</CardTitle>
              <Palette className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(clienteData.tema).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: value as string }}></div>
                      <span className="text-xs capitalize">{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tema Aplicado</CardTitle>
              <Palette className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Usando tema por defecto. El tema se cargará cuando se asigne un cliente.
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {/* Admin Features Card */}
        {clienteData?.esAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Funciones de Administrador</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Tienes acceso completo a todas las funciones administrativas del sistema.
              </CardDescription>
            </CardContent>
          </Card>
        )}

        {/* Theme Customizer Card */}
        <div className="md:col-span-2 lg:col-span-3">
          <ThemeCustomizer />
        </div>
      </div>
    </div>
  )
}
