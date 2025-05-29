"use client"

import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Tema {
  id: string
  name: string
  colors: {
    [key: string]: string
  }
  createdAt: string
  updatedAt: string
}

export default function SimpleGestionTemas() {
  const [temas, setTemas] = useState<Tema[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchTemas = async () => {
      try {
        const snapshot = await getDocs(collection(db, "themes"))
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Tema[]
        setTemas(data)
      } catch (error) {
        console.error("Error al cargar temas:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchTemas()
  }, [])

  if (loading) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando temas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Temas</h1>
        <button
          onClick={() => router.push("/admin/temas/nuevo")}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
        >
          + Crear Nuevo Tema
        </button>
      </div>

      {temas.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="text-gray-600 text-lg">No hay temas aún.</p>
          <p className="text-gray-500 text-sm mt-2">Comienza creando tu primer tema personalizado</p>
          <button
            onClick={() => router.push("/admin/temas/nuevo")}
            className="mt-4 bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 transition-colors"
          >
            Crear Primer Tema
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {temas.map((tema) => (
            <div key={tema.id} className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-semibold text-xl text-gray-900">{tema.name}</div>
                  <p className="text-sm text-gray-500 mt-1">ID: {tema.id}</p>
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                    Editar
                  </button>
                  <button className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                    Eliminar
                  </button>
                </div>
              </div>

              {/* Paleta de colores */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Paleta de colores:</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {tema.colors &&
                    Object.entries(tema.colors).map(([key, color]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-gray-200 shadow-sm"
                          style={{ backgroundColor: color }}
                          title={`${key}: ${color}`}
                        />
                        <span className="text-xs text-gray-600 capitalize">{key}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Vista previa */}
              {tema.colors && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Vista previa:</p>
                  <div
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: tema.colors.background || "#ffffff",
                      color: tema.colors.text || "#000000",
                      borderColor: tema.colors.border || "#e5e7eb",
                    }}
                  >
                    <h3 className="font-semibold text-lg mb-2" style={{ color: tema.colors.primary || "#000000" }}>
                      Ejemplo de Título
                    </h3>
                    <p className="mb-3">Este es un ejemplo de cómo se vería el texto con este tema aplicado.</p>
                    <div className="flex space-x-2">
                      <span
                        className="px-3 py-1 rounded text-sm font-medium"
                        style={{
                          backgroundColor: tema.colors.primary || "#000000",
                          color: tema.colors.background || "#ffffff",
                        }}
                      >
                        Botón Primario
                      </span>
                      <span
                        className="px-3 py-1 rounded text-sm font-medium"
                        style={{
                          backgroundColor: tema.colors.accent || "#cccccc",
                          color: tema.colors.text || "#000000",
                        }}
                      >
                        Acento
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Información de fechas */}
              <div className="flex justify-between text-sm text-gray-500 border-t pt-3">
                <span>Creado: {new Date(tema.createdAt || tema.updatedAt).toLocaleDateString()}</span>
                <span>Actualizado: {new Date(tema.updatedAt || tema.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
