"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MapPin, Dumbbell, Users, Clock } from 'lucide-react'

export default function GestionTareasPage() {
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/staff/entrenamientos")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Entrenamientos
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Tareas</h1>
          <p className="text-gray-600 mt-2">
            Administra las tareas de entrenamiento según el tipo de actividad
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Tareas de Campo */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-200">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl text-green-700">Tareas de Campo</CardTitle>
              <CardDescription className="text-sm">
                Gestiona entrenamientos al aire libre, ejercicios de campo y actividades deportivas
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-sm text-gray-600 space-y-2 mb-6">
                <li>• Entrenamientos tácticos</li>
                <li>• Ejercicios de resistencia</li>
                <li>• Práctica de habilidades</li>
                <li>• Juegos y competencias</li>
              </ul>
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => router.push("/staff/entrenamientos/gestion-tareas/campo")}
              >
                Gestionar Tareas de Campo
              </Button>
            </CardContent>
          </Card>

          {/* Tareas de Gimnasio */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-200">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Dumbbell className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl text-blue-700">Tareas de Gimnasio</CardTitle>
              <CardDescription className="text-sm">
                Administra entrenamientos de fuerza, acondicionamiento físico y rehabilitación
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="text-sm text-gray-600 space-y-2 mb-6">
                <li>• Entrenamiento de fuerza</li>
                <li>• Acondicionamiento físico</li>
                <li>• Ejercicios de rehabilitación</li>
                <li>• Rutinas personalizadas</li>
              </ul>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => router.push("/staff/entrenamientos/gestion-tareas/gimnasio")}
              >
                Gestionar Tareas de Gimnasio
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 text-gray-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">24</p>
              <p className="text-sm text-gray-600">Jugadores Activos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MapPin className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">12</p>
              <p className="text-sm text-gray-600">Tareas de Campo</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Dumbbell className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">8</p>
              <p className="text-sm text-gray-600">Tareas de Gimnasio</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">5</p>
              <p className="text-sm text-gray-600">Pendientes Hoy</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
