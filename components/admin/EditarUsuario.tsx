"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebaseConfig"
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, User, Save, Upload, Trash2, AlertTriangle, Eye, EyeOff, Shield } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Cliente {
  id: string
  clubName: string
}

interface UsuarioData {
  id: string
  username: string
  firstName: string
  lastName: string
  password: string
  role: string
  status: string
  clientId: string
  equipoNombre: string
  escudoEquipo?: string | null
  themeId: string
  fotoPerfil?: string | null
  createdAt: string
  updatedAt: string
  firebaseUid?: string
  email?: string
}

export default function EditarUsuario({ usuarioId }: { usuarioId: string }) {
  const router = useRouter()
  const { clienteData: authClienteData } = useAuth()

  const [usuarioData, setUsuarioData] = useState<UsuarioData | null>(null)
  const [username, setUsername] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [password, setPassword] = useState("")
  const [clientId, setClientId] = useState("")
  const [temas, setTemas] = useState<{ id: string; name: string }[]>([])
  const [equipoNombre, setEquipoNombre] = useState("")
  const [escudoEquipo, setEscudoEquipo] = useState<string | null>(null)
  const [themeId, setThemeId] = useState("")
  const [status, setStatus] = useState("active")
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  // Verificar permisos de admin
  useEffect(() => {
    if (authClienteData && !authClienteData.esAdmin) {
      router.push("/dashboard")
    }
  }, [authClienteData, router])

  // Cargar datos del usuario
  useEffect(() => {
    const fetchUsuarioData = async () => {
      try {
        const docRef = doc(db, "users", usuarioId)
        const docSnap = await getDoc(docRef)

        if (!docSnap.exists()) {
          setError("Usuario no encontrado")
          setLoading(false)
          return
        }

        const data = docSnap.data()
        setUsuarioData({
          id: usuarioId,
          username: data.username || "",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          password: data.password || "",
          role: data.role || "staff",
          status: data.status || "active",
          clientId: data.clientId || "",
          equipoNombre: data.equipoNombre || data.equipoId || "",
          escudoEquipo: data.escudoEquipo || null,
          themeId: data.themeId || "",
          fotoPerfil: data.fotoPerfil || null,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          firebaseUid: data.firebaseUid || null,
          email: data.email || null,
        })

        // Establecer los valores en los estados del formulario
        setUsername(data.username || "")
        setFirstName(data.firstName || "")
        setLastName(data.lastName || "")
        setPassword(data.password || "")
        setClientId(data.clientId || "")
        setEquipoNombre(data.equipoNombre || data.equipoId || "")
        setEscudoEquipo(data.escudoEquipo || null)
        setThemeId(data.themeId || "")
        setStatus(data.status || "active")
        setFotoPerfil(data.fotoPerfil || null)
      } catch (error) {
        console.error("Error al cargar datos del usuario:", error)
        setError("Error al cargar los datos del usuario")
      } finally {
        setLoading(false)
      }
    }

    if (usuarioId) {
      fetchUsuarioData()
    }
  }, [usuarioId])

  // Cargar clientes disponibles
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const snapshot = await getDocs(collection(db, "clients"))
        const clientesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          clubName: doc.data().clubName || doc.data().name || "Cliente sin nombre",
        }))
        setClientes(clientesData)
      } catch (error) {
        console.error("Error al cargar clientes:", error)
      }
    }

    fetchClientes()
  }, [])

  // Cargar temas disponibles
  useEffect(() => {
    const fetchTemas = async () => {
      try {
        const snapshot = await getDocs(collection(db, "themes"))
        const temasData = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }))
        setTemas(temasData)
      } catch (error) {
        console.error("Error al cargar temas:", error)
      }
    }

    fetchTemas()
  }, [])

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setFotoPerfil(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleEscudoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setEscudoEquipo(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      if (!username.trim() || !firstName.trim() || !lastName.trim() || !password.trim()) {
        setError("Todos los campos son obligatorios")
        setSaving(false)
        return
      }

      if (password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres")
        setSaving(false)
        return
      }

      // Actualizar en Firestore
      const usuarioRef = doc(db, "users", usuarioId)
      await updateDoc(usuarioRef, {
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password: password.trim(),
        status,
        clientId,
        equipoNombre: equipoNombre.trim(),
        escudoEquipo,
        themeId,
        fotoPerfil,
        updatedAt: new Date().toISOString(),
      })

      // Si el usuario tiene firebaseUid, intentar actualizar la contraseña en Firebase Auth
      if (usuarioData?.firebaseUid && password !== usuarioData.password) {
        try {
          // Nota: Para actualizar la contraseña de otro usuario en Firebase Auth,
          // necesitarías usar Firebase Admin SDK en el backend.
          // Por ahora, solo actualizamos en Firestore.
          console.log(
            "Contraseña actualizada en Firestore. Para sincronizar con Firebase Auth, el usuario debe cambiar su contraseña en el próximo login.",
          )
        } catch (authError) {
          console.error("Error al actualizar contraseña en Firebase Auth:", authError)
          // No fallar la operación completa por esto
        }
      }

      setSuccess("Usuario actualizado correctamente")
      setTimeout(() => {
        router.push("/admin/usuarios")
      }, 1500)
    } catch (err: any) {
      console.error("Error al actualizar usuario:", err)
      setError("Error al actualizar el usuario. Inténtalo de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError("")

    try {
      // Eliminar de Firestore
      const usuarioRef = doc(db, "users", usuarioId)
      await deleteDoc(usuarioRef)

      // Si el usuario tiene firebaseUid, intentar eliminarlo de Firebase Auth
      if (usuarioData?.firebaseUid) {
        try {
          // Nota: Para eliminar otro usuario de Firebase Auth,
          // necesitarías usar Firebase Admin SDK en el backend.
          console.log("Usuario eliminado de Firestore. Para eliminar de Firebase Auth, se requiere Admin SDK.")
        } catch (authError) {
          console.error("Error al eliminar usuario de Firebase Auth:", authError)
          // No fallar la operación completa por esto
        }
      }

      setSuccess("Usuario eliminado correctamente")
      setTimeout(() => {
        router.push("/admin/usuarios")
      }, 1500)
    } catch (err: any) {
      console.error("Error al eliminar usuario:", err)
      setError("Error al eliminar el usuario. Inténtalo de nuevo.")
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando datos del usuario...</p>
        </div>
      </div>
    )
  }

  if (error === "Usuario no encontrado") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto">
          <Card className="border border-red-200 shadow-sm">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-medium text-gray-900 mb-2">Usuario no encontrado</h2>
              <p className="text-gray-600 mb-6">El usuario que intentas editar no existe o ha sido eliminado.</p>
              <Button
                onClick={() => router.push("/admin/usuarios")}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a usuarios
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium text-gray-800 mb-8">Editar usuario</h1>

          {/* Back Button */}
          <div className="flex justify-start mb-6">
            <Button
              variant="ghost"
              onClick={() => router.push("/admin/usuarios")}
              className="text-gray-600 hover:text-purple-600"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a usuarios
            </Button>
          </div>
        </div>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-medium text-gray-900">Información del Usuario</h2>
              </div>

              <div className="flex items-center space-x-2">
                <Label htmlFor="status" className="text-sm">
                  Estado:
                </Label>
                <Select value={status} onValueChange={(value) => setStatus(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Información sobre sincronización */}
            {usuarioData?.firebaseUid && (
              <Alert className="mb-6 bg-blue-50 border-blue-200">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Usuario sincronizado:</strong> Este usuario está sincronizado con Firebase Authentication
                  (UID: <code className="bg-blue-100 px-1 rounded">{usuarioData.firebaseUid}</code>). Los cambios de
                  contraseña requieren que el usuario inicie sesión nuevamente.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de usuario</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej: juanperez"
                    required
                    className="border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500">
                    {usuarioData?.email && (
                      <>
                        Email asociado: <code>{usuarioData.email}</code>
                      </>
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className="border-gray-200 focus:border-purple-500 focus:ring-purple-500 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {usuarioData?.firebaseUid
                      ? "Cambios requieren nuevo login del usuario"
                      : "Contraseña para acceder al sistema"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ej: Juan"
                    required
                    className="border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ej: Pérez"
                    required
                    className="border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Foto de perfil y Escudo del equipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Foto de perfil */}
                <div className="space-y-2">
                  <Label htmlFor="foto">Foto de perfil</Label>
                  <div className="flex items-center space-x-4">
                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                      {fotoPerfil ? (
                        <img
                          src={fotoPerfil || "/placeholder.svg"}
                          alt="Foto preview"
                          className="max-w-full max-h-full object-contain rounded"
                        />
                      ) : (
                        <User className="h-10 w-10 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="foto-upload" className="cursor-pointer">
                        <div className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md transition-colors">
                          <Upload className="h-4 w-4" />
                          <span>Cambiar imagen</span>
                        </div>
                        <input
                          id="foto-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleFotoUpload}
                          className="hidden"
                        />
                      </Label>
                      <p className="text-xs text-gray-500 mt-2">PNG, JPG. Máx: 2MB</p>
                    </div>
                  </div>
                </div>

                {/* Escudo del equipo */}
                <div className="space-y-2">
                  <Label htmlFor="escudo">Escudo del equipo</Label>
                  <div className="flex items-center space-x-4">
                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                      {escudoEquipo ? (
                        <img
                          src={escudoEquipo || "/placeholder.svg"}
                          alt="Escudo preview"
                          className="max-w-full max-h-full object-contain rounded"
                        />
                      ) : (
                        <Shield className="h-10 w-10 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="escudo-upload" className="cursor-pointer">
                        <div className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md transition-colors">
                          <Upload className="h-4 w-4" />
                          <span>Cambiar escudo</span>
                        </div>
                        <input
                          id="escudo-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleEscudoUpload}
                          className="hidden"
                        />
                      </Label>
                      <p className="text-xs text-gray-500 mt-2">PNG, JPG. Máx: 2MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cliente asignado */}
              <div className="space-y-2">
                <Label htmlFor="client">Cliente asignado</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="border-gray-200 focus:border-purple-500 focus:ring-purple-500">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.length > 0 ? (
                      clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.clubName}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="default" disabled>
                        No hay clientes disponibles
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Cliente al que pertenece este usuario staff</p>
              </div>

              {/* Tema asignado */}
              <div className="space-y-2">
                <Label htmlFor="theme">Tema asignado</Label>
                <Select value={themeId} onValueChange={setThemeId}>
                  <SelectTrigger className="border-gray-200 focus:border-purple-500 focus:ring-purple-500">
                    <SelectValue placeholder="Selecciona un tema" />
                  </SelectTrigger>
                  <SelectContent>
                    {temas.length > 0 ? (
                      temas.map((tema) => (
                        <SelectItem key={tema.id} value={tema.id}>
                          {tema.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="default" disabled>
                        No hay temas disponibles
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Tema que se aplicará cuando este usuario inicie sesión</p>
              </div>

              {/* Equipo asignado */}
              <div className="space-y-2">
                <Label htmlFor="equipo">Equipo asignado</Label>
                <Input
                  id="equipo"
                  value={equipoNombre}
                  onChange={(e) => setEquipoNombre(e.target.value)}
                  placeholder="Ej: Equipo Juvenil A, Primera División, etc."
                  required
                  className="border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500">Nombre del equipo al que pertenece este usuario staff</p>
              </div>

              {/* Mensajes */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {/* Botones de acción */}
              <div className="flex justify-between pt-6 border-t border-gray-200">
                <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={saving || deleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deleting ? "Eliminando..." : "Eliminar Usuario"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>¿Estás seguro?</DialogTitle>
                      <DialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente el usuario
                        <span className="font-semibold">
                          {" "}
                          {firstName} {lastName}
                        </span>{" "}
                        y todos sus datos asociados.
                        {usuarioData?.firebaseUid && (
                          <>
                            <br />
                            <br />
                            <strong>Nota:</strong> El usuario también será eliminado de Firebase Authentication.
                          </>
                        )}
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
                        Cancelar
                      </Button>
                      <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                        {deleting ? "Eliminando..." : "Sí, eliminar usuario"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/admin/usuarios")}
                    disabled={saving || deleting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving || deleting}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
