"use client"

import type React from "react"
import { auth } from "@/lib/firebaseConfig" // Import auth from firebaseConfig
import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, Plus, Building2, MoreVertical, Edit, Trash2, User, LogOut, Upload, X, Settings } from "lucide-react"
import { signOut } from "firebase/auth"

interface Cliente {
  id: string
  nombre: string
  club?: string
  logo?: string
  estado: "activo" | "inactivo"
  fechaCreacion: Date
  creadoPor?: string
  funcionalidades?: string[] // Nuevo campo para funcionalidades habilitadas
}

// Definir las funcionalidades disponibles del panel de staff
const FUNCIONALIDADES_DISPONIBLES = [
  {
    id: "calendario",
    nombre: "Calendario",
    descripcion: "Gestión de horarios, entrenamientos y eventos",
  },
  {
    id: "jugadores",
    nombre: "Gestión de Jugadores",
    descripcion: "Administración de perfiles y datos de jugadores",
  },
  {
    id: "entrenamientos",
    nombre: "Gestión de Entrenamientos",
    descripcion: "Planificación y organización de sesiones",
  },
  {
    id: "partidos",
    nombre: "Gestión de Partidos",
    descripcion: "Organización de partidos y convocatorias",
  },
  {
    id: "carga-externa",
    nombre: "Gestión de Carga Externa",
    descripcion: "Monitoreo de cargas de trabajo externas",
  },
  {
    id: "carga-interna",
    nombre: "Gestión de Carga Interna",
    descripcion: "Gestión de cargas internas y planificación",
  },
  {
    id: "evaluaciones",
    nombre: "Evaluaciones",
    descripcion: "Evaluaciones técnicas y físicas",
  },
  {
    id: "medicos",
    nombre: "Servicios Médicos",
    descripcion: "Gestión de historial médico y lesiones",
  },
]

