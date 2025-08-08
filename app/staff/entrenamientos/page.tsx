"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, CheckSquare, ArrowLeft } from 'lucide-react'

export default function EntrenamientosPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

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

  const handlePlanificarSesion = () => {
    router.push("/staff/entrenamientos/planificar-sesion")
  }

  const handleGestionTareas = () => {
    router.push("/staff/entrenamientos/gestion-tareas")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/staff")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Entrenamientos</h1>
          <p className="text-gray-600 mt-2">
            Selecciona una opción para gestionar los entrenamientos del equipo
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Planificar Sesión */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handlePlanificarSesion}>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Planificar Sesión</CardTitle>
                  <CardDescription>
                    Crea y programa sesiones de entrenamiento
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Planifica sesiones de entrenamiento, define ejercicios, duraciones y objetivos específicos para cada sesión.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Crear nuevas sesiones</li>
                <li>• Asignar ejercicios y rutinas</li>
                <li>• Establecer objetivos</li>
                <li>• Programar fechas y horarios</li>
              </ul>
            </CardContent>
          </Card>

          {/* Gestión de Tareas */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleGestionTareas}>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckSquare className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Gestión de Tareas</CardTitle>
                  <CardDescription>
                    Administra tareas y seguimiento de entrenamientos
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Gestiona tareas relacionadas con entrenamientos, haz seguimiento del progreso y administra asignaciones.
              </p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Asignar tareas a jugadores</li>
                <li>• Seguimiento de progreso</li>
                <li>• Revisar completitud</li>
                <li>• Generar reportes</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats or Additional Info */}
        <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Información Rápida</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600">Sesiones Programadas</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">Tareas Pendientes</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">0</div>
              <div className="text-sm text-gray-600">Entrenamientos Hoy</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
