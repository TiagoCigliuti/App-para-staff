"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebaseConfig"
import { toast } from "react-toastify"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const CrearUsuario = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    username: "",
    password: "",
    clienteId: "",
    temaId: "",
  })
  const [clientes, setClientes] = useState<any[]>([])
  const [temas, setTemas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [emailGenerado, setEmailGenerado] = useState("")
  const router = useRouter()

  // Cargar clientes y temas al iniciar
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar todos los clientes
        const clientesSnapshot = await getDocs(collection(db, "clients"))
        const clientesData = clientesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setClientes(clientesData)

        // Cargar todos los temas
        const temasSnapshot = await getDocs(collection(db, "themes"))
        const temasData = temasSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setTemas(temasData)
      } catch (error) {
        console.error("Error al cargar datos:", error)
        toast.error("Error al cargar datos de clientes y temas")
      }
    }

    fetchData()
  }, [])

  // Generar email automáticamente basado en el username
  useEffect(() => {
    if (formData.username) {
      const email = `${formData.username}@staff.com`
      setEmailGenerado(email)
    } else {
      setEmailGenerado("")
    }
  }, [formData.username])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })

    // Limpiar error del campo cuando el usuario escribe
    if (formErrors[e.target.name]) {
      setFormErrors({
        ...formErrors,
        [e.target.name]: "",
      })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    })

    // Limpiar error del campo cuando el usuario selecciona
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: "",
      })
    }
  }

  const validateForm = async () => {
    const errors: Record<string, string> = {}

    // Validar campos obligatorios
    if (!formData.nombre) errors.nombre = "El nombre es obligatorio"
    if (!formData.apellido) errors.apellido = "El apellido es obligatorio"
    if (!formData.username) errors.username = "El nombre de usuario es obligatorio"
    if (!formData.password) errors.password = "La contraseña es obligatoria"
    if (!formData.clienteId) errors.clienteId = "Debe seleccionar un cliente"
    if (!formData.temaId) errors.temaId = "Debe seleccionar un tema"

    // Validar que la contraseña tenga al menos 6 caracteres
    if (formData.password && formData.password.length < 6) {
      errors.password = "La contraseña debe tener al menos 6 caracteres"
    }

    // Validar que el username no tenga espacios ni caracteres especiales
    if (formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = "El nombre de usuario solo puede contener letras, números y guiones bajos"
    }

    // Verificar si el username ya existe
    if (formData.username) {
      try {
        const q = query(collection(db, "users"), where("username", "==", formData.username))
        const querySnapshot = await getDocs(q)
        if (!querySnapshot.empty) {
          errors.username = "Este nombre de usuario ya está en uso"
        }
      } catch (error) {
        console.error("Error al verificar username:", error)
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)

    try {
      // Validar formulario
      const isValid = await validateForm()
      if (!isValid) {
        toast.error("Por favor, complete todos los campos obligatorios correctamente")
        setLoading(false)
        return
      }

      // Obtener datos del cliente y tema seleccionados
      const clienteSeleccionado = clientes.find((c) => c.id === formData.clienteId)
      const temaSeleccionado = temas.find((t) => t.id === formData.temaId)

      if (!clienteSeleccionado) {
        toast.error("Cliente seleccionado no encontrado")
        setLoading(false)
        return
      }

      // Crear usuario en Firebase Authentication con email generado
      const userCredential = await createUserWithEmailAndPassword(auth, emailGenerado, formData.password)
      const uid = userCredential.user.uid

      // Crear documento en Firestore con todos los datos necesarios
      await setDoc(doc(db, "users", uid), {
        // Datos básicos del usuario
        email: emailGenerado,
        username: formData.username,
        Nombre: formData.nombre,
        Apellido: formData.apellido,

        // Rol y estado por defecto
        rol: "staff",
        role: "staff", // Mantener ambos para compatibilidad
        estado: "activo",
        status: "activo", // Mantener ambos para compatibilidad

        // Datos del cliente asignado
        clientId: formData.clienteId,
        equipoNombre: clienteSeleccionado.nombre || clienteSeleccionado.name || clienteSeleccionado.clientName || "",
        escudoEquipo: clienteSeleccionado.logo || null,

        // Tema asignado
        themeId: formData.temaId,

        // Metadatos
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        firebaseUid: uid,

        // Datos adicionales necesarios para crear jugadores
        createdBy: "admin", // Indica que fue creado por un administrador
        permissions: ["create_players", "edit_players", "view_players"], // Permisos básicos para staff
      })

      toast.success("Usuario staff creado con éxito!")

      // Limpiar formulario
      setFormData({
        nombre: "",
        apellido: "",
        username: "",
        password: "",
        clienteId: "",
        temaId: "",
      })

      // Redireccionar inmediatamente a la gestión de usuarios
      router.push("/admin/usuarios")
    } catch (error: any) {
      console.error("Error al crear usuario:", error)

      let errorMessage = "Error al crear usuario"
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Este email ya está registrado"
      } else if (error.code === "auth/weak-password") {
        errorMessage = "La contraseña es muy débil"
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Crear Nuevo Usuario Staff</CardTitle>
          <CardDescription>
            Complete todos los campos para crear un nuevo usuario staff. El email se genera automáticamente basado en el
            nombre de usuario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información personal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="nombre">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className={formErrors.nombre ? "border-red-500" : ""}
                  placeholder="Ingrese el nombre"
                />
                {formErrors.nombre && <p className="text-red-500 text-sm mt-1">{formErrors.nombre}</p>}
              </div>

              <div>
                <Label htmlFor="apellido">
                  Apellido <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="apellido"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  className={formErrors.apellido ? "border-red-500" : ""}
                  placeholder="Ingrese el apellido"
                />
                {formErrors.apellido && <p className="text-red-500 text-sm mt-1">{formErrors.apellido}</p>}
              </div>
            </div>

            {/* Información de acceso */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="username">
                  Nombre de usuario <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={formErrors.username ? "border-red-500" : ""}
                  placeholder="ej: jperez"
                />
                {formErrors.username && <p className="text-red-500 text-sm mt-1">{formErrors.username}</p>}
              </div>

              <div>
                <Label htmlFor="password">
                  Contraseña <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={formErrors.password ? "border-red-500" : ""}
                  placeholder="Mínimo 6 caracteres"
                />
                {formErrors.password && <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>}
              </div>
            </div>

            {/* Email generado automáticamente */}
            {emailGenerado && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <Label className="text-sm font-medium text-gray-700">Email generado automáticamente:</Label>
                <p className="text-lg font-mono text-blue-600">{emailGenerado}</p>
              </div>
            )}

            {/* Asignaciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
              <div>
                <Label htmlFor="clienteId">
                  Cliente asignado <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.clienteId} onValueChange={(value) => handleSelectChange("clienteId", value)}>
                  <SelectTrigger className={formErrors.clienteId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Seleccione un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        <div className="flex items-center space-x-2">
                          {cliente.logo && (
                            <img
                              src={cliente.logo || "/placeholder.svg"}
                              alt={cliente.nombre || cliente.name || cliente.clientName}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          )}
                          <span>{cliente.nombre || cliente.name || cliente.clientName || `Cliente ${cliente.id}`}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.clienteId && <p className="text-red-500 text-sm mt-1">{formErrors.clienteId}</p>}
              </div>

              <div>
                <Label htmlFor="temaId">
                  Tema visual <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.temaId} onValueChange={(value) => handleSelectChange("temaId", value)}>
                  <SelectTrigger className={formErrors.temaId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Seleccione un tema" />
                  </SelectTrigger>
                  <SelectContent>
                    {temas.map((tema) => (
                      <SelectItem key={tema.id} value={tema.id}>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: tema.colorPrimario || tema.primaryColor || tema.color || "#000" }}
                          />
                          <span>{tema.nombre || tema.name || tema.themeName || `Tema ${tema.id}`}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.temaId && <p className="text-red-500 text-sm mt-1">{formErrors.temaId}</p>}
              </div>
            </div>

            {/* Información que se asignará automáticamente */}
            {formData.clienteId && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <Label className="text-sm font-medium text-gray-700">Datos que se asignarán automáticamente:</Label>
                <div className="mt-2 space-y-1">
                  <p className="text-sm">
                    <strong>Rol:</strong> Staff
                  </p>
                  <p className="text-sm">
                    <strong>Estado:</strong> Activo
                  </p>
                  {clientes.find((c) => c.id === formData.clienteId) && (
                    <>
                      <p className="text-sm">
                        <strong>Equipo:</strong>{" "}
                        {clientes.find((c) => c.id === formData.clienteId)?.nombre ||
                          clientes.find((c) => c.id === formData.clienteId)?.name ||
                          clientes.find((c) => c.id === formData.clienteId)?.clientName}
                      </p>
                      <p className="text-sm">
                        <strong>Escudo:</strong> {clientes.find((c) => c.id === formData.clienteId)?.logo ? "Sí" : "No"}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" className="mr-2" onClick={() => router.push("/admin/usuarios")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear Usuario Staff"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default CrearUsuario
