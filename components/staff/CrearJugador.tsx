"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Save, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useAuth } from "@/components/auth/AuthProvider"
import { useTheme } from "@/components/theme/ThemeProvider"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, collection, query, where, getDocs, addDoc, serverTimestamp, getDoc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebaseConfig"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

interface CrearJugadorProps {
  onJugadorCreated: () => void
}

export default function CrearJugador({ onJugadorCreated }: CrearJugadorProps) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const router = useRouter()

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    nombreID: "",
    documento: "",
    fechaNacimiento: undefined as Date | undefined,
    posicionPrincipal: "",
    perfilHabil: "",
    altura: "",
    peso: "",
    username: "",
    password: "",
    estado: "active" as "active" | "inactive",
  })

  const [fotoPerfil, setFotoPerfil] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [posicionesExistentes, setPosicionesExistentes] = useState<string[]>([
    "Arquero",
    "Defensor Central",
    "Lateral Derecho",
    "Lateral Izquierdo",
    "Mediocampista Defensivo",
    "Mediocampista Central",
    "Mediocampista Ofensivo",
    "Extremo Derecho",
    "Extremo Izquierdo",
    "Delantero Centro",
  ])
  const [perfilesHabiles, setPerfilesHabiles] = useState<string[]>(["Derecho", "Izquierdo"])
  const [showCalendar, setShowCalendar] = useState(false)
  const [clienteData, setClienteData] = useState<any>(null)

  // Cargar posiciones existentes
  useEffect(() => {
    const cargarPosiciones = async () => {
      try {
        const clientId = user?.clientId || clienteData?.cliente?.id || user?.id
        if (!clientId) return

        // Consultar la colección "players"
        const playersRef = collection(db, "players")
        const q = query(playersRef, where("clientId", "==", clientId))
        const querySnapshot = await getDocs(q)

        const posiciones = new Set<string>()
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.position) {
            posiciones.add(data.position)
          }
        })

        // Solo agregar posiciones que no estén ya en el array predefinido
        const nuevasPosiciones = Array.from(posiciones).filter((pos) => !posicionesExistentes.includes(pos))

        if (nuevasPosiciones.length > 0) {
          setPosicionesExistentes((prev) => [...prev, ...nuevasPosiciones])
        }
      } catch (error) {
        console.error("Error al cargar posiciones:", error)
      }
    }

    cargarPosiciones()
  }, [user?.clientId, clienteData, user?.id, posicionesExistentes])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError("")
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("La imagen debe ser menor a 2MB")
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        setFotoPerfil(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const validateForm = () => {
    if (!formData.nombre.trim()) return "El nombre es requerido"
    if (!formData.apellido.trim()) return "El apellido es requerido"
    if (!formData.nombreID.trim()) return "El nombre ID es requerido"
    if (!formData.username.trim()) return "El nombre de usuario es requerido"
    if (!formData.password || formData.password.length < 6) return "La contraseña debe tener al menos 6 caracteres"
    if (!formData.fechaNacimiento) return "La fecha de nacimiento es requerida"
    if (!formData.posicionPrincipal) return "La posición principal es requerida"
    if (!formData.perfilHabil) return "El perfil hábil es requerido"
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError("")

    try {
      console.log("Iniciando creación de jugador...")

      // Obtener datos del usuario actual
      const currentUser = auth.currentUser
      if (!currentUser) {
        setError("Usuario no autenticado")
        setLoading(false)
        return
      }

      console.log("Usuario staff autenticado:", currentUser.uid)

      // Obtener datos del usuario staff desde Firestore
      let staffData = null
      let clientId = null
      let themeId = ""
      let equipoNombre = ""
      let escudoEquipo = ""

      try {
        const userRef = doc(db, "users", currentUser.uid)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          staffData = userSnap.data()
          clientId = staffData.clientId
          themeId = staffData.themeId || ""
          equipoNombre = staffData.equipoNombre || ""
          escudoEquipo = staffData.escudoEquipo || ""
          console.log("Datos del staff encontrados:", staffData)
        } else {
          console.log("No se encontró documento del staff en Firestore")
        }
      } catch (error) {
        console.error("Error al obtener datos del staff:", error)
      }

      // Si no se encontró clientId, usar el UID del staff como clientId
      if (!clientId) {
        clientId = currentUser.uid
        console.log("Usando UID del staff como clientId:", clientId)

        // Crear documento básico del staff si no existe
        try {
          const basicStaffData = {
            email: currentUser.email || "",
            firebaseUid: currentUser.uid,
            clientId: currentUser.uid,
            rol: "staff",
            role: "staff",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }

          await setDoc(doc(db, "users", currentUser.uid), basicStaffData, { merge: true })
          console.log("Documento básico del staff creado/actualizado")
        } catch (error) {
          console.error("Error al crear documento del staff:", error)
        }
      }

      console.log("ClientId final a usar:", clientId)

      // Crear email único para el jugador
      const email = `${formData.username}@jugador.local`

      // Crear usuario en Firebase Auth
      console.log("Creando usuario en Firebase Auth...")
      const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password)
      const firebaseUser = userCredential.user

      console.log("Usuario creado en Auth:", firebaseUser.uid)

      // Preparar datos del jugador
      const jugadorData = {
        firebaseUid: firebaseUser.uid,
        email: email,
        username: formData.username,
        name: `${formData.nombre} ${formData.apellido}`,
        firstName: formData.nombre,
        lastName: formData.apellido,
        nombreID: formData.nombreID,
        documento: formData.documento,
        position: formData.posicionPrincipal,
        perfilHabil: formData.perfilHabil,
        rol: "jugador", // Asignar automáticamente rol jugador
        role: "jugador", // Mantener ambos para compatibilidad

        // Datos del cliente/equipo - IMPORTANTE: Usar exactamente el mismo clientId del staff
        clientId: clientId,
        themeId: themeId || "",
        equipoNombre: equipoNombre || "",
        escudoEquipo: escudoEquipo || "",

        // Datos específicos del jugador
        fechaNacimiento: formData.fechaNacimiento?.toISOString() || "",
        altura: formData.altura ? Number.parseInt(formData.altura) : null,
        peso: formData.peso ? Number.parseFloat(formData.peso) : null,
        fotoPerfil: fotoPerfil || "",
        status: formData.estado,

        // Estadísticas iniciales
        partidasJugadas: 0,
        torneosParticipados: 0,

        // Metadatos
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        creadoPor: currentUser.uid,
        lastActivity: serverTimestamp(),
      }

      console.log("Datos del jugador a guardar:", jugadorData)

      // Usar addDoc en lugar de setDoc para que Firebase genere el ID automáticamente
      await addDoc(collection(db, "players"), jugadorData)

      console.log("Jugador guardado exitosamente en Firestore en la colección 'players'")

      // Notificar éxito y redireccionar
      onJugadorCreated()
      // Redireccionar a la página de gestión de jugadores después de un breve delay
      setTimeout(() => {
        router.push("/staff/jugadores")
      }, 1500) // Delay para que el usuario vea el mensaje de éxito
    } catch (error: any) {
      console.error("Error al crear jugador:", error)

      if (error.code === "auth/email-already-in-use") {
        setError("El nombre de usuario ya está en uso")
      } else if (error.code === "auth/weak-password") {
        setError("La contraseña es muy débil")
      } else {
        setError("Error al crear el jugador: " + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primary }}>
        Nuevo Jugador
      </h2>

      {error && (
        <div className="mb-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Columna 1: Información Personal */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium pb-2 border-b" style={{ color: theme.text }}>
              Información Personal
            </h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="nombre" style={{ color: theme.text }}>
                  Nombre *
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange("nombre", e.target.value)}
                  placeholder="Nombre"
                  required
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.text,
                  }}
                />
              </div>

              <div>
                <Label htmlFor="apellido" style={{ color: theme.text }}>
                  Apellidos *
                </Label>
                <Input
                  id="apellido"
                  value={formData.apellido}
                  onChange={(e) => handleInputChange("apellido", e.target.value)}
                  placeholder="Apellidos"
                  required
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.text,
                  }}
                />
              </div>

              <div>
                <Label htmlFor="nombreID" style={{ color: theme.text }}>
                  Nombre ID *
                </Label>
                <Input
                  id="nombreID"
                  value={formData.nombreID}
                  onChange={(e) => handleInputChange("nombreID", e.target.value)}
                  placeholder="Nombre ID"
                  required
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.text,
                  }}
                />
              </div>

              <div>
                <Label htmlFor="documento" style={{ color: theme.text }}>
                  Nro. Documento *
                </Label>
                <Input
                  id="documento"
                  value={formData.documento}
                  onChange={(e) => handleInputChange("documento", e.target.value)}
                  placeholder="Número de documento"
                  required
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.text,
                  }}
                />
              </div>

              <div>
                <Label style={{ color: theme.text }}>Fecha de Nacimiento *</Label>
                <div className="space-y-2">
                  <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        style={{
                          borderColor: theme.border,
                          backgroundColor: theme.background,
                          color: theme.text,
                        }}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.fechaNacimiento ? (
                          format(formData.fechaNacimiento, "PPP", { locale: es })
                        ) : (
                          <span>Seleccionar fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.fechaNacimiento}
                        onSelect={(date) => {
                          setFormData((prev) => ({ ...prev, fechaNacimiento: date }))
                          setShowCalendar(false)
                        }}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                        captionLayout="dropdown-buttons"
                        fromYear={1950}
                        toYear={new Date().getFullYear()}
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="date"
                    value={formData.fechaNacimiento ? format(formData.fechaNacimiento, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setFormData((prev) => ({ ...prev, fechaNacimiento: new Date(e.target.value) }))
                      }
                    }}
                    style={{
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      color: theme.text,
                    }}
                    placeholder="o escribir fecha directamente"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Columna 2: Información Deportiva */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium pb-2 border-b" style={{ color: theme.text }}>
              Información Deportiva
            </h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="posicionPrincipal" style={{ color: theme.text }}>
                  Posición Principal *
                </Label>
                <Input
                  id="posicionPrincipal"
                  value={formData.posicionPrincipal}
                  onChange={(e) => handleInputChange("posicionPrincipal", e.target.value)}
                  placeholder="Escribir posición"
                  list="posiciones-list"
                  required
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.text,
                  }}
                />
                <datalist id="posiciones-list">
                  {posicionesExistentes.map((pos) => (
                    <option key={pos} value={pos} />
                  ))}
                </datalist>
              </div>

              <div>
                <Label htmlFor="perfilHabil" style={{ color: theme.text }}>
                  Perfil Hábil *
                </Label>
                <Select value={formData.perfilHabil} onValueChange={(value) => handleInputChange("perfilHabil", value)}>
                  <SelectTrigger
                    style={{
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      color: theme.text,
                    }}
                  >
                    <SelectValue placeholder="Seleccionar perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {perfilesHabiles.map((perfil) => (
                      <SelectItem key={perfil} value={perfil}>
                        {perfil}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="altura" style={{ color: theme.text }}>
                  Altura (cm)
                </Label>
                <Input
                  id="altura"
                  type="number"
                  value={formData.altura}
                  onChange={(e) => handleInputChange("altura", e.target.value)}
                  placeholder="Ej: 180"
                  min="120"
                  max="250"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.text,
                  }}
                />
              </div>

              <div>
                <Label htmlFor="peso" style={{ color: theme.text }}>
                  Peso (kg)
                </Label>
                <Input
                  id="peso"
                  type="number"
                  value={formData.peso}
                  onChange={(e) => handleInputChange("peso", e.target.value)}
                  placeholder="Ej: 75.5"
                  min="30"
                  max="200"
                  step="0.1"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.text,
                  }}
                />
              </div>

              <div>
                <Label htmlFor="foto" style={{ color: theme.text }}>
                  Foto del jugador
                </Label>
                <div className="mt-1">
                  <label
                    htmlFor="foto-upload"
                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Seleccionar archivo
                  </label>
                  <input
                    id="foto-upload"
                    name="foto-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="sr-only"
                  />
                  <span className="ml-2 text-sm text-gray-500">
                    {fotoPerfil ? "Archivo seleccionado" : "ningún archivo seleccionado"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Columna 3: Acceso al Sistema */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium pb-2 border-b" style={{ color: theme.text }}>
              Acceso al Sistema
            </h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="username" style={{ color: theme.text }}>
                  Nombre de Usuario *
                </Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value.toLowerCase())}
                  placeholder="Nombre de usuario"
                  required
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.text,
                  }}
                />
              </div>

              <div>
                <Label htmlFor="password" style={{ color: theme.text }}>
                  Contraseña *
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="Contraseña"
                  required
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                    color: theme.text,
                  }}
                />
              </div>

              <div>
                <Label style={{ color: theme.text }}>Estado del Usuario *</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value: "active" | "inactive") => setFormData((prev) => ({ ...prev, estado: value }))}
                >
                  <SelectTrigger
                    style={{
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      color: theme.text,
                    }}
                  >
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-md">
                <p className="text-blue-700 text-sm">
                  <span className="font-bold">Información:</span> Se creará automáticamente un usuario para que el
                  jugador pueda acceder a la aplicación con las credenciales proporcionadas.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-8 flex justify-start space-x-4">
          <Button
            type="submit"
            disabled={loading}
            className="px-6 py-2"
            style={{
              backgroundColor: "#0f172a",
              color: "white",
            }}
          >
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Guardando..." : "Guardar Jugador"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => onJugadorCreated()}
            disabled={loading}
            className="px-6 py-2"
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
