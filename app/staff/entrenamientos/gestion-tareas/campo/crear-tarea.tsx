"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Upload, LinkIcon, Save, Loader2, ChevronDown, AlertCircle } from 'lucide-react'
import { collection, addDoc, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebaseConfig"

interface CrearTareaFormProps {
  onBack: () => void
  tipoTarea: "campo" | "gimnasio"
}

export default function CrearTareaForm({ onBack, tipoTarea }: CrearTareaFormProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [clasificacionesSugeridas, setClasificacionesSugeridas] = useState<string[]>([])
  const [showClasificacionSuggestions, setShowClasificacionSuggestions] = useState(false)
  const [loadingClasificaciones, setLoadingClasificaciones] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [clienteId, setClienteId] = useState<string>("")
  const [loadingClienteId, setLoadingClienteId] = useState(true)
  
  const [formData, setFormData] = useState({
    nombre: "",
    clasificacion: "",
    objetivo: "",
    descripcion: "",
    linkTarea: ""
  })

  // Obtener clienteId del usuario staff
  useEffect(() => {
    const obtenerClienteId = async () => {
      if (!user) return

      setLoadingClienteId(true)
      try {
        // Buscar el usuario en la colección staff
        const staffRef = collection(db, "staff")
        const q = query(staffRef, where("email", "==", user.email))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          const staffData = querySnapshot.docs[0].data()
          const staffClienteId = staffData.clienteId
          setClienteId(staffClienteId)
          console.log("✅ ClienteId obtenido de staff:", staffClienteId)
        } else {
          // Si no se encuentra en staff, usar fallback
          const fallbackClienteId = user.email?.split('@')[0] || user.uid
          setClienteId(fallbackClienteId)
          console.log("⚠️ Usuario no encontrado en staff, usando fallback:", fallbackClienteId)
        }
      } catch (error) {
        console.error("❌ Error obteniendo clienteId:", error)
        // Usar fallback en caso de error
        const fallbackClienteId = user.email?.split('@')[0] || user.uid
        setClienteId(fallbackClienteId)
      } finally {
        setLoadingClienteId(false)
      }
    }

    obtenerClienteId()
  }, [user])

  // Cargar clasificaciones existentes del mismo clienteId
  useEffect(() => {
    const cargarClasificacionesExistentes = async () => {
      if (!user || !clienteId || loadingClienteId) return

      setLoadingClasificaciones(true)
      try {
        const tareasRef = collection(db, "tarea")
        const q = query(
          tareasRef, 
          where("clienteId", "==", clienteId),
          where("tipoTarea", "==", tipoTarea)
        )
        
        const querySnapshot = await getDocs(q)
        const clasificacionesUnicas = new Set<string>()
        
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.clasificacion && data.clasificacion.trim()) {
            clasificacionesUnicas.add(data.clasificacion.trim())
          }
        })
        
        setClasificacionesSugeridas(Array.from(clasificacionesUnicas).sort())
        console.log("✅ Clasificaciones cargadas:", Array.from(clasificacionesUnicas).length)
      } catch (error) {
        console.error("Error cargando clasificaciones:", error)
      } finally {
        setLoadingClasificaciones(false)
      }
    }

    cargarClasificacionesExistentes()
  }, [user, tipoTarea, clienteId, loadingClienteId])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleClasificacionChange = (value: string) => {
    handleInputChange("clasificacion", value)
    setShowClasificacionSuggestions(false)
  }

  const handleClasificacionInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    handleInputChange("clasificacion", value)
    setShowClasificacionSuggestions(value.length > 0 && clasificacionesSugeridas.length > 0)
  }

  const filteredClasificaciones = clasificacionesSugeridas.filter(clasificacion =>
    clasificacion.toLowerCase().includes(formData.clasificacion.toLowerCase())
  )

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tamaño del archivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("El archivo es demasiado grande. Máximo 5MB.")
        return
      }

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setUploadError("Solo se permiten archivos de imagen.")
        return
      }

      setUploadError(null)
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    try {
      const timestamp = Date.now()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `tareas/${tipoTarea}/${timestamp}_${sanitizedFileName}`
      const storageRef = ref(storage, fileName)
      
      console.log("Subiendo archivo a:", fileName)
      const snapshot = await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)
      
      console.log("Archivo subido exitosamente:", downloadURL)
      return downloadURL
    } catch (error) {
      console.error("Error detallado al subir imagen:", error)
      throw new Error(`Error al subir imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      alert("Usuario no autenticado")
      return
    }

    if (!clienteId) {
      alert("Error: No se pudo obtener el clienteId del usuario")
      return
    }

    if (!formData.nombre || !formData.clasificacion || !formData.objetivo) {
      alert("Por favor completa todos los campos requeridos")
      return
    }

    setLoading(true)
    setUploadError(null)

    try {
      let imagenUrl = ""
      
      // Subir imagen si existe
      if (imageFile) {
        try {
          imagenUrl = await uploadImage(imageFile)
        } catch (error) {
          console.error("Error subiendo imagen:", error)
          setUploadError(error instanceof Error ? error.message : "Error al subir la imagen")
          
          // Ofrecer la opción de continuar sin imagen
          const continueWithoutImage = confirm(
            "Error al subir la imagen. ¿Deseas crear la tarea sin imagen?"
          )
          
          if (!continueWithoutImage) {
            setLoading(false)
            return
          }
          
          // Continuar sin imagen
          imagenUrl = ""
        }
      }

      // Preparar datos para Firestore
      const tareaData = {
        nombre: formData.nombre,
        clasificacion: formData.clasificacion.trim(),
        objetivo: formData.objetivo.trim(),
        descripcion: formData.descripcion || "",
        linkTarea: formData.linkTarea || "",
        imagenUrl: imagenUrl,
        tipoTarea: tipoTarea,
        creadoPor: user.uid,
        creadoPorEmail: user.email,
        clienteId: clienteId, // Usar el clienteId obtenido de la colección staff
        fechaCreacion: new Date(),
        estado: "activa"
      }

      // Guardar en Firestore
      const tareasRef = collection(db, "tarea")
      const docRef = await addDoc(tareasRef, tareaData)

      console.log("Tarea creada con ID:", docRef.id)
      console.log("ClienteId usado:", clienteId)
      alert("Tarea creada exitosamente")
      
      // Limpiar formulario
      setFormData({
        nombre: "",
        clasificacion: "",
        objetivo: "",
        descripcion: "",
        linkTarea: ""
      })
      setImageFile(null)
      setImagePreview(null)
      
      // Volver a la página anterior
      onBack()

    } catch (error) {
      console.error("Error creando tarea:", error)
      alert("Error al crear la tarea. Por favor intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  // Mostrar loading mientras se obtiene el clienteId
  if (loadingClienteId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando información del usuario...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Tareas de {tipoTarea === "campo" ? "Campo" : "Gimnasio"}
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Crear Nueva Tarea de {tipoTarea === "campo" ? "Campo" : "Gimnasio"}
            </h1>
            <p className="text-gray-600 mt-2">
              Completa la información para crear una nueva tarea de entrenamiento
            </p>
            {clienteId && (
              <p className="text-sm text-gray-500 mt-1">
                Cliente: {clienteId}
              </p>
            )}
          </div>
        </div>

        {/* Storage Error Alert */}
        {uploadError && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Error de subida:</span>
              </div>
              <p className="text-sm text-red-600 mt-1">{uploadError}</p>
              <p className="text-xs text-red-500 mt-2">
                Si el problema persiste, verifica que las reglas de Firebase Storage estén configuradas correctamente.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Tarea</CardTitle>
            <CardDescription>
              Los campos marcados con * son obligatorios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nombre de la tarea */}
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la Tarea *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange("nombre", e.target.value)}
                  placeholder="Ej: Ejercicio de pases cortos"
                  required
                  disabled={loading}
                />
              </div>

              {/* Clasificación con sugerencias */}
              <div className="space-y-2">
                <Label htmlFor="clasificacion">Clasificación *</Label>
                <div className="relative">
                  <Input
                    id="clasificacion"
                    value={formData.clasificacion}
                    onChange={handleClasificacionInputChange}
                    onFocus={() => setShowClasificacionSuggestions(clasificacionesSugeridas.length > 0)}
                    placeholder="Ej: Entrenamiento Táctico, Ejercicios de Resistencia..."
                    required
                    disabled={loading}
                  />
                  
                  {/* Sugerencias de clasificación */}
                  {showClasificacionSuggestions && filteredClasificaciones.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {loadingClasificaciones ? (
                        <div className="p-3 text-center text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                          Cargando sugerencias...
                        </div>
                      ) : (
                        <>
                          <div className="p-2 text-xs text-gray-500 border-b">
                            Clasificaciones usadas anteriormente:
                          </div>
                          {filteredClasificaciones.map((clasificacion, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full text-left p-2 hover:bg-gray-50 text-sm"
                              onClick={() => handleClasificacionChange(clasificacion)}
                            >
                              {clasificacion}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                  
                  {clasificacionesSugeridas.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setShowClasificacionSuggestions(!showClasificacionSuggestions)}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                {clasificacionesSugeridas.length === 0 && !loadingClasificaciones && (
                  <p className="text-xs text-gray-500">
                    Escribe una clasificación personalizada. Las clasificaciones que uses aparecerán como sugerencias en el futuro.
                  </p>
                )}
              </div>

              {/* Objetivo */}
              <div className="space-y-2">
                <Label htmlFor="objetivo">Objetivo *</Label>
                <Input
                  id="objetivo"
                  value={formData.objetivo}
                  onChange={(e) => handleInputChange("objetivo", e.target.value)}
                  placeholder="Ej: Mejorar precisión en pases, Aumentar resistencia cardiovascular..."
                  required
                  disabled={loading}
                />
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción (Opcional)</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => handleInputChange("descripcion", e.target.value)}
                  placeholder="Describe los detalles de la tarea, instrucciones específicas, etc."
                  rows={4}
                  disabled={loading}
                />
              </div>

              {/* Imagen de la tarea */}
              <div className="space-y-2">
                <Label htmlFor="imagen">Imagen de la Tarea (Opcional)</Label>
                <div className="flex items-center space-x-4">
                  <Input
                    id="imagen"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("imagen")?.click()}
                    disabled={loading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir Imagen
                  </Button>
                  {imageFile && (
                    <span className="text-sm text-gray-600">
                      {imageFile.name}
                    </span>
                  )}
                </div>
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview || "/placeholder.svg"}
                      alt="Preview"
                      className="max-w-xs h-32 object-cover rounded-lg border"
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Máximo 5MB. Formatos: JPG, PNG, GIF, WebP
                </p>
              </div>

              {/* Link de la tarea */}
              <div className="space-y-2">
                <Label htmlFor="linkTarea">Link de la Tarea (Opcional)</Label>
                <div className="flex">
                  <div className="flex items-center px-3 bg-gray-50 border border-r-0 rounded-l-md">
                    <LinkIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    id="linkTarea"
                    type="url"
                    value={formData.linkTarea}
                    onChange={(e) => handleInputChange("linkTarea", e.target.value)}
                    placeholder="https://ejemplo.com/video-ejercicio"
                    className="rounded-l-none"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Crear Tarea
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
