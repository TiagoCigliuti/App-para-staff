"use client"

import type React from "react"
import { auth } from "@/lib/firebaseConfig"
import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { db } from "@/lib/firebaseConfig"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import {
  ArrowLeft,
  Plus,
  Users,
  MoreVertical,
  Edit,
  Trash2,
  User,
  LogOut,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react"
import { signOut } from "firebase/auth"

interface Cliente {
  id: string
  nombre: string
  logo?: string
  estado: "activo" | "inactivo"
  funcionalidades?: string[]
}

interface Usuario {
  id: string
  nombre: string
  apellido: string
  cargo: string
  username: string
  email: string
  clienteId: string
  clienteNombre: string
  permisos: { [funcionalidadId: string]: "visualizar" | "editar" } // Cambiar de string[] a objeto
  estado: "activo" | "inactivo"
  rol: "staff"
  fechaCreacion: Date
  creadoPor?: string
  firebaseUid?: string
}

const FUNCIONALIDADES_DISPONIBLES = [
  {
    id: "calendario",
    nombre: "Calendario",
    descripcion: "Gestiona horarios, entrenamientos y eventos del equipo",
  },
  {
    id: "jugadores",
    nombre: "Gestión de Jugadores",
    descripcion: "Administra perfiles y datos de jugadores",
  },
  {
    id: "entrenamientos",
    nombre: "Gestión de Entrenamientos",
    descripcion: "Planifica y organiza sesiones de entrenamiento",
  },
  {
    id: "partidos",
    nombre: "Gestión de Partidos",
    descripcion: "Organiza partidos, convocatorias y resultados",
  },
  {
    id: "carga-externa",
    nombre: "Gestión de Carga Externa",
    descripcion: "Monitorea cargas de trabajo externas y rendimiento físico",
  },
  {
    id: "carga-interna",
    nombre: "Gestión de Carga Interna",
    descripcion: "Gestiona cargas internas y planificación de recursos",
  },
  {
    id: "evaluaciones",
    nombre: "Evaluaciones",
    descripcion: "Realiza evaluaciones técnicas, físicas y tácticas",
  },
  {
    id: "medicos",
    nombre: "Servicios Médicos",
    descripcion: "Gestiona historial médico, lesiones y recuperaciones",
  },
]

export default function UsuariosPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(true)
  const [loadingClientes, setLoadingClientes] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null)
  const [clienteFuncionalidades, setClienteFuncionalidades] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    cargo: "",
    username: "",
    password: "",
    clienteId: "",
    estado: "activo" as "activo" | "inactivo",
    permisos: {} as { [key: string]: "visualizar" | "editar" }, // Cambiar estructura
  })
  const [showPassword, setShowPassword] = useState(false)
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
      loadUsuarios()
      loadClientes()
    }
  }, [user])

  const loadClientes = async () => {
    try {
      setLoadingClientes(true)
      console.log("🔄 Cargando clientes...")

      // Intentar cargar desde Firestore primero
      try {
        const clientesRef = collection(db, "clientes")
        const q = query(clientesRef, orderBy("nombre", "asc"))
        const snapshot = await getDocs(q)

        const clientesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Cliente[]

        // Filtrar solo clientes activos
        const clientesActivos = clientesData.filter((cliente) => cliente.estado === "activo")
        setClientes(clientesActivos)
        console.log("✅ Clientes activos cargados desde Firestore:", clientesActivos.length)
        return
      } catch (firestoreError) {
        console.log("⚠️ Error con Firestore, usando localStorage:", firestoreError)
      }

      // Fallback a localStorage
      const savedClientes = localStorage.getItem("clientes")
      if (savedClientes) {
        try {
          const parsedClientes = JSON.parse(savedClientes).filter((cliente: Cliente) => cliente.estado === "activo")
          setClientes(parsedClientes)
          console.log("✅ Clientes activos cargados desde localStorage:", parsedClientes.length)
        } catch (parseError) {
          console.error("Error parsing clientes:", parseError)
          setClientes([])
        }
      } else {
        setClientes([])
      }
    } finally {
      setLoadingClientes(false)
    }
  }

  const loadUsuarios = async () => {
    try {
      setLoadingUsuarios(true)
      console.log("🔄 Cargando usuarios desde Firestore...")

      // Intentar cargar desde Firestore primero
      try {
        const staffRef = collection(db, "staff") // Cambiar a colección "staff"
        const q = query(staffRef, orderBy("fechaCreacion", "desc"))
        const snapshot = await getDocs(q)

        const usuariosData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date(),
        })) as Usuario[]

        setUsuarios(usuariosData)
        console.log("✅ Usuarios cargados desde Firestore (colección staff):", usuariosData.length)

        // Backup en localStorage
        localStorage.setItem("usuarios", JSON.stringify(usuariosData))
        return
      } catch (firestoreError) {
        console.log("⚠️ Error con Firestore, usando localStorage:", firestoreError)
      }

      // Fallback a localStorage
      const savedUsuarios = localStorage.getItem("usuarios")
      if (savedUsuarios) {
        try {
          const parsedUsuarios = JSON.parse(savedUsuarios).map((usuario: any) => ({
            ...usuario,
            fechaCreacion: new Date(usuario.fechaCreacion),
          }))
          parsedUsuarios.sort((a: Usuario, b: Usuario) => b.fechaCreacion.getTime() - a.fechaCreacion.getTime())
          setUsuarios(parsedUsuarios)
          console.log("✅ Usuarios cargados desde localStorage:", parsedUsuarios.length)
        } catch (parseError) {
          console.error("Error parsing usuarios:", parseError)
          setUsuarios([])
        }
      } else {
        setUsuarios([])
      }
    } finally {
      setLoadingUsuarios(false)
    }
  }

  const saveUsuariosToStorage = (usuariosList: Usuario[]) => {
    localStorage.setItem("usuarios", JSON.stringify(usuariosList))
  }

  const generateEmail = (username: string, clienteId: string) => {
    // Todos los usuarios staff usan el dominio staffpro.com
    return `${username}@staffpro.com`
  }

  const loadClienteFuncionalidades = async (clienteId: string) => {
    if (!clienteId) {
      setClienteFuncionalidades([])
      return
    }

    try {
      // Buscar cliente en la lista cargada
      const cliente = clientes.find((c) => c.id === clienteId)
      if (cliente && cliente.funcionalidades) {
        setClienteFuncionalidades(cliente.funcionalidades)
        console.log("✅ Funcionalidades del cliente cargadas:", cliente.funcionalidades)
        console.log("✅ Cliente encontrado:", cliente.nombre)
      } else {
        setClienteFuncionalidades([])
        console.log("⚠️ Cliente sin funcionalidades o no encontrado:", clienteId)
      }
    } catch (error) {
      console.error("Error cargando funcionalidades del cliente:", error)
      setClienteFuncionalidades([])
    }
  }

  useEffect(() => {
    loadClienteFuncionalidades(formData.clienteId)
  }, [formData.clienteId, clientes])

  const handlePermisoChange = (funcionalidadId: string, permiso: "visualizar" | "editar") => {
    setFormData((prev) => ({
      ...prev,
      permisos: {
        ...prev.permisos,
        [funcionalidadId]: permiso,
      },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError("")
    setFormSuccess("")

    try {
      // Validaciones
      if (!formData.clienteId) {
        setFormError("Debes seleccionar un cliente")
        setFormLoading(false)
        return
      }

      const cliente = clientes.find((c) => c.id === formData.clienteId)
      if (!cliente) {
        setFormError("Cliente seleccionado no válido")
        setFormLoading(false)
        return
      }

      if (editingUsuario) {
        // Actualizar usuario existente
        console.log("🔄 Actualizando usuario:", editingUsuario.id)

        // Intentar actualizar en Firestore primero
        try {
          console.log("🔄 Actualizando usuario en Firestore (colección staff)...")
          const staffRef = doc(db, "staff", editingUsuario.id)
          const updateData = {
            nombre: formData.nombre,
            apellido: formData.apellido,
            cargo: formData.cargo,
            username: formData.username,
            clienteId: formData.clienteId,
            clienteNombre: cliente.nombre,
            estado: formData.estado,
            fechaActualizacion: new Date(),
            actualizadoPor: user?.email || "unknown",
          }

          await updateDoc(staffRef, updateData)
          console.log("✅ Usuario actualizado en Firestore:", editingUsuario.id)

          // Recargar desde Firestore para mantener sincronización
          await loadUsuarios()
          setFormSuccess("Usuario actualizado correctamente en la base de datos")
        } catch (firestoreError) {
          console.log("⚠️ Error actualizando en Firestore, actualizando localmente:", firestoreError)

          // Fallback: actualizar solo en localStorage
          const updatedUsuarios = usuarios.map((usuario) =>
            usuario.id === editingUsuario.id
              ? {
                  ...usuario,
                  nombre: formData.nombre,
                  apellido: formData.apellido,
                  cargo: formData.cargo,
                  username: formData.username,
                  clienteId: formData.clienteId,
                  clienteNombre: cliente.nombre,
                  estado: formData.estado,
                  fechaActualizacion: new Date(),
                  actualizadoPor: user?.email || "unknown",
                }
              : usuario,
          )

          setUsuarios(updatedUsuarios)
          saveUsuariosToStorage(updatedUsuarios)
          setFormSuccess("Usuario actualizado correctamente (guardado localmente)")
        }
      } else {
        // Crear nuevo usuario
        console.log("🔄 Creando nuevo usuario...")

        // Generar email automáticamente
        const email = generateEmail(formData.username, formData.clienteId)

        // Verificar si ya existe un usuario con el mismo username
        const existingUser = usuarios.find((u) => u.username === formData.username)
        if (existingUser) {
          setFormError("Ya existe un usuario con este nombre de usuario")
          setFormLoading(false)
          return
        }

        // Crear nuevo usuario
        const newUsuario: Usuario = {
          id: Date.now().toString(),
          nombre: formData.nombre,
          apellido: formData.apellido,
          cargo: formData.cargo,
          username: formData.username,
          email: email,
          clienteId: formData.clienteId,
          clienteNombre: cliente.nombre,
          permisos: formData.permisos, // Usar nuevos permisos
          estado: formData.estado,
          rol: "staff",
          fechaCreacion: new Date(),
          creadoPor: user?.email || "unknown",
        }

        // Intentar crear usuario en Firebase Authentication primero
        try {
          console.log("🔄 Creando usuario en Firebase Authentication...")
          const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password)
          const firebaseUser = userCredential.user

          // Actualizar el perfil del usuario con nombre completo
          await updateProfile(firebaseUser, {
            displayName: `${formData.nombre} ${formData.apellido}`.trim(),
          })

          console.log("✅ Usuario creado en Firebase Auth con UID:", firebaseUser.uid)

          // Agregar el UID de Firebase al objeto usuario
          newUsuario.firebaseUid = firebaseUser.uid

          // Intentar guardar en Firestore
          try {
            console.log("🔄 Guardando usuario en Firestore (colección staff)...")
            const staffRef = collection(db, "staff")
            const docRef = await addDoc(staffRef, {
              nombre: newUsuario.nombre,
              apellido: newUsuario.apellido,
              cargo: newUsuario.cargo,
              username: newUsuario.username,
              email: newUsuario.email,
              clienteId: newUsuario.clienteId,
              clienteNombre: newUsuario.clienteNombre,
              permisos: newUsuario.permisos,
              estado: newUsuario.estado,
              rol: newUsuario.rol,
              fechaCreacion: newUsuario.fechaCreacion,
              creadoPor: newUsuario.creadoPor,
              firebaseUid: newUsuario.firebaseUid, // Guardar el UID de Firebase
            })

            // Actualizar el ID con el de Firestore
            newUsuario.id = docRef.id
            console.log("✅ Usuario guardado en Firestore con ID:", docRef.id)

            // Recargar desde Firestore para mantener sincronización
            await loadUsuarios()
            setFormSuccess("Usuario creado correctamente en la base de datos y autenticación")
          } catch (firestoreError) {
            console.log("⚠️ Error guardando en Firestore, guardando localmente:", firestoreError)

            // Fallback: guardar solo en localStorage
            const updatedUsuarios = [newUsuario, ...usuarios]
            setUsuarios(updatedUsuarios)
            saveUsuariosToStorage(updatedUsuarios)
            setFormSuccess("Usuario creado correctamente en autenticación (guardado localmente)")
          }
        } catch (authError: any) {
          console.error("❌ Error creando usuario en Firebase Auth:", authError)

          // Manejar errores específicos de Firebase Auth
          let errorMessage = "Error al crear el usuario en el sistema de autenticación"

          if (authError.code === "auth/email-already-in-use") {
            errorMessage = "Ya existe un usuario con este email en el sistema"
          } else if (authError.code === "auth/weak-password") {
            errorMessage = "La contraseña debe tener al menos 6 caracteres"
          } else if (authError.code === "auth/invalid-email") {
            errorMessage = "El formato del email no es válido"
          }

          setFormError(errorMessage)
          setFormLoading(false)
          return
        }
      }

      // Limpiar formulario y cerrar dialog
      setFormData({
        nombre: "",
        apellido: "",
        cargo: "",
        username: "",
        password: "",
        clienteId: "",
        estado: "activo",
        permisos: {}, // Limpiar permisos
      })
      setShowCreateDialog(false)
      setEditingUsuario(null)

      setTimeout(() => setFormSuccess(""), 3000)
    } catch (error: any) {
      console.error("❌ Error guardando usuario:", error)
      setFormError("Error al crear el usuario: " + (error.message || "Error desconocido"))
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario)
    setFormData({
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      cargo: usuario.cargo,
      username: usuario.username,
      password: "",
      clienteId: usuario.clienteId,
      estado: usuario.estado,
      permisos: usuario.permisos || {}, // Cargar permisos existentes
    })
    setShowCreateDialog(true)
  }

  const handleDelete = async (usuarioId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este usuario?")) return

    try {
      console.log("🔄 Eliminando usuario:", usuarioId)

      // Intentar eliminar de Firestore primero
      try {
        console.log("🔄 Eliminando usuario de Firestore (colección staff)...")
        await deleteDoc(doc(db, "staff", usuarioId))
        console.log("✅ Usuario eliminado de Firestore:", usuarioId)

        // Recargar desde Firestore para mantener sincronización
        await loadUsuarios()
      } catch (firestoreError) {
        console.log("⚠️ Error eliminando de Firestore, eliminando localmente:", firestoreError)

        // Fallback: eliminar solo de localStorage
        const updatedUsuarios = usuarios.filter((usuario) => usuario.id !== usuarioId)
        setUsuarios(updatedUsuarios)
        saveUsuariosToStorage(updatedUsuarios)
      }
    } catch (error) {
      console.error("❌ Error eliminando usuario:", error)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
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
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
                <p className="text-gray-600 mt-1">Administra y crea usuarios del sistema</p>
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
              Usuarios ({loadingUsuarios ? "..." : usuarios.length})
            </h2>
            <p className="text-gray-600 text-sm mt-1">Gestiona los usuarios del sistema</p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingUsuario(null)
                  setFormData({
                    nombre: "",
                    apellido: "",
                    cargo: "",
                    username: "",
                    password: "",
                    clienteId: "",
                    estado: "activo",
                    permisos: {},
                  })
                  setFormError("")
                  setFormSuccess("")
                }}
                disabled={loadingClientes || clientes.length === 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingUsuario ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
                <DialogDescription>
                  {editingUsuario
                    ? "Actualiza la información del usuario"
                    : "Completa los datos para crear un nuevo usuario de staff"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Columna Izquierda - Información Básica */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Información Básica</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre</Label>
                        <Input
                          id="nombre"
                          type="text"
                          value={formData.nombre}
                          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                          placeholder="Juan"
                          required
                          disabled={formLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apellido">Apellido</Label>
                        <Input
                          id="apellido"
                          type="text"
                          value={formData.apellido}
                          onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                          placeholder="Pérez"
                          required
                          disabled={formLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cargo">Cargo</Label>
                      <Input
                        id="cargo"
                        type="text"
                        value={formData.cargo}
                        onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                        placeholder="Ej: Desarrollador, Diseñador, Manager"
                        required
                        disabled={formLoading}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Nombre de Usuario</Label>
                        <Input
                          id="username"
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                          placeholder="juanperez"
                          required
                          disabled={formLoading}
                        />
                      </div>
                      {!editingUsuario && (
                        <div className="space-y-2">
                          <Label htmlFor="password">Contraseña</Label>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              placeholder="Mínimo 6 caracteres"
                              required
                              disabled={formLoading}
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cliente">Cliente Asignado</Label>
                      <select
                        id="cliente"
                        value={formData.clienteId}
                        onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={formLoading || loadingClientes}
                      >
                        <option value="">Seleccionar cliente...</option>
                        {clientes.map((cliente) => (
                          <option key={cliente.id} value={cliente.id}>
                            {cliente.nombre}
                          </option>
                        ))}
                      </select>
                      {formData.username && (
                        <p className="text-xs text-gray-500">
                          Email generado: {generateEmail(formData.username, formData.clienteId)}
                        </p>
                      )}
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

                    {/* Información automática */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Rol:</strong> Staff (asignado automáticamente)
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Los permisos se configuran individualmente en la sección de la derecha.
                      </p>
                    </div>
                  </div>

                  {/* Columna Derecha - Permisos */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Permisos por Funcionalidad</h3>

                    {clienteFuncionalidades.length > 0 ? (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          Configura qué puede hacer este usuario con cada funcionalidad habilitada del cliente
                        </p>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {clienteFuncionalidades.map((funcId) => {
                            const funcionalidad = FUNCIONALIDADES_DISPONIBLES.find((f) => f.id === funcId)
                            if (!funcionalidad) return null

                            return (
                              <div key={funcId} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                                <div className="mb-3">
                                  <h4 className="text-sm font-semibold text-gray-900">{funcionalidad.nombre}</h4>
                                  <p className="text-xs text-gray-600 mt-1">{funcionalidad.descripcion}</p>
                                </div>

                                <div className="flex items-center space-x-6">
                                  <label className="flex items-center cursor-pointer p-2 rounded-md hover:bg-gray-50 transition-colors">
                                    <input
                                      type="radio"
                                      name={`permiso-${funcId}`}
                                      value="visualizar"
                                      checked={formData.permisos[funcId] === "visualizar"}
                                      onChange={() => handlePermisoChange(funcId, "visualizar")}
                                      disabled={formLoading}
                                      className="mr-3 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex items-center">
                                      <Eye className="w-4 h-4 text-gray-500 mr-2" />
                                      <span className="text-sm font-medium text-gray-700">Solo Visualizar</span>
                                    </div>
                                  </label>

                                  <label className="flex items-center cursor-pointer p-2 rounded-md hover:bg-gray-50 transition-colors">
                                    <input
                                      type="radio"
                                      name={`permiso-${funcId}`}
                                      value="editar"
                                      checked={formData.permisos[funcId] === "editar"}
                                      onChange={() => handlePermisoChange(funcId, "editar")}
                                      disabled={formLoading}
                                      className="mr-3 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="flex items-center">
                                      <Edit className="w-4 h-4 text-gray-500 mr-2" />
                                      <span className="text-sm font-medium text-gray-700">Editar</span>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm text-green-800">
                            <strong>Permisos configurados:</strong> {Object.keys(formData.permisos).length} de{" "}
                            {clienteFuncionalidades.length}
                          </p>
                          {Object.keys(formData.permisos).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {Object.entries(formData.permisos).map(([funcId, permiso]) => {
                                const funcNombre =
                                  FUNCIONALIDADES_DISPONIBLES.find((f) => f.id === funcId)?.nombre || funcId
                                return (
                                  <Badge
                                    key={funcId}
                                    variant={permiso === "editar" ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {funcNombre}: {permiso === "editar" ? "Editar" : "Ver"}
                                  </Badge>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 mb-2">Selecciona un Cliente</h4>
                        <p className="text-gray-600">
                          Primero selecciona un cliente para ver sus funcionalidades disponibles
                        </p>
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

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateDialog(false)
                      setEditingUsuario(null)
                      setFormData({
                        nombre: "",
                        apellido: "",
                        cargo: "",
                        username: "",
                        password: "",
                        clienteId: "",
                        estado: "activo",
                        permisos: {},
                      })
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
                        {editingUsuario ? "Actualizando..." : "Creando..."}
                      </div>
                    ) : editingUsuario ? (
                      "Actualizar Usuario"
                    ) : (
                      "Crear Usuario"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Mensaje si no hay clientes */}
        {!loadingClientes && clientes.length === 0 && (
          <Card className="mb-6">
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clientes activos</h3>
                <p className="text-gray-500 mb-4">
                  Necesitas crear al menos un cliente activo antes de poder crear usuarios.
                </p>
                <Button onClick={() => router.push("/clientes")}>Ir a Gestión de Clientes</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de usuarios */}
        {loadingUsuarios ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : usuarios.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios</h3>
              <p className="text-gray-500 text-center mb-6">
                Comienza creando tu primer usuario de staff para gestionar el sistema.
              </p>
              <Button onClick={() => setShowCreateDialog(true)} disabled={loadingClientes || clientes.length === 0}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Usuario
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {usuarios.map((usuario) => (
              <Card key={usuario.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-lg">
                          {usuario.nombre[0]}
                          {usuario.apellido[0]}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {usuario.nombre} {usuario.apellido}
                        </CardTitle>
                        <p className="text-sm text-gray-600">{usuario.cargo}</p>
                        <Badge variant={usuario.estado === "activo" ? "default" : "secondary"}>{usuario.estado}</Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(usuario)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(usuario.id)}
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
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Usuario:</span>
                      <span className="font-medium">{usuario.username}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Email:</span>
                      <span className="font-medium text-xs">{usuario.email}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Cliente:</span>
                      <span className="font-medium">{usuario.clienteNombre}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Rol:</span>
                      <Badge variant="outline" className="text-xs">
                        {usuario.rol}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Permisos:</span>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(usuario.permisos || {})
                          .slice(0, 2)
                          .map(([funcId, permiso]) => {
                            const funcNombre =
                              FUNCIONALIDADES_DISPONIBLES.find((f) => f.id === funcId)?.nombre || funcId
                            return (
                              <Badge
                                key={funcId}
                                variant={permiso === "editar" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {funcNombre.split(" ")[0]}: {permiso === "editar" ? "E" : "V"}
                              </Badge>
                            )
                          })}
                        {Object.keys(usuario.permisos || {}).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{Object.keys(usuario.permisos || {}).length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500">Creado: {usuario.fechaCreacion.toLocaleDateString()}</p>
                    {usuario.creadoPor && <p className="text-xs text-gray-500">Por: {usuario.creadoPor}</p>}
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