export default function ClientesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loadingClientes, setLoadingClientes] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    club: "",
    logo: "",
    estado: "activo" as "activo" | "inactivo",
    funcionalidades: [] as string[], // Nuevo campo
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadClientes()
    }
  }, [user])

  const loadClientes = async () => {
    try {
      setLoadingClientes(true)
      console.log("🔄 Cargando clientes desde Firestore...")

      const clientesRef = collection(db, "clientes")
      const q = query(clientesRef, orderBy("fechaCreacion", "desc"))
      const snapshot = await getDocs(q)

      const clientesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date(),
        funcionalidades: doc.data().funcionalidades || [], // Asegurar que siempre sea un array
      })) as Cliente[]

      setClientes(clientesData)
      console.log("✅ Clientes cargados desde Firestore:", clientesData.length)

      // Sincronizar con localStorage como backup
      saveClientesToStorage(clientesData)
    } catch (error) {
      console.error("❌ Error cargando clientes desde Firestore:", error)

      // Fallback: cargar desde localStorage
      const savedClientes = localStorage.getItem("clientes")
      if (savedClientes) {
        try {
          const parsedClientes = JSON.parse(savedClientes).map((cliente: any) => ({
            ...cliente,
            fechaCreacion: new Date(cliente.fechaCreacion),
            funcionalidades: cliente.funcionalidades || [], // Asegurar compatibilidad
          }))
          // Ordenar por fecha de creación (más recientes primero)
          parsedClientes.sort((a: Cliente, b: Cliente) => b.fechaCreacion.getTime() - a.fechaCreacion.getTime())
          setClientes(parsedClientes)
          console.log("⚠️ Clientes cargados desde localStorage como fallback:", parsedClientes.length)
        } catch (parseError) {
          console.error("Error parsing localStorage:", parseError)
          setClientes([])
        }
      } else {
        setClientes([])
      }
    } finally {
      setLoadingClientes(false)
    }
  }

  const saveClientesToStorage = (clientesList: Cliente[]) => {
    localStorage.setItem("clientes", JSON.stringify(clientesList))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith("image/")) {
        setFormError("Por favor selecciona un archivo de imagen válido")
        return
      }

      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setFormError("El archivo debe ser menor a 2MB")
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setFormData({ ...formData, logo: result })
        setFormError("")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logo: "" })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFuncionalidadChange = (funcionalidadId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      funcionalidades: checked
        ? [...prev.funcionalidades, funcionalidadId]
        : prev.funcionalidades.filter((id) => id !== funcionalidadId),
    }))
  }

  const handleSelectAllFuncionalidades = () => {
    const allIds = FUNCIONALIDADES_DISPONIBLES.map((f) => f.id)
    setFormData((prev) => ({
      ...prev,
      funcionalidades: allIds,
    }))
  }

  const handleDeselectAllFuncionalidades = () => {
    setFormData((prev) => ({
      ...prev,
      funcionalidades: [],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError("")
    setFormSuccess("")

    try {
      if (editingCliente) {
        // Actualizar cliente existente en Firestore
        console.log("🔄 Actualizando cliente en Firestore:", editingCliente.id)
        const clienteRef = doc(db, "clientes", editingCliente.id)
        const updateData = {
          nombre: formData.nombre,
          club: formData.club || null,
          logo: formData.logo || null,
          estado: formData.estado,
          funcionalidades: formData.funcionalidades, // Incluir funcionalidades
          fechaActualizacion: new Date(),
          actualizadoPor: user?.email || "unknown",
        }

        await updateDoc(clienteRef, updateData)
        console.log("✅ Cliente actualizado en Firestore:", editingCliente.id)
        setFormSuccess("Cliente actualizado correctamente")
      } else {
        // Crear nuevo cliente en Firestore
        console.log("🔄 Creando nuevo cliente en Firestore...")
        const clientesRef = collection(db, "clientes")
        const newClienteData = {
          nombre: formData.nombre,
          club: formData.club || null,
          logo: formData.logo || null,
          estado: formData.estado,
          funcionalidades: formData.funcionalidades, // Incluir funcionalidades
          fechaCreacion: new Date(),
          creadoPor: user?.email || "unknown",
        }

        const docRef = await addDoc(clientesRef, newClienteData)
        console.log("✅ Cliente creado en Firestore con ID:", docRef.id)
        setFormSuccess("Cliente creado correctamente")
      }

      // Recargar lista de clientes desde Firestore
      await loadClientes()

      // Limpiar formulario y cerrar dialog
      setFormData({
        nombre: "",
        club: "",
        logo: "",
        estado: "activo",
        funcionalidades: [],
      })
      setShowCreateDialog(false)
      setEditingCliente(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      setTimeout(() => setFormSuccess(""), 3000)
    } catch (error: any) {
      console.error("❌ Error guardando cliente en Firestore:", error)

      // Fallback: guardar en localStorage si Firestore falla
      try {
        let updatedClientes: Cliente[]

        if (editingCliente) {
          updatedClientes = clientes.map((cliente) =>
            cliente.id === editingCliente.id
              ? {
                  ...cliente,
                  ...formData,
                  fechaActualizacion: new Date(),
                  actualizadoPor: user?.email || "unknown",
                }
              : cliente,
          )
          setFormSuccess("Cliente actualizado correctamente (guardado localmente)")
        } else {
          const newCliente: Cliente = {
            id: Date.now().toString(),
            ...formData,
            fechaCreacion: new Date(),
            creadoPor: user?.email || "unknown",
          }
          updatedClientes = [newCliente, ...clientes]
          setFormSuccess("Cliente creado correctamente (guardado localmente)")
        }

        setClientes(updatedClientes)
        saveClientesToStorage(updatedClientes)

        // Limpiar formulario
        setFormData({
          nombre: "",
          club: "",
          logo: "",
          estado: "activo",
          funcionalidades: [],
        })
        setShowCreateDialog(false)
        setEditingCliente(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }

        setTimeout(() => setFormSuccess(""), 3000)
      } catch (fallbackError) {
        setFormError("Error al guardar el cliente")
      }
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente)
    setFormData({
      nombre: cliente.nombre,
      club: cliente.club || "",
      logo: cliente.logo || "",
      estado: cliente.estado,
      funcionalidades: cliente.funcionalidades || [], // Cargar funcionalidades existentes
    })
    setShowCreateDialog(true)
  }

  const handleDelete = async (clienteId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este cliente?")) return

    try {
      console.log("🔄 Eliminando cliente de Firestore:", clienteId)
      // Eliminar de Firestore
      await deleteDoc(doc(db, "clientes", clienteId))
      console.log("✅ Cliente eliminado de Firestore:", clienteId)

      // Recargar lista
      await loadClientes()
    } catch (error) {
      console.error("❌ Error eliminando cliente de Firestore:", error)

      // Fallback: eliminar de localStorage
      try {
        const updatedClientes = clientes.filter((cliente) => cliente.id !== clienteId)
        setClientes(updatedClientes)
        saveClientesToStorage(updatedClientes)
        console.log("⚠️ Cliente eliminado de localStorage como fallback")
      } catch (fallbackError) {
        console.error("Error eliminando cliente:", fallbackError)
      }
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }

  const getUserInitials = () => {
    if (user?.displayName) {
      const names = user.displayName.trim().split(" ")
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      }
      return names[0][0]?.toUpperCase() || "U"
    }
    return user?.email?.[0]?.toUpperCase() || "U"
  }

  const getFuncionalidadNombre = (id: string) => {
    return FUNCIONALIDADES_DISPONIBLES.find((f) => f.id === id)?.nombre || id
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => router.push("/admin")} className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
                <p className="text-gray-600 mt-1">Administra y visualiza todos los clientes del sistema</p>
              </div>
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
                  <DropdownMenuItem onClick={() => router.push("/admin/perfil")}>
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
        {/* Header con botón crear */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Clientes ({loadingClientes ? "..." : clientes.length})
            </h2>
            <p className="text-gray-600 text-sm mt-1">Gestiona la información de tus clientes</p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingCliente(null)
                  setFormData({
                    nombre: "",
                    club: "",
                    logo: "",
                    estado: "activo",
                    funcionalidades: [],
                  })
                  setFormError("")
                  setFormSuccess("")
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCliente ? "Editar Cliente" : "Crear Nuevo Cliente"}</DialogTitle>
                <DialogDescription>
                  {editingCliente
                    ? "Actualiza la información del cliente"
                    : "Completa los datos para crear un nuevo cliente"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Información Básica */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Información Básica</h3>

                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Cliente</Label>
                    <Input
                      id="nombre"
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Empresa ABC"
                      required
                      disabled={formLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="club">Club</Label>
                    <Input
                      id="club"
                      type="text"
                      value={formData.club}
                      onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                      placeholder="Ej: Club Deportivo ABC"
                      disabled={formLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo">Logo del Cliente</Label>
                    <div className="space-y-3">
                      {formData.logo ? (
                        <div className="relative">
                          <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                            <img
                              src={formData.logo || "/placeholder.svg"}
                              alt="Logo preview"
                              className="max-h-28 max-w-full object-contain"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveLogo}
                            className="absolute top-2 right-2 bg-transparent"
                            disabled={formLoading}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">Click para subir logo</p>
                          <p className="text-xs text-gray-500">PNG, JPG hasta 2MB</p>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={formLoading}
                      />
                      {!formData.logo && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={formLoading}
                          className="w-full"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Seleccionar Logo
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <select
                      id="estado"
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value as "activo" | "inactivo" })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={formLoading}
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                {/* Funcionalidades Disponibles */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Funcionalidades Disponibles</h3>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllFuncionalidades}
                        disabled={formLoading}
                      >
                        Seleccionar Todo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeselectAllFuncionalidades}
                        disabled={formLoading}
                      >
                        Deseleccionar Todo
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600">
                    Selecciona qué módulos del panel de staff estarán disponibles para este cliente
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {FUNCIONALIDADES_DISPONIBLES.map((funcionalidad) => (
                      <div key={funcionalidad.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={funcionalidad.id}
                          checked={formData.funcionalidades.includes(funcionalidad.id)}
                          onCheckedChange={(checked) => handleFuncionalidadChange(funcionalidad.id, checked as boolean)}
                          disabled={formLoading}
                        />
                        <div className="flex-1">
                          <Label htmlFor={funcionalidad.id} className="text-sm font-medium cursor-pointer">
                            {funcionalidad.nombre}
                          </Label>
                          <p className="text-xs text-gray-500 mt-1">{funcionalidad.descripcion}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Funcionalidades seleccionadas:</strong> {formData.funcionalidades.length} de{" "}
                      {FUNCIONALIDADES_DISPONIBLES.length}
                    </p>
                    {formData.funcionalidades.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {formData.funcionalidades.map((id) => (
                          <Badge key={id} variant="secondary" className="text-xs">
                            {getFuncionalidadNombre(id)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                {formSuccess && (
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">{formSuccess}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateDialog(false)
                      setEditingCliente(null)
                      setFormData({
                        nombre: "",
                        club: "",
                        logo: "",
                        estado: "activo",
                        funcionalidades: [],
                      })
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ""
                      }
                    }}
                    disabled={formLoading}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={formLoading} className="flex-1">
                    {formLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </div>
                    ) : editingCliente ? (
                      "Actualizar"
                    ) : (
                      "Crear Cliente"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de clientes */}
        {loadingClientes ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : clientes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clientes</h3>
              <p className="text-gray-500 text-center mb-6">
                Comienza creando tu primer cliente para gestionar tu cartera de clientes.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Cliente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientes.map((cliente) => (
              <Card key={cliente.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {cliente.logo ? (
                          <img
                            src={cliente.logo || "/placeholder.svg"}
                            alt={`Logo de ${cliente.nombre}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{cliente.nombre}</CardTitle>
                        {cliente.club && <p className="text-sm text-gray-600 mb-1">{cliente.club}</p>}
                        <Badge variant={cliente.estado === "activo" ? "default" : "secondary"}>{cliente.estado}</Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(cliente)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(cliente.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Funcionalidades habilitadas */}
                  {cliente.funcionalidades && cliente.funcionalidades.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          Funcionalidades ({cliente.funcionalidades.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {cliente.funcionalidades.slice(0, 3).map((id) => (
                          <Badge key={id} variant="outline" className="text-xs">
                            {getFuncionalidadNombre(id)}
                          </Badge>
                        ))}
                        {cliente.funcionalidades.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{cliente.funcionalidades.length - 3} más
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    {cliente.club && <p className="text-xs text-gray-500 mb-1">Club: {cliente.club}</p>}
                    <p className="text-xs text-gray-500">Creado: {cliente.fechaCreacion.toLocaleDateString()}</p>
                    {cliente.creadoPor && <p className="text-xs text-gray-500">Por: {cliente.creadoPor}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
