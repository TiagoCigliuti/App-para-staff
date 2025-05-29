"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Construction, ArrowLeft, Clock, Lightbulb } from "lucide-react"
import { useRouter } from "next/navigation"

interface EnDesarrolloProps {
  titulo?: string
  descripcion?: string
  caracteristicas?: string[]
  fechaEstimada?: string
  mostrarBotonVolver?: boolean
  rutaVolver?: string
}

export default function EnDesarrollo({
  titulo = "Sección en desarrollo",
  descripcion = "Estamos trabajando para habilitar esta funcionalidad.",
  caracteristicas = [],
  fechaEstimada,
  mostrarBotonVolver = true,
  rutaVolver = "/admin",
}: EnDesarrolloProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-orange-100 rounded-full">
              <Construction className="h-12 w-12 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">🔧 {titulo}</CardTitle>
          <CardDescription className="text-lg">{descripcion}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Fecha estimada */}
          {fechaEstimada && (
            <div className="flex items-center justify-center">
              <Badge variant="outline" className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Disponible aproximadamente: {fechaEstimada}
              </Badge>
            </div>
          )}

          {/* Características próximas */}
          {caracteristicas.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Funcionalidades que incluirá:
              </h3>
              <ul className="space-y-2">
                {caracteristicas.map((caracteristica, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    {caracteristica}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mensaje de progreso */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 animate-pulse"></div>
              <div>
                <p className="font-medium text-blue-900">Desarrollo en progreso</p>
                <p className="text-sm text-blue-700">
                  Nuestro equipo está trabajando activamente en esta funcionalidad. Te notificaremos cuando esté
                  disponible.
                </p>
              </div>
            </div>
          </div>

          {/* Botón de volver */}
          {mostrarBotonVolver && (
            <div className="flex justify-center pt-4">
              <Button onClick={() => router.push(rutaVolver)} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
