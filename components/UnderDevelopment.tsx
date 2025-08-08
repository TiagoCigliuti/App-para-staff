"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Construction, Wrench } from "lucide-react"

interface UnderDevelopmentProps {
  title?: string
  description?: string
  backUrl?: string
}

export default function UnderDevelopment({
  title = "Sección en Desarrollo",
  description = "Esta funcionalidad está siendo desarrollada y estará disponible próximamente.",
  backUrl,
}: UnderDevelopmentProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl)
    } else {
      router.back()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Button variant="ghost" onClick={handleBack} className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="text-gray-600 mt-1">Funcionalidad en construcción</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="text-center">
          <CardContent className="py-16">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <Construction className="w-24 h-24 text-orange-400" />
                <Wrench className="w-8 h-8 text-gray-600 absolute -bottom-2 -right-2 animate-bounce" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">{description}</p>

            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-center justify-center space-x-2 text-orange-800">
                  <Construction className="w-5 h-5" />
                  <span className="font-medium">En construcción</span>
                </div>
                <p className="text-sm text-orange-700 mt-2">
                  Nuestro equipo está trabajando para traerte esta funcionalidad pronto.
                </p>
              </div>

              <div className="flex justify-center space-x-4 pt-4">
                <Button onClick={handleBack} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver Atrás
                </Button>
                <Button onClick={() => router.push("/admin")} className="bg-purple-600 hover:bg-purple-700">
                  Ir al Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
