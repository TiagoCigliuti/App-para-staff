"use client"

import { useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
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
import { LogOut, Settings, User } from "lucide-react"

export default function StaffHeader() {
  const { user, clienteData, signOut } = useAuth()
  const router = useRouter()
  const [equipoNombre, setEquipoNombre] = useState<string | null>(null)
  const [escudoEquipo, setEscudoEquipo] = useState<string | null>(null)

  useEffect(() => {
    const fetchClientData = async () => {
      console.log("=== STAFF HEADER DEBUG ===")
      console.log("User:", user)
      console.log("ClienteData:", clienteData)

      if (!user?.clientId && !clienteData?.clienteId) {
        console.log("No clientId found")
        return
      }

      try {
        // Intentar con clientId del usuario o del clienteData
        const clientId = user?.clientId || clienteData?.clienteId
        console.log("Using clientId:", clientId)

        const clientRef = doc(db, "clients", clientId)
        const clientSnap = await getDoc(clientRef)

        if (clientSnap.exists()) {
          const data = clientSnap.data()
          console.log("Client data found:", data)

          setEquipoNombre(data.clubName || "Equipo sin nombre")
          setEscudoEquipo(data.logo || null)

          console.log("Equipo nombre:", data.clubName)
          console.log("Escudo equipo:", data.logo)
        } else {
          console.log("No client document found")

          // Fallback: usar datos del clienteData si están disponibles
          if (clienteData) {
            setEquipoNombre(clienteData.cliente?.clubName || "Equipo sin nombre")
            setEscudoEquipo(clienteData.logo || null)
            console.log("Using fallback from clienteData")
          }
        }
      } catch (error) {
        console.error("Error fetching client data:", error)
      }
    }

    fetchClientData()
  }, [user, clienteData])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleEditProfile = () => {
    router.push("/staff/perfil")
  }

  const getInitials = () => {
    if (user?.nombre && user?.apellido) {
      return `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`.toUpperCase()
    } else if (user?.nombre) {
      return user.nombre.charAt(0).toUpperCase()
    } else if (user) {
      return user.email.charAt(0).toUpperCase()
    }
    return "GM"
  }

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
    <header className="flex justify-between items-center px-6 py-4 bg-[#002B5B] text-white shadow">
      {/* Escudo a la izquierda */}
      <div className="w-14 h-14 flex items-center">
        {escudoEquipo ? (
          <img
            src={escudoEquipo || "/placeholder.svg"}
            alt="Escudo del equipo"
            className="w-full h-full object-contain"
            onError={(e) => {
              console.error("Error loading shield image:", escudoEquipo)
              e.currentTarget.style.display = "none"
            }}
          />
        ) : (
          <div className="w-full h-full bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-xs text-white/60">Logo</span>
          </div>
        )}
      </div>

      {/* Título y nombre de equipo al centro */}
      <div className="text-center flex-1">
        <h1 className="text-2xl font-bold">Panel del Staff</h1>
        {equipoNombre && <p className="text-sm text-gray-300">{equipoNombre}</p>}
      </div>

      {/* Avatar a la derecha */}
      <div className="flex items-center justify-end w-14 h-14">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                {user?.fotoPerfil ? (
                  <AvatarImage src={user.fotoPerfil || "/placeholder.svg"} alt={user?.email || "Usuario"} />
                ) : (
                  <AvatarFallback className="bg-white text-black font-bold">{getInitials()}</AvatarFallback>
                )}
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                {equipoNombre && <p className="text-xs leading-none text-muted-foreground">{equipoNombre}</p>}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleEditProfile}>
              <User className="mr-2 h-4 w-4" />
              <span>Editar Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
