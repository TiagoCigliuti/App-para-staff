"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth/AuthProvider"
import { LogOut, Settings, User, Shield } from "lucide-react"
import { useTheme } from "@/components/theme/ThemeProvider"
import { useEffect } from "react"

export default function Header() {
  const { user, clienteData, signOut } = useAuth()
  const { theme } = useTheme()

  // Debug: Log user data when it changes
  useEffect(() => {
    console.log("=== HEADER DEBUG ===")
    console.log("User:", user)
    console.log("ClienteData:", clienteData)
    console.log("User equipoNombre:", user?.equipoNombre)
    console.log("User escudoEquipo:", user?.escudoEquipo)
    console.log("Es Admin:", clienteData?.esAdmin)
    console.log("==================")
  }, [user, clienteData])

  if (!user) {
    console.log("Header: No user, returning null")
    return null
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const themeStyles = {
    backgroundColor: theme.primary,
    color: theme.background,
    borderBottomColor: theme.border,
  }

  return (
    <div className="w-full">
      {/* DEBUG PANEL - TEMPORAL */}
      <div className="bg-red-500 text-white p-2 text-xs">
        <strong>DEBUG HEADER:</strong> User ID: {user?.id || "NO ID"} | Email: {user?.email || "NO EMAIL"} | Equipo:{" "}
        {user?.equipoNombre || "NO EQUIPO"} | Escudo: {user?.escudoEquipo ? "SÍ" : "NO"} | Admin:{" "}
        {clienteData?.esAdmin ? "SÍ" : "NO"}
      </div>

      <header className="border-b shadow-sm" style={themeStyles}>
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            {/* Logo del cliente */}
            {clienteData?.logo && (
              <img src={clienteData.logo || "/placeholder.svg"} alt="Logo" className="h-8 w-auto" />
            )}

            {/* Escudo del equipo (solo para staff) */}
            {!clienteData?.esAdmin && user?.escudoEquipo && (
              <div className="flex items-center space-x-2">
                <img
                  src={user.escudoEquipo || "/placeholder.svg"}
                  alt="Escudo del Equipo"
                  className="h-8 w-8 rounded-full object-cover border-2 border-white shadow-sm"
                  onError={(e) => {
                    console.error("Error loading shield image:", user.escudoEquipo)
                    e.currentTarget.style.display = "none"
                  }}
                />
              </div>
            )}

            {/* Icono de escudo si no hay imagen pero hay equipo */}
            {!clienteData?.esAdmin && user?.equipoNombre && !user?.escudoEquipo && (
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/20 border-2 border-white shadow-sm">
                <Shield className="h-4 w-4 text-white" />
              </div>
            )}

            <h1 className="text-xl font-semibold">
              {clienteData?.esAdmin ? "Panel de Administración" : clienteData?.cliente?.name || "Staff App"}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.fotoPerfil || "/placeholder.svg"} alt={user.email} />
                    <AvatarFallback>{user.email.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {clienteData?.esAdmin ? "Administrador" : "Usuario"}
                    </p>
                    {user.equipoNombre && (
                      <p className="text-xs leading-none text-muted-foreground mt-1">Equipo: {user.equipoNombre}</p>
                    )}
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
          </div>
        </div>
      </header>
    </div>
  )
}
