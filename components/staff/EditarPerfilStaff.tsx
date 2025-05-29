"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"
import { db, auth } from "@/lib/firebaseConfig"
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore"
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, Upload, User, Lock, AlertTriangle } from "lucide-react"

export default function EditarPerfilStaff() {
  const router = useRouter()
  const { user, signOut } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Datos del perfil
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null)

  // Datos para cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        router.push("/login")
        return
      }

      try {
        console.log("=== CARGANDO PERFIL DEL USUARIO ===")
        console.log("User ID:", user.id)

        const userDocRef = doc(db, "users", user.id)
        const userDoc = await getDoc(userDocRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          console.log("Datos del usuario encontrados:", userData)

          // Priorizar firstName/lastName, luego otras variaciones
          const nombre =
            userData.firstName || userData.Nombre || userData.nombre || userData.first_name || userData.name || ""

          const apellido =
            userData.lastName || userData.Apellido || userData.apellido || userData.last_name || userData.surname || ""

          const fotoPerfil =
            userData.fotoPerfil || userData.foto_perfil || userData.profilePicture || userData.avatar || null

          console.log("Nombre extraído:", nombre)
          console.log("Apellido extraído:", apellido)
          console.log("Foto perfil:", fotoPerfil ? "Sí tiene" : "No tiene")

          setNombre(nombre)
          setApellido(apellido)
          setFotoPerfil(fotoPerfil)
        } else {
          // Si no existe el documento del usuario, crear uno básico
          console.log("Documento de usuario no encontrado, creando uno nuevo...")
          const newUserData = {
            email: user.email,
            firstName: "",
            lastName: "",
            Nombre: "",
            Apellido: "",
            fotoPerfil: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          await setDoc(userDocRef, newUserData)
          console.log("Nuevo documento de usuario creado:", newUserData)

          // Establecer valores vacíos
          setNombre("")
          setApellido("")
          setFotoPerfil(null)
        }
      } catch (error) {
        console.error("Error al cargar datos del perfil:", error)
        setError("No se pudieron cargar los datos del perfil")
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [user, router])

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tamaño del archivo (2MB máximo)
    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen debe ser menor a 2MB")
      return
    }

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten archivos de imagen")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setFotoPerfil(reader.result as string)
      setError("") // Limpiar errores previos
    }
    reader.readAsDataURL(file)
  }

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setError("")
    setSuccess("")

    try {
      console.log("=== GUARDANDO PERFIL ===")
      console.log("Nombre a guardar:", nombre.trim())
      console.log("Apellido a guardar:", apellido.trim())

      const userDocRef = doc(db, "users", user.id)

      // Actualizar en Firestore con sincronización de campos
      const updateData = {
        // Campos principales (nuevos)
        firstName: nombre.trim(),
        lastName: apellido.trim(),

        // Campos legacy (mantener compatibilidad)
        Nombre: nombre.trim(),
        Apellido: apellido.trim(),

        // Otros campos
        fotoPerfil,
        updatedAt: new Date().toISOString(),
      }

      console.log("Datos a actualizar:", updateData)

      await updateDoc(userDocRef, updateData)

      console.log("Perfil actualizado exitosamente")
      setSuccess("Perfil actualizado correctamente")

      // Limpiar el mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(""), 3000)

      // Opcional: Recargar los datos del AuthProvider para reflejar los cambios inmediatamente
      // Esto actualizará el header y otros componentes que usen los datos del usuario
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err) {
      console.error("Error al actualizar perfil:", err)
      setError("Error al actualizar el perfil. Inténtalo de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !auth.currentUser) return

    setPasswordError("")
    setPasswordSuccess("")
    setChangingPassword(true)

    // Validaciones
    if (newPassword.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres")
      setChangingPassword(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden")
      setChangingPassword(false)
      return
    }

    try {
      console.log("=== CAMBIANDO CONTRASEÑA ===")

      // Reautenticar al usuario
      const credential = EmailAuthProvider.credential(auth.currentUser.email || "", currentPassword)
      await reauthenticateWithCredential(auth.currentUser, credential)
      console.log("Usuario reautenticado exitosamente")

      // Cambiar contraseña
      await updatePassword(auth.currentUser, newPassword)
      console.log("Contraseña actualizada exitosamente")

      setPasswordSuccess("Contraseña actualizada correctamente")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      setTimeout(() => setPasswordSuccess(""), 3000)
    } catch (err: any) {
      console.error("Error al cambiar contraseña:", err)

      if (err.code === "auth/wrong-password") {
        setPasswordError("La contraseña actual es incorrecta")
      } else if (err.code === "auth/weak-password") {
        setPasswordError("La contraseña es muy débil")
      } else if (err.code === "auth/too-many-requests") {
        setPasswordError("Demasiados intentos fallidos. Intenta más tarde.")
      } else {
        setPasswordError("Error al cambiar la contraseña. Inténtalo de nuevo.")
      }
    } finally {
      setChangingPassword(false)
    }
  }

  // Obtener iniciales para el avatar
  const getInitials = () => {
    if (nombre && apellido) {
      return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
    } else if (nombre) {
      return nombre.charAt(0).toUpperCase()
    } else if (user) {
      return user.email.charAt(0).toUpperCase()
    }
    return "U"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => router.push("/staff")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Panel
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
                <p className="text-gray-600">Gestiona tu información personal y contraseña</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Información Personal</span>
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span>Cambiar Contraseña</span>
            </TabsTrigger>
          </TabsList>

          {/* Pestaña de Información Personal */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>
                  Actualiza tu información personal y foto de perfil. Los cambios se guardarán en la base de datos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitProfile} className="space-y-6">
                  {/* Foto de perfil */}
                  <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-6">
                    <Avatar className="h-24 w-24">
                      {fotoPerfil ? (
                        <AvatarImage src={fotoPerfil || "/placeholder.svg"} alt="Foto de perfil" />
                      ) : (
                        <AvatarFallback className="bg-blue-600 text-white text-xl">{getInitials()}</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <Label htmlFor="foto-upload" className="cursor-pointer">
                        <div className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md transition-colors">
                          <Upload className="h-4 w-4" />
                          <span>{fotoPerfil ? "Cambiar foto" : "Subir foto"}</span>
                        </div>
                        <input
                          id="foto-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleFotoUpload}
                          className="hidden"
                        />
                      </Label>
                      <p className="text-xs text-gray-500 mt-2">Formatos: JPG, PNG, GIF. Tamaño máximo: 2MB</p>
                      {fotoPerfil && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFotoPerfil(null)}
                          className="mt-2 text-red-600 hover:text-red-700"
                        >
                          Eliminar foto
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Usuario (no editable) */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Usuario</Label>
                    <Input id="email" type="email" value={user?.email || ""} disabled className="bg-gray-50" />
                    <p className="text-xs text-gray-500">El usuario no se puede cambiar</p>
                  </div>

                  {/* Nombre y Apellido */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre *</Label>
                      <Input
                        id="nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Tu nombre"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apellido">Apellido *</Label>
                      <Input
                        id="apellido"
                        value={apellido}
                        onChange={(e) => setApellido(e.target.value)}
                        placeholder="Tu apellido"
                        required
                      />
                    </div>
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

                  {/* Botones */}
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={saving || !nombre.trim() || !apellido.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Cambio de Contraseña */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Cambiar Contraseña</CardTitle>
                <CardDescription>Actualiza tu contraseña para mantener segura tu cuenta</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Contraseña Actual *</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        placeholder="Ingresa tu contraseña actual"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">Nueva Contraseña *</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Ingresa tu nueva contraseña"
                      />
                      <p className="text-xs text-gray-500">Mínimo 6 caracteres</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirmar Nueva Contraseña *</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Confirma tu nueva contraseña"
                      />
                    </div>
                  </div>

                  {/* Alerta de seguridad */}
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      Por seguridad, se te pedirá iniciar sesión nuevamente después de cambiar tu contraseña.
                    </AlertDescription>
                  </Alert>

                  {/* Mensajes */}
                  {passwordError && (
                    <Alert variant="destructive">
                      <AlertDescription>{passwordError}</AlertDescription>
                    </Alert>
                  )}

                  {passwordSuccess && (
                    <Alert className="bg-green-50 text-green-800 border-green-200">
                      <AlertDescription>{passwordSuccess}</AlertDescription>
                    </Alert>
                  )}

                  {/* Botones */}
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      {changingPassword ? "Cambiando..." : "Cambiar Contraseña"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
