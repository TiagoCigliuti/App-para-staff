"use client"

import type React from "react"

import { useState } from "react"
import { db } from "@/lib/firebaseConfig"
import { collection, addDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"

interface Colors {
  primary: string
  secondary: string
  text: string
  background: string
  accent: string
  border: string
}

export default function SimpleCrearTema() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [colors, setColors] = useState<Colors>({
    primary: "#000000",
    secondary: "#ffffff",
    text: "#000000",
    background: "#ffffff",
    accent: "#000000",
    border: "#cccccc",
  })

  const handleChangeColor = (key: keyof Colors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (!name.trim()) {
        setError("El nombre del tema es requerido")
        return
      }

      await addDoc(collection(db, "themes"), {
        name: name.trim(),
        colors,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      router.push("/admin/temas")
    } catch (err: any) {
      console.error("Error al crear tema:", err)
      setError("Error al crear el tema. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white min-h-screen">
      <div className="mb-6">
        <button
          onClick={() => router.push("/admin/temas")}
          className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
        >
          ← Volver a Temas
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Crear Nuevo Tema</h1>
        <p className="text-gray-600 mt-2">Diseña un tema personalizado con colores únicos</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Formulario */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Configuración</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Tema</label>
              <input
                type="text"
                value={name}
                placeholder="Ej: Corporativo Azul"
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">Paleta de Colores</label>
              <div className="space-y-4">
                {Object.entries(colors).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <label className="font-medium capitalize">{key}</label>
                      <p className="text-sm text-gray-500">
                        {key === "primary" && "Color principal de la marca"}
                        {key === "secondary" && "Color secundario"}
                        {key === "text" && "Color del texto"}
                        {key === "background" && "Color de fondo"}
                        {key === "accent" && "Color de acento"}
                        {key === "border" && "Color de bordes"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={value}
                        onChange={(e) => handleChangeColor(key as keyof Colors, e.target.value)}
                        disabled={loading}
                        className="w-12 h-12 border rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleChangeColor(key as keyof Colors, e.target.value)}
                        disabled={loading}
                        className="w-20 p-1 text-xs border rounded"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">{error}</div>}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Guardando..." : "Guardar Tema"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/admin/temas")}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>

        {/* Vista Previa */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Vista Previa</h2>

          {/* Paleta de colores */}
          <div className="mb-6">
            <h3 className="font-medium mb-2">Paleta de Colores</h3>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(colors).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="w-full h-12 rounded border" style={{ backgroundColor: value }}></div>
                  <p className="text-xs mt-1 capitalize">{key}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ejemplo de aplicación */}
          <div className="mb-6">
            <h3 className="font-medium mb-2">Ejemplo de Aplicación</h3>
            <div
              className="p-4 rounded-lg border-2"
              style={{
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
              }}
            >
              <h4 className="text-lg font-semibold mb-2" style={{ color: colors.primary }}>
                {name || "Título del Tema"}
              </h4>
              <p className="mb-3">Este es un ejemplo de cómo se verá el texto con este tema.</p>
              <div className="flex space-x-2">
                <span
                  className="px-3 py-1 rounded text-sm"
                  style={{
                    backgroundColor: colors.primary,
                    color: colors.background,
                  }}
                >
                  Primario
                </span>
                <span
                  className="px-3 py-1 rounded text-sm"
                  style={{
                    backgroundColor: colors.accent,
                    color: colors.text,
                  }}
                >
                  Acento
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
