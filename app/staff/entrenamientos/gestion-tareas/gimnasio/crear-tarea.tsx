"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Upload, X, ChevronDown, ChevronUp } from 'lucide-react'
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebaseConfig"

interface CrearTareaGimnasioFormProps {
  onBack: () => void
}

const gruposMusculares = [
  "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps",
  "Piernas", "Cuádriceps", "Isquiotibiales", "Glúteos", "Pantorrillas",
  "Abdominales", "Core", "Cuerpo completo", "Cardio"
]

const clasificacionesSugeridas = [
  "Fuerza", "Resistencia", "Potencia", "Hipertrofia", "Funcional",
  "Cardio", "Flexibilidad", "Rehabilitación", "Técnica"
]

export default function CrearTareaGimnasioForm({ onBack }: CrearTareaGimnasioFormProps) {
  const { user } = useAuth()
  const [clienteId, setClienteId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [showGruposMusculares, setShowGruposMusculares] = useState(false)
  
  const [ejercicioData, setEjercicioData] = useState({
    nombre: "",
    clasificacion: "",
    gruposMusculares: [] as string[],
    descripcion: "",
    linkTarea: ""
  })
  
  const [imagen, setImagen] = useState<File | null>(null)
  const [previewImagen, setPreviewImagen] = useState<string>("")

  // Obtener clienteId del usuario staff
  useEffect(() => {
    const obtenerClienteId = async () => {
      if (!user) return

      try {
        const staffRef = collection(db, "staff")
        const q = query(staffRef, where("email", "==", user.email))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          const staffData = querySnapshot.docs[0].data()
          setClienteId(staffData.clienteId)
        } else {
          const fallbackClienteId = user.email?.split('@')[0] || user.uid
          setClienteId(fallbackClienteId)
        }
      } catch (error) {
        console.error("Error obteniendo clienteId:", error)
        const fallbackClienteId = user.email?.split('@')[0] || user.uid
        setClienteId(fallbackClienteId)
      }
    }

    obtenerClienteId()
  }, [user])

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("La imagen debe ser menor a 5MB")
        return
      }
      
      setImagen(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewImagen(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleGrupoMuscularToggle = (grupo: string) => {
    setEjercicioData(prev => ({
      ...prev,
      gruposMusculares: prev.gruposMusculares.includes(grupo)
        ? prev.gruposMusculares.filter(g => g !== grupo)
        : [...prev.gruposMusculares, grupo]
    }))
  }

  const removeGrupoMuscular = (grupo: string) => {
    setEjercicioData(prev => ({
      ...prev,
      gruposMusculares: prev.gruposMusculares.filter(g => g !== grupo)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!ejercicioData.nombre.trim()) {
      alert("El nombre del ejercicio es obligatorio")
      return
    }
    
    if (!ejercicioData.clasificacion.trim()) {
      alert("La clasificación es obligatoria")
      return
    }
    
    if (ejercicioData.gruposMusculares.length === 0) {
      alert("Debe seleccionar al menos un grupo muscular")
      return
    }

    setLoading(true)
    
    try {
      let imagenUrl = ""
      
      // Subir imagen si existe
      if (imagen) {
        const imagenRef = ref(storage, `ejercicios/gimnasio/${Date.now()}_${imagen.name}`)
        const snapshot = await uploadBytes(imagenRef, imagen)
        imagenUrl = await getDownloadURL(snapshot.ref)
      }
      
      // Crear documento en Firestore
      const docData = {
        ...ejercicioData,
        clienteId,
        imagenUrl,
        fechaCreacion: serverTimestamp(),
        creadoPorEmail: user?.email || "unknown"
      }
      
      await addDoc(collection(db, "gimnasio"), docData)
      
      alert("Ejercicio creado exitosamente")
      onBack()
      
    } catch (error) {
      console.error("Error creando ejercicio:", error)
      alert("Error al crear el ejercicio")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Ejercicios de Gimnasio
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900">Crear Nuevo Ejercicio de Gimnasio</h1>
          <p className="text-gray-600 mt-2">
            Completa la información para crear un nuevo ejercicio de gimnasio
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información del Ejercicio</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nombre del Ejercicio */}
              <div>
                <Label htmlFor="nombre">Nombre del Ejercicio *</Label>
                <Input
                  id="nombre"
                  value={ejercicioData.nombre}
                  onChange={(e) => setEjercicioData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Press de banca con mancuernas"
                  required
                />
              </div>

              {/* Clasificación */}
              <div>
                <Label htmlFor="clasificacion">Clasificación *</Label>
                <Input
                  id="clasificacion"
                  value={ejercicioData.clasificacion}
                  onChange={(e) => setEjercicioData(prev => ({ ...prev, clasificacion: e.target.value }))}
                  placeholder="Ej: Fuerza, Hipertrofia, Cardio..."
                  list="clasificaciones"
                  required
                />
                <datalist id="clasificaciones">
                  {clasificacionesSugeridas.map((clasificacion) => (
                    <option key={clasificacion} value={clasificacion} />
                  ))}
                </datalist>
              </div>

              {/* Grupos Musculares */}
              <div>
                <Label>Grupos Musculares Involucrados *</Label>
                
                {/* Grupos seleccionados */}
                {ejercicioData.gruposMusculares.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 mb-3">
                    {ejercicioData.gruposMusculares.map((grupo) => (
                      <span
                        key={grupo}
                        className="inline-flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                      >
                        {grupo}
                        <button
                          type="button"
                          onClick={() => removeGrupoMuscular(grupo)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Botón para mostrar/ocultar opciones */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowGruposMusculares(!showGruposMusculares)}
                  className="w-full justify-between"
                >
                  <span>
                    {ejercicioData.gruposMusculares.length === 0 
                      ? "Seleccionar grupos musculares" 
                      : `${ejercicioData.gruposMusculares.length} grupo(s) seleccionado(s)`
                    }
                  </span>
                  {showGruposMusculares ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>

                {/* Lista de opciones */}
                {showGruposMusculares && (
                  <div className="mt-3 p-4 border rounded-lg bg-gray-50 max-h-60 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                      {gruposMusculares.map((grupo) => (
                        <label
                          key={grupo}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={ejercicioData.gruposMusculares.includes(grupo)}
                            onChange={() => handleGrupoMuscularToggle(grupo)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm">{grupo}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Descripción */}
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={ejercicioData.descripcion}
                  onChange={(e) => setEjercicioData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Describe la técnica, series, repeticiones, etc."
                  rows={4}
                />
              </div>

              {/* Imagen del Ejercicio */}
              <div>
                <Label htmlFor="imagen">Imagen del Ejercicio</Label>
                <div className="mt-2">
                  <input
                    id="imagen"
                    type="file"
                    accept="image/*"
                    onChange={handleImagenChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('imagen')?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {imagen ? "Cambiar imagen" : "Subir imagen"}
                  </Button>
                  
                  {previewImagen && (
                    <div className="mt-4">
                      <img
                        src={previewImagen || "/placeholder.svg"}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Link del Ejercicio */}
              <div>
                <Label htmlFor="linkTarea">Link del Ejercicio</Label>
                <Input
                  id="linkTarea"
                  type="url"
                  value={ejercicioData.linkTarea}
                  onChange={(e) => setEjercicioData(prev => ({ ...prev, linkTarea: e.target.value }))}
                  placeholder="https://ejemplo.com/video-ejercicio"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? "Creando..." : "Crear Ejercicio"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
