"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MapPin, Dumbbell, User, ChevronRight } from 'lucide-react'

export default function PlanificarSesionPage() {
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

  const sessionTypes = [
    {
      id: "campo",
      title: "Sesión de Campo",
      description: "Entrenamientos al aire libre con ejercicios técnicos y tácticos",
      icon: MapPin,
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600",
      features: [
        "Ejercicios técnicos específicos",
        "Trabajo táctico grupal",
        "Acondicionamiento físico",
        "Práctica de jugadas"
      ],
      route: "/staff/entrenamientos/planificar-sesion/campo"
    },
    {
      id: "gimnasio",
      title: "Sesión de Gimnasio",
      description: "Entrenamientos en instalaciones enfocados en fuerza y acondicionamiento",
      icon: Dumbbell,
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600",
      features: [
        "Entrenamiento de fuerza",
        "Acondicionamiento físico",
        "Trabajo de resistencia",
        "Ejercicios específicos"
      ],
      route: "/staff/entrenamientos/planificar-sesion/gimnasio"
    },
    {
      id: "individualizada",
      title: "Sesión Individualizada",
      description: "Entrenamientos personalizados adaptados a cada jugador",
      icon: User,
      color: "bg-purple-500",
      hoverColor: "hover:bg-purple-600",
      features: [
        "Planes personalizados",
        "Objetivos específicos",
        "Seguimiento individual",
        "Adaptación por posición"
      ],
      route: "/staff/entrenamientos/planificar-sesion/individualizada"
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
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
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Planificar Sesión</h1>
            <p className="text-gray-600 mt-2">
              Selecciona el tipo de sesión de entrenamiento que deseas planificar
            </p>
          </div>
        </div>

        {/* Session Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessionTypes.map((sessionType) => {
            const IconComponent = sessionType.icon
            
            return (
              <Card 
                key={sessionType.id}
                className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
                onClick={() => router.push(sessionType.route)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg ${sessionType.color} text-white`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                  
                  <CardTitle className="text-xl font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                    {sessionType.title}
                  </CardTitle>
                  
                  <CardDescription className="text-gray-600">
                    {sessionType.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Características:</h4>
                    <ul className="space-y-1">
                      {sessionType.features.map((feature, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-center">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button 
                    className={`w-full mt-6 ${sessionType.color} ${sessionType.hoverColor} text-white`}
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(sessionType.route)
                    }}
                  >
                    Planificar {sessionType.title}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            💡 Consejos para la Planificación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-1">Sesiones de Campo:</h4>
              <p>Ideales para trabajo técnico-táctico y preparación específica para competencias.</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Sesiones de Gimnasio:</h4>
              <p>Perfectas para desarrollo de fuerza, potencia y acondicionamiento físico general.</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Sesiones Individualizadas:</h4>
              <p>Permiten adaptar el entrenamiento a las necesidades específicas de cada jugador.</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Planificación Integral:</h4>
              <p>Combina diferentes tipos de sesiones para un desarrollo completo del equipo.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
