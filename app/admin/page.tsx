"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebaseConfig"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Users, UserCheck, Palette, Activity, Building2, BarChart3, LogOut, User, ListChecks } from 'lucide-react'

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeClients: 0,
    availableThemes: 0,
    todaySessions: 1, // Mostrar al menos 1 para indicar que el admin está conectado
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    // Simular carga de estadísticas básicas sin consultar Firestore
    if (user) {
      // Por ahora usamos valores estáticos para evitar errores de permisos
      // Más adelante se pueden conectar con APIs o reglas de Firestore apropiadas
      setStats({
        totalUsers: 5, // Valor ejemplo
        activeClients: 3, // Valor ejemplo
        availableThemes: 2, // Valor ejemplo
        todaySessions: 1, // Usuario actual conectado
      })
    }
  }, [user])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const getUserInitials = () => {
    if (user.displayName) {
      const names = user.displayName.trim().split(" ")
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      }
      return names[0][0]?.toUpperCase() || "U"
    }
    return user.email?.[0]?.toUpperCase() || "U"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel de Administrador</h1>
              <p className="text-gray-600 mt-1">Gestiona usuarios, clientes y configuraciones del sistema</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Administrador</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
                    {getUserInitials()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user.displayName || "Usuario"}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleNavigation("/admin/perfil")}>
                    <User className="w-4 h-4 mr-2" />
                    Editar Perfil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Usuarios */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
                <p className="text-xs text-gray-500 mt-1">+0 en el último mes</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Clientes Activos */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clientes Activos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeClients}</p>
                <p className="text-xs text-gray-500 mt-1">+0 este mes</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Temas Disponibles */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Temas Disponibles</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.availableThemes}</p>
                <p className="text-xs text-gray-500 mt-1">Sin temas personalizados</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <Palette className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Sesiones Hoy */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sesiones Hoy</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.todaySessions}</p>
                <p className="text-xs text-gray-500 mt-1">+0% vs ayer</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Management Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Gestión de clientes */}
          <div className="bg-white rounded-xl border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Gestión de clientes</h3>
              <p className="text-gray-600 text-sm mb-6">Administrar clientes y sus configuraciones</p>
              <button
                onClick={() => handleNavigation("/clientes")}
                className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Acceder
              </button>
            </div>
          </div>

          {/* Gestión de usuarios */}
          <div className="bg-white rounded-xl border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserCheck className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Gestión de usuarios</h3>
              <p className="text-gray-600 text-sm mb-6">Administrar usuarios del sistema</p>
              <button
                onClick={() => handleNavigation("/admin/usuarios")}
                className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Acceder
              </button>
            </div>
          </div>

          {/* Gestión de temas */}
          <div className="bg-white rounded-xl border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Palette className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Gestión de temas</h3>
              <p className="text-gray-600 text-sm mb-6">Crear y editar temas personalizados</p>
              <button
                onClick={() => handleNavigation("/admin/temas")}
                className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Acceder
              </button>
            </div>
          </div>

          {/*
            Usuarios para cuestionarios
          */}
          <div className="bg-white rounded-xl border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ListChecks className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Usuarios para cuestionarios</h3>
              <p className="text-gray-600 text-sm mb-6">Gestionar usuarios que recibirán y completarán cuestionarios</p>
              <button
                onClick={() => handleNavigation("/admin/usuarios-cuestionarios")}
                className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Acceder
              </button>
            </div>
          </div>

          {/* Reportes */}
          <div className="bg-white rounded-xl border border-gray-200 p-8 hover:shadow-lg transition-all duration-200 cursor-pointer md:col-span-2 lg:col-span-1">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Reportes</h3>
              <p className="text-gray-600 text-sm mb-6">Análisis y reportes del sistema</p>
              <button
                onClick={() => handleNavigation("/admin/reportes")}
                className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Acceder
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
