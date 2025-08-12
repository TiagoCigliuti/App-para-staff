"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import type React from "react"
import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDoc,
} from "firebase/firestore"
import { auth, db } from "@/lib/firebaseConfig"
import { testFirestoreConnection, testFirestoreWrite, createJugadorWithoutLogin } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  MoreVertical,
  Edit,
  Trash2,
  User,
  LogOut,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  Upload,
  X,
} from "lucide-react"
import { signOut } from "firebase/auth"

import { storage } from "@/lib/firebaseConfig"
import { ref, uploadString, getDownloadURL } from "firebase/storage"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface StaffUser {
  id: string
  nombre: string
  apellido: string
  email: string
  clienteId: string
  clienteNombre: string
  rol: string
  estado: string
}

interface Cliente {
  id: string
  nombre: string
  funcionalidades: string[]
  estado: string
  club?: string // Agregando propiedad club
}

interface Jugador {
  id: string
  nombre: string
  apellido: string
  nombreVisualizacion: string
  fechaNacimiento: string
  posicionPrincipal: string
  posicionSecundaria?: string
  altura?: number
  peso?: number
  username: string
  email: string
  clienteId: string
  clienteNombre: string
  rol: "jugador"
  estado: "activo" | "inactivo"
  fechaCreacion: Date
  creadoPor: string
  firebaseUid?: string
  foto?: string
  needsActivation?: boolean
  fotoUrl?: string
}

interface Posicion {
  id: string
  nombre: string
  clienteId: string
  fechaCreacion: Date
}

export default function JugadoresPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [posiciones, setPosiciones] = useState<Posicion[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [loadingJugadores, setLoadingJugadores] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingJugador, setEditingJugador] = useState<Jugador | null>(null)
  const [error, setError] = useState("")

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    nombreVisualizacion: "",
    fechaNacimiento: "",
    posicionPrincipal: "",
    posicionSecundaria: "",
    altura: "",
    peso: "",
    username: "",
    password: "",
    estado: "activo" as "activo" | "inactivo",
    foto: "",
  })

  // Agregar después de los estados existentes:
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")

  // Estados para sugerencias de posiciones
  const [sugerenciasPrincipal, setSugerenciasPrincipal] = useState<string[]>([])
  const [sugerenciasSecundaria, setSugerenciasSecundaria] = useState<string[]>([])
  const [showSugerenciasPrincipal, setShowSugerenciasPrincipal] = useState(false)
  const [showSugerenciasSecundaria, setShowSugerenciasSecundaria] = useState(false)

  const [firestoreConnected, setFirestoreConnected] = useState(false)
  const [firestoreWriteEnabled, setFirestoreWriteEnabled] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadStaffData()
    }
  }, [user])

  useEffect(() => {
    if (staffUser && cliente) {
      loadJugadores()
      loadPosiciones()
    }
  }, [staffUser, cliente])

  useEffect(() => {
    const checkFirestoreConnection = async () => {
      try {
        const connection = await testFirestoreConnection()
        setFirestoreConnected(connection.success)

        const write = await testFirestoreWrite()
        setFirestoreWriteEnabled(write.success)

        console.log("✅ Conexión a Firestore:", connection.success)
        console.log("✅ Permisos de escritura:", write.success)
      } catch (error) {
        console.error("❌ Error al verificar conexión a Firestore:", error)
        setFirestoreConnected(false)
        setFirestoreWriteEnabled(false)
      }
    }

    checkFirestoreConnection()
  }, [])

  // Generar nombre de visualización automáticamente
  useEffect(() => {
    if (formData.nombre && formData.apellido && !editingJugador) {
      const nombreViz = `${formData.nombre.charAt(0)}. ${formData.apellido}`
      setFormData((prev) => ({ ...prev, nombreVisualizacion: nombreViz }))
    }
  }, [formData.nombre, formData.apellido, editingJugador])

  // Generar username automáticamente
  useEffect(() => {
    if (formData.nombre && formData.apellido && !editingJugador) {
      const username = `${formData.nombre.charAt(0).toLowerCase()}${formData.apellido.toLowerCase()}`
      setFormData((prev) => ({ ...prev, username: username }))
    }
  }, [formData.nombre, formData.apellido, editingJugador])

  // Filtrar sugerencias para posición principal
  useEffect(() => {
    if (formData.posicionPrincipal.length > 0 && posiciones.length > 0) {
      const filtradas = posiciones
        .map((p) => p.nombre)
        .filter(
          (nombre) =>
            nombre.toLowerCase().includes(formData.posicionPrincipal.toLowerCase()) &&
            nombre.toLowerCase() !== formData.posicionPrincipal.toLowerCase(),
        )
        .slice(0, 5) // Máximo 5 sugerencias

      setSugerenciasPrincipal(filtradas)
      setShowSugerenciasPrincipal(filtradas.length > 0)
    } else {
      setSugerenciasPrincipal([])
      setShowSugerenciasPrincipal(false)
    }
  }, [formData.posicionPrincipal, posiciones])

  // Filtrar sugerencias para posición secundaria
  useEffect(() => {
    if (formData.posicionSecundaria.length > 0 && posiciones.length > 0) {
      const filtradas = posiciones
        .map((p) => p.nombre)
        .filter(
          (nombre) =>
            nombre.toLowerCase().includes(formData.posicionSecundaria.toLowerCase()) &&
            nombre.toLowerCase() !== formData.posicionSecundaria.toLowerCase(),
        )
        .slice(0, 5) // Máximo 5 sugerencias

      setSugerenciasSecundaria(filtradas)
      setShowSugerenciasSecundaria(filtradas.length > 0)
    } else {
      setSugerenciasSecundaria([])
      setShowSugerenciasSecundaria(false)
    }
  }, [formData.posicionSecundaria, posiciones])

  const loadStaffData = async () => {
    try {
      setLoadingData(true)
      setError("")
      console.log("🔄 Cargando datos del usuario staff:", user?.email)

      // Buscar usuario en la colección staff
      try {
        const staffRef = collection(db, "staff")
        const staffQuery = query(staffRef, where("email", "==", user?.email))
        const staffSnapshot = await getDocs(staffQuery)

        if (!staffSnapshot.empty) {
          const staffData = staffSnapshot.docs[0].data() as StaffUser
          staffData.id = staffSnapshot.docs[0].id
          setStaffUser(staffData)
          console.log("✅ Usuario staff encontrado:", staffData)
          console.log("🔍 ClienteId del staff:", staffData.clienteId)

          // Cargar datos del cliente asignado
          await loadClienteData(staffData.clienteId)
        } else {
          console.log("⚠️ Usuario staff no encontrado en Firestore")
          console.log("🔍 Buscando en colección 'users' como fallback...")

          // Buscar en la colección users como fallback
          const usersRef = collection(db, "users")
          const usersQuery = query(usersRef, where("email", "==", user?.email))
          const usersSnapshot = await getDocs(usersQuery)

          if (!usersSnapshot.empty) {
            const userData = usersSnapshot.docs[0].data()
            console.log("✅ Usuario encontrado en colección 'users':", userData)

            if (userData.rol === "staff" && userData.clienteId) {
              const staffData: StaffUser = {
                id: usersSnapshot.docs[0].id,
                nombre: userData.nombre || userData.firstName || "",
                apellido: userData.apellido || userData.lastName || "",
                email: userData.email,
                clienteId: userData.clienteId,
                clienteNombre: userData.clienteNombre || "",
                rol: userData.rol,
                estado: userData.estado || "activo",
              }
              setStaffUser(staffData)
              console.log("✅ Usuario staff creado desde 'users':", staffData)
              await loadClienteData(staffData.clienteId)
            } else {
              console.log("⚠️ Usuario no es staff o no tiene clienteId")
              await loadStaffFromLocalStorage()
            }
          } else {
            console.log("⚠️ Usuario no encontrado en ninguna colección")
            await loadStaffFromLocalStorage()
          }
        }
      } catch (firestoreError: any) {
        console.log("⚠️ Error consultando Firestore:", firestoreError.message)
        await loadStaffFromLocalStorage()
      }
    } catch (error: any) {
      console.error("❌ Error cargando datos del staff:", error)
      setError("Error cargando datos del usuario staff")
    } finally {
      setLoadingData(false)
    }
  }

  // Agregar esta nueva función después de loadStaffData:

  const createTemporaryStaffUser = async () => {
    try {
      // Crear un usuario staff temporal basado en el usuario autenticado
      const tempStaffUser: StaffUser = {
        id: "temp_" + Date.now(),
        nombre: user?.displayName?.split(" ")[0] || "Usuario",
        apellido: user?.displayName?.split(" ")[1] || "Staff",
        email: user?.email || "",
        clienteId: "temp_client_" + Date.now(),
        clienteNombre: "Cliente Temporal",
        rol: "staff",
        estado: "activo",
      }

      // Crear un cliente temporal también
      const tempCliente: Cliente = {
        id: tempStaffUser.clienteId,
        nombre: "Cliente Temporal",
        funcionalidades: ["jugadores", "entrenamientos", "partidos", "evaluaciones"],
        estado: "activo",
      }

      setStaffUser(tempStaffUser)
      setCliente(tempCliente)

      console.log("✅ Usuario staff temporal creado:", tempStaffUser)
      console.log("✅ Cliente temporal creado:", tempCliente)

      // Guardar en localStorage para persistencia
      const tempUsers = [tempStaffUser]
      const tempClientes = [tempCliente]

      localStorage.setItem("usuarios", JSON.stringify(tempUsers))
      localStorage.setItem("clientes", JSON.stringify(tempClientes))

      console.log("💾 Datos temporales guardados en localStorage")
    } catch (error) {
      console.error("❌ Error creando usuario temporal:", error)
      setError("No se pudo inicializar el usuario staff. Contacta al administrador.")
    }
  }

  const loadStaffFromLocalStorage = async () => {
    try {
      const savedUsers = localStorage.getItem("usuarios")
      if (savedUsers) {
        const users = JSON.parse(savedUsers)
        const foundUser = users.find((u: any) => u.email === user?.email)
        if (foundUser) {
          setStaffUser(foundUser)
          console.log("✅ Usuario staff encontrado en localStorage:", foundUser)
          await loadClienteFromLocalStorage(foundUser.clienteId)
          return
        }
      }

      // Si no se encuentra en localStorage, crear usuario temporal
      console.log("⚠️ Usuario no encontrado en localStorage, creando temporal...")
      await createTemporaryStaffUser()
    } catch (error) {
      console.error("❌ Error cargando desde localStorage:", error)
      await createTemporaryStaffUser()
    }
  }

  const loadClienteData = async (clienteId: string) => {
    try {
      console.log("🔄 Cargando datos del cliente:", clienteId)

      // Intentar cargar desde Firestore
      try {
        const clienteRef = doc(db, "clientes", clienteId)
        const clienteSnapshot = await getDoc(clienteRef)

        if (clienteSnapshot.exists()) {
          const clienteData = clienteSnapshot.data() as Cliente
          clienteData.id = clienteSnapshot.id
          setCliente(clienteData)
          console.log("✅ Cliente encontrado:", clienteData)
        } else {
          console.log("⚠️ Cliente no encontrado en Firestore, usando localStorage")
          await loadClienteFromLocalStorage(clienteId)
        }
      } catch (firestoreError: any) {
        console.log("⚠️ Error consultando cliente en Firestore, usando localStorage:", firestoreError.message)
        await loadClienteFromLocalStorage(clienteId)
      }
    } catch (error) {
      console.error("❌ Error cargando datos del cliente:", error)
      setError("Error cargando datos del cliente")
    }
  }

  const loadClienteFromLocalStorage = async (clienteId: string) => {
    try {
      const savedClientes = localStorage.getItem("clientes")
      if (savedClientes) {
        const clientes = JSON.parse(savedClientes)
        const foundCliente = clientes.find((c: any) => c.id === clienteId)
        if (foundCliente) {
          setCliente(foundCliente)
          console.log("✅ Cliente encontrado en localStorage:", foundCliente)
          return
        }
      }

      // Si no se encuentra el cliente, crear uno temporal
      console.log("⚠️ Cliente no encontrado, creando temporal...")
      const tempCliente: Cliente = {
        id: clienteId,
        nombre: "Cliente Temporal",
        funcionalidades: ["jugadores", "entrenamientos", "partidos", "evaluaciones"],
        estado: "activo",
      }

      setCliente(tempCliente)
      console.log("✅ Cliente temporal creado:", tempCliente)
    } catch (error) {
      console.error("❌ Error cargando cliente desde localStorage:", error)
      setError("Error cargando datos del cliente")
    }
  }

  const loadPosiciones = async () => {
    try {
      console.log("🔄 Cargando posiciones del cliente:", cliente?.id)

      // Inicializar como array vacío
      setPosiciones([])

      try {
        const posicionesRef = collection(db, "posiciones")
        const posicionesQuery = query(posicionesRef, where("clienteId", "==", cliente?.id), orderBy("nombre", "asc"))
        const posicionesSnapshot = await getDocs(posicionesQuery)

        if (posicionesSnapshot.empty) {
          console.log("✅ No hay posiciones creadas para este cliente")
          setPosiciones([])
          // Limpiar localStorage también
          localStorage.removeItem(`posiciones_${cliente?.id}`)
          return
        }

        const posicionesData = posicionesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          fechaCreacion: doc.data().fechaCreacion?.toDate() || new Date(),
        })) as Posicion[]

        setPosiciones(posicionesData)
        console.log("✅ Posiciones cargadas desde Firestore:", posicionesData.length, posicionesData)

        // Backup en localStorage
        localStorage.setItem(`posiciones_${cliente?.id}`, JSON.stringify(posicionesData))
      } catch (firestoreError: any) {
        console.log("⚠️ Error con Firestore, usando localStorage:", firestoreError.message)

        // Fallback a localStorage
        const savedPosiciones = localStorage.getItem(`posiciones_${cliente?.id}`)
        if (savedPosiciones) {
          const parsedPosiciones = JSON.parse(savedPosiciones)
          if (Array.isArray(parsedPosiciones) && parsedPosiciones.length > 0) {
            const posicionesConFecha = parsedPosiciones.map((posicion: any) => ({
              ...posicion,
              fechaCreacion: new Date(posicion.fechaCreacion),
            }))
            setPosiciones(posicionesConFecha)
            console.log("✅ Posiciones cargadas desde localStorage:", posicionesConFecha.length, posicionesConFecha)
          } else {
            setPosiciones([])
            console.log("✅ No hay posiciones en localStorage, array vacío")
          }
        } else {
          setPosiciones([])
          console.log("✅ No hay posiciones guardadas, array vacío")
        }
      }
    } catch (error) {
      console.error("❌ Error cargando posiciones:", error)
      setPosiciones([])
    }
  }

  const loadJugadores = async () => {
    try {
      setLoadingJugadores(true)
      console.log("🔄 Cargando jugadores del cliente:", cliente?.id)
      console.log("🔄 Cliente completo:", cliente)
      console.log("🔄 Staff user completo:", staffUser)

      // Verificar que tenemos los datos necesarios
      if (!cliente?.id) {
        console.error("❌ No hay clienteId disponible")
        setJugadores([])
        setLoadingJugadores(false)
        return
      }

      // SIEMPRE intentar cargar desde Firestore primero
      try {
        console.log("🔍 Iniciando consulta a Firestore...")
        const jugadoresRef = collection(db, "jugadores")
        console.log("📊 Referencia a colección jugadores creada")

        // Primero, intentar obtener TODOS los jugadores para debug
        console.log("🔍 Obteniendo TODOS los jugadores para debug...")
        const allJugadoresSnapshot = await getDocs(jugadoresRef)
        console.log("📊 Total de jugadores en la colección:", allJugadoresSnapshot.size)

        if (allJugadoresSnapshot.size > 0) {
          console.log("📄 Jugadores encontrados:")
          allJugadoresSnapshot.docs.forEach((doc, index) => {
            const data = doc.data()
            console.log(`📄 Jugador ${index + 1}:`, {
              id: doc.id,
              nombre: data.nombre,
              apellido: data.apellido,
              clienteId: data.clienteId,
              rol: data.rol,
              estado: data.estado,
            })
          })
        } else {
          console.log("⚠️ No hay jugadores en la colección")
        }

        // Ahora hacer la consulta filtrada
        console.log("🔍 Consultando jugadores para clienteId:", cliente.id)
        const jugadoresQuery = query(jugadoresRef, where("clienteId", "==", cliente.id))

        console.log("📊 Ejecutando consulta filtrada...")
        const jugadoresSnapshot = await getDocs(jugadoresQuery)
        console.log("📊 Jugadores encontrados para este cliente:", jugadoresSnapshot.size)

        if (jugadoresSnapshot.size === 0) {
          console.log("⚠️ No se encontraron jugadores para clienteId:", cliente.id)
          console.log("🔍 Verificando si existen jugadores con clienteIds similares...")

          // Buscar jugadores con clienteIds que contengan parte del ID
          const allDocs = allJugadoresSnapshot.docs
          const similarClients = allDocs.filter((doc) => {
            const data = doc.data()
            return data.clienteId && (data.clienteId.includes(cliente.id) || cliente.id.includes(data.clienteId))
          })

          if (similarClients.length > 0) {
            console.log("🔍 Jugadores con clienteIds similares encontrados:")
            similarClients.forEach((doc) => {
              const data = doc.data()
              console.log("📄", {
                id: doc.id,
                nombre: data.nombre,
                clienteId: data.clienteId,
                expectedClienteId: cliente.id,
              })
            })
          }
        }

        const jugadoresData = jugadoresSnapshot.docs.map((doc) => {
          const data = doc.data()
          console.log("📄 Procesando jugador:", doc.id, {
            nombre: data.nombre,
            apellido: data.apellido,
            clienteId: data.clienteId,
            fechaCreacion: data.fechaCreacion,
          })

          return {
            id: doc.id,
            ...data,
            fechaCreacion: data.fechaCreacion?.toDate() || new Date(),
          }
        }) as Jugador[]

        setJugadores(jugadoresData)
        console.log("✅ Jugadores cargados desde Firestore:", jugadoresData.length)

        // Solo hacer backup en localStorage después de cargar exitosamente desde Firestore
        if (jugadoresData.length > 0) {
          localStorage.setItem(`jugadores_${cliente.id}`, JSON.stringify(jugadoresData))
          console.log("💾 Backup guardado en localStorage")
        }
      } catch (firestoreError: any) {
        console.error("❌ Error detallado con Firestore:", firestoreError)
        console.error("❌ Código de error:", firestoreError.code)
        console.error("❌ Mensaje de error:", firestoreError.message)
        console.error("❌ Stack trace:", firestoreError.stack)

        // Solo usar localStorage como último recurso si Firestore falla completamente
        if (firestoreError.code === "unavailable" || firestoreError.code === "permission-denied") {
          console.log("🔄 Firestore no disponible, usando localStorage como fallback temporal")

          const savedJugadores = localStorage.getItem(`jugadores_${cliente.id}`)
          if (savedJugadores) {
            const parsedJugadores = JSON.parse(savedJugadores).map((jugador: any) => ({
              ...jugador,
              fechaCreacion: new Date(jugador.fechaCreacion),
            }))
            setJugadores(parsedJugadores)
            console.log("⚠️ Jugadores cargados desde localStorage (fallback):", parsedJugadores.length)
          } else {
            setJugadores([])
            console.log("✅ No hay jugadores en localStorage, array vacío")
          }
        } else {
          // Para otros errores, mostrar array vacío
          setJugadores([])
          console.log("❌ Error de Firestore, mostrando array vacío")
        }
      }
    } catch (error) {
      console.error("❌ Error general cargando jugadores:", error)
      setJugadores([])
    } finally {
      setLoadingJugadores(false)
    }
  }

  const generateEmail = (username: string) => {
    return `${username}@jugador.com`
  }

  const handleSugerenciaPrincipalClick = (sugerencia: string) => {
    setFormData({ ...formData, posicionPrincipal: sugerencia })
    setShowSugerenciasPrincipal(false)
  }

  const handleSugerenciaSecundariaClick = (sugerencia: string) => {
    setFormData({ ...formData, posicionSecundaria: sugerencia })
    setShowSugerenciasSecundaria(false)
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
        setFormData({ ...formData, foto: result })
        setFormError("")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveFoto = () => {
    setFormData({ ...formData, foto: "" })
    if (fileInputRef) {
      fileInputRef.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError("")
    setFormSuccess("")

    try {
      // Validaciones
      if (!formData.nombre || !formData.apellido || !formData.fechaNacimiento || !formData.posicionPrincipal) {
        setFormError("Todos los campos obligatorios deben ser completados")
        setFormLoading(false)
        return
      }

      // Validar fecha de nacimiento
      const fechaNacimiento = new Date(formData.fechaNacimiento)
      const hoy = new Date()
      if (fechaNacimiento >= hoy) {
        setFormError("La fecha de nacimiento debe ser anterior a hoy")
        setFormLoading(false)
        return
      }

      let fotoUrl: string | null = null
      if (formData.foto && formData.foto.startsWith("data:image")) {
        const path = `jugadores/${cliente?.id || "sin-cliente"}/${formData.username}-${Date.now()}`
        const imageRef = ref(storage, path)
        // Cargamos el data URL (base64)
        await uploadString(imageRef, formData.foto, "data_url")
        fotoUrl = await getDownloadURL(imageRef)
      }

      // CAMBIO IMPORTANTE: Usar directamente el texto de las posiciones
      const posicionPrincipalTexto = formData.posicionPrincipal.trim()
      const posicionSecundariaTexto = formData.posicionSecundaria.trim() || null

      // Opcional: Crear las posiciones en la colección de posiciones para futuras sugerencias
      // pero NO usar sus IDs en el jugador
      if (firestoreConnected && firestoreWriteEnabled) {
        try {
          // Verificar si la posición principal ya existe en la colección posiciones
          const posicionPrincipalExistente = posiciones.find(
            (p) => p.nombre.toLowerCase() === posicionPrincipalTexto.toLowerCase(),
          )

          if (!posicionPrincipalExistente) {
            // Crear nueva posición principal para futuras sugerencias
            const posicionesRef = collection(db, "posiciones")
            const nuevaPosicionData = {
              nombre: posicionPrincipalTexto,
              clienteId: cliente?.id || "",
              fechaCreacion: new Date(),
              creadoPor: user?.email || "unknown",
            }
            await addDoc(posicionesRef, nuevaPosicionData)
            console.log("✅ Nueva posición principal agregada a la colección posiciones:", posicionPrincipalTexto)
          }

          // Hacer lo mismo para la posición secundaria si existe
          if (posicionSecundariaTexto) {
            const posicionSecundariaExistente = posiciones.find(
              (p) => p.nombre.toLowerCase() === posicionSecundariaTexto.toLowerCase(),
            )

            if (!posicionSecundariaExistente) {
              const posicionesRef = collection(db, "posiciones")
              const nuevaPosicionData = {
                nombre: posicionSecundariaTexto,
                clienteId: cliente?.id || "",
                fechaCreacion: new Date(),
                creadoPor: user?.email || "unknown",
              }
              await addDoc(posicionesRef, nuevaPosicionData)
              console.log("✅ Nueva posición secundaria agregada a la colección posiciones:", posicionSecundariaTexto)
            }
          }

          // Recargar posiciones para futuras sugerencias
          await loadPosiciones()
        } catch (error) {
          console.log("⚠️ Error creando posiciones en la colección, continuando con el jugador:", error)
        }
      }

      if (editingJugador) {
        // Actualizar jugador existente
        console.log("🔄 Actualizando jugador:", editingJugador.id)

        if (!firestoreConnected || !firestoreWriteEnabled) {
          setFormError("No se puede actualizar: sin conexión o permisos insuficientes en la base de datos")
          setFormLoading(false)
          return
        }

        try {
          const jugadorRef = doc(db, "jugadores", editingJugador.id)
          const updateData = {
            nombre: formData.nombre,
            apellido: formData.apellido,
            nombreVisualizacion: formData.nombreVisualizacion,
            fechaNacimiento: formData.fechaNacimiento,
            posicionPrincipal: posicionPrincipalTexto,
            posicionSecundaria: posicionSecundariaTexto,
            altura: formData.altura ? Number.parseFloat(formData.altura) : null,
            peso: formData.peso ? Number.parseFloat(formData.peso) : null,
            username: formData.username,
            estado: formData.estado,
            fechaActualizacion: new Date(),
            actualizadoPor: user?.email || "unknown",
            ...(fotoUrl ? { fotoUrl } : {}),
          }

          await updateDoc(jugadorRef, updateData)
          console.log("✅ Jugador actualizado en Firestore:", editingJugador.id)

          setFormSuccess("Jugador actualizado correctamente")
          await loadJugadores()
        } catch (error) {
          console.log("⚠️ Error actualizando en Firestore:", error)
          setFormError("Error al actualizar el jugador")
        }
      } else {
        // Crear nuevo jugador
        console.log("🔄 Creando nuevo jugador...")

        // Generar email
        const email = generateEmail(formData.username)

        // Verificar si ya existe un jugador con el mismo username
        const existingJugador = jugadores.find((j) => j.username === formData.username)
        if (existingJugador) {
          setFormError("Ya existe un jugador con este nombre de usuario")
          setFormLoading(false)
          return
        }

        // Preparar datos del jugador
        const jugadorData = {
          nombre: formData.nombre,
          apellido: formData.apellido,
          nombreVisualizacion: formData.nombreVisualizacion,
          fechaNacimiento: formData.fechaNacimiento,
          posicionPrincipal: posicionPrincipalTexto,
          posicionSecundaria: posicionSecundariaTexto,
          altura: formData.altura ? Number.parseFloat(formData.altura) : null,
          peso: formData.peso ? Number.parseFloat(formData.peso) : null,
          username: formData.username,
          email: email,
          clienteId: cliente?.id || "",
          clienteNombre: cliente?.nombre || "",
          rol: "jugador",
          estado: formData.estado,
          creadoPor: user?.email || "unknown",
          fotoUrl: fotoUrl || null,
        }

        // Usar la nueva función que no afecta la sesión actual
        try {
          console.log("🔄 Creando jugador sin afectar sesión actual...")
          console.log("📊 Datos del jugador a crear:", jugadorData)

          const result = await createJugadorWithoutLogin(jugadorData, formData.password)

          if (result.success) {
            console.log("✅ Jugador creado exitosamente:", result.jugadorId)
            setFormSuccess(result.message || "Jugador creado correctamente")

            // Recargar jugadores
            await loadJugadores()
          } else {
            throw new Error("Error creando jugador")
          }
        } catch (createError: any) {
          console.error("❌ Error creando jugador:", createError)
          setFormError("Error al crear el jugador: " + (createError.message || "Error desconocido"))
          setFormLoading(false)
          return
        }
      }

      // Limpiar formulario y cerrar dialog
      setFormData({
        nombre: "",
        apellido: "",
        nombreVisualizacion: "",
        fechaNacimiento: "",
        posicionPrincipal: "",
        posicionSecundaria: "",
        altura: "",
        peso: "",
        username: "",
        password: "",
        estado: "activo",
        foto: "",
      })
      setShowCreateDialog(false)
      setEditingJugador(null)
      setShowSugerenciasPrincipal(false)
      setShowSugerenciasSecundaria(false)

      setTimeout(() => setFormSuccess(""), 5000)
    } catch (error: any) {
      console.error("❌ Error guardando jugador:", error)
      setFormError("Error al guardar el jugador: " + (error.message || "Error desconocido"))
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (jugador: Jugador) => {
    setEditingJugador(jugador)
    setFormData({
      nombre: jugador.nombre,
      apellido: jugador.apellido,
      nombreVisualizacion: jugador.nombreVisualizacion,
      fechaNacimiento: jugador.fechaNacimiento,
      posicionPrincipal: jugador.posicionPrincipal,
      posicionSecundaria: jugador.posicionSecundaria || "",
      altura: jugador.altura ? jugador.altura.toString() : "",
      peso: jugador.peso ? jugador.peso.toString() : "",
      username: jugador.username,
      password: "",
      estado: jugador.estado,
      foto: jugador.foto || "",
    })
    setShowCreateDialog(true)
  }

  const handleDelete = async (jugadorId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este jugador?")) return

    try {
      console.log("🔄 Eliminando jugador:", jugadorId)

      try {
        // Eliminar de la colección jugadores
        await deleteDoc(doc(db, "jugadores", jugadorId))
        console.log("✅ Jugador eliminado de Firestore:", jugadorId)

        // También intentar eliminar de la colección users si existe
        try {
          const jugadorAEliminar = jugadores.find((j) => j.id === jugadorId)
          if (jugadorAEliminar?.firebaseUid) {
            const usersRef = collection(db, "users")
            const usersQuery = query(usersRef, where("firebaseUid", "==", jugadorAEliminar.firebaseUid))
            const usersSnapshot = await getDocs(usersQuery)

            if (!usersSnapshot.empty) {
              await deleteDoc(usersSnapshot.docs[0].ref)
              console.log("✅ Usuario eliminado de colección 'users'")
            }
          }
        } catch (userError) {
          console.log("⚠️ Error eliminando de colección 'users':", userError)
        }

        await loadJugadores()
      } catch (firestoreError) {
        console.log("⚠️ Error eliminando de Firestore:", firestoreError)

        // Fallback: eliminar de localStorage
        const updatedJugadores = jugadores.filter((jugador) => jugador.id !== jugadorId)
        setJugadores(updatedJugadores)
        localStorage.setItem(`jugadores_${cliente?.id}`, JSON.stringify(updatedJugadores))
      }
    } catch (error) {
      console.error("❌ Error eliminando jugador:", error)
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

  // CAMBIO IMPORTANTE: Simplificar esta función para mostrar directamente el texto
  const getPosicionNombre = (posicion: string) => {
    // Ahora las posiciones se guardan como texto directamente
    return posicion || "Sin posición"
  }

  const calcularEdad = (fechaNacimiento: string) => {
    const nacimiento = new Date(fechaNacimiento)
    const hoy = new Date()
    let edad = hoy.getFullYear() - nacimiento.getFullYear()
    const mes = hoy.getMonth() - nacimiento.getMonth()
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--
    }
    return edad
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando gestión de jugadores...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
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

  const initialsFrom = (nombre?: string, apellido?: string, displayName?: string, email?: string) => {
    const base =
      [nombre, apellido].filter(Boolean).join(" ").trim() || (displayName || "").trim() || (email || "").trim() || "U"
    const parts = base.split(/\s+/).filter(Boolean)
    const first = parts[0]?.[0] ?? "U"
    const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
    return (first + last).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => router.push("/staff")} className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Jugadores</h1>
                <p className="text-gray-600 mt-1">{cliente ? cliente.club : "Cargando..."}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Staff</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    {getUserInitials()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user.displayName || "Usuario"}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/staff/perfil")}>
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

      {/* Alerta de permisos si es necesario */}
      {firestoreConnected && !firestoreWriteEnabled && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Permisos limitados:</strong> Puedes ver los datos pero no crear o editar jugadores. Contacta al
                administrador para obtener permisos completos.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header con botón crear */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Jugadores ({loadingJugadores ? "..." : jugadores.length})
            </h2>
            <p className="text-gray-600 text-sm mt-1">Gestiona la información de los jugadores</p>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingJugador(null)
                  setFormData({
                    nombre: "",
                    apellido: "",
                    nombreVisualizacion: "",
                    fechaNacimiento: "",
                    posicionPrincipal: "",
                    posicionSecundaria: "",
                    altura: "",
                    peso: "",
                    username: "",
                    password: "",
                    estado: "activo",
                    foto: "",
                  })
                  setFormError("")
                  setFormSuccess("")
                  setShowSugerenciasPrincipal(false)
                  setShowSugerenciasSecundaria(false)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Jugador
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingJugador ? "Editar Jugador" : "Crear Nuevo Jugador"}</DialogTitle>
                <DialogDescription>
                  {editingJugador
                    ? "Actualiza la información del jugador"
                    : "Completa los datos para crear un nuevo jugador"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Columna Izquierda - Información Personal */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Información Personal</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre *</Label>
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
                        <Label htmlFor="apellido">Apellido *</Label>
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
                      <Label htmlFor="nombreVisualizacion">Nombre para Visualizar</Label>
                      <Input
                        id="nombreVisualizacion"
                        type="text"
                        value={formData.nombreVisualizacion}
                        onChange={(e) => setFormData({ ...formData, nombreVisualizacion: e.target.value })}
                        placeholder="J. Pérez"
                        disabled={formLoading}
                      />
                      <p className="text-xs text-gray-500">Se genera automáticamente pero puedes editarlo</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fechaNacimiento">Fecha de Nacimiento *</Label>
                      <Input
                        id="fechaNacimiento"
                        type="date"
                        value={formData.fechaNacimiento}
                        onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                        required
                        disabled={formLoading}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="altura">Altura (cm)</Label>
                        <Input
                          id="altura"
                          type="number"
                          value={formData.altura}
                          onChange={(e) => setFormData({ ...formData, altura: e.target.value })}
                          placeholder="175"
                          min="100"
                          max="250"
                          disabled={formLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="peso">Peso (kg)</Label>
                        <Input
                          id="peso"
                          type="number"
                          value={formData.peso}
                          onChange={(e) => setFormData({ ...formData, peso: e.target.value })}
                          placeholder="70"
                          min="30"
                          max="200"
                          disabled={formLoading}
                        />
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

                    {/* Foto del jugador */}
                    <div className="space-y-2">
                      <Label htmlFor="foto">Foto del Jugador</Label>
                      <div className="space-y-3">
                        {formData.foto ? (
                          <div className="relative">
                            <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                              <img
                                src={formData.foto || "/placeholder.svg"}
                                alt="Foto del jugador"
                                className="max-h-44 max-w-full object-contain rounded-lg"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleRemoveFoto}
                              className="absolute top-2 right-2 bg-white shadow-md"
                              disabled={formLoading}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                            onClick={() => fileInputRef?.click()}
                          >
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600">Click para subir foto</p>
                            <p className="text-xs text-gray-500">PNG, JPG hasta 2MB</p>
                          </div>
                        )}
                        <input
                          ref={(ref) => setFileInputRef(ref)}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={formLoading}
                        />
                        {!formData.foto && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef?.click()}
                            disabled={formLoading}
                            className="w-full"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Seleccionar Foto
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Opcional - Sube una foto del jugador para facilitar su identificación
                      </p>
                    </div>
                  </div>

                  {/* Columna Derecha - Posiciones y Credenciales */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Posiciones y Credenciales</h3>

                    <div className="space-y-2 relative">
                      <Label htmlFor="posicionPrincipal">Posición Principal *</Label>
                      <Input
                        id="posicionPrincipal"
                        type="text"
                        value={formData.posicionPrincipal}
                        onChange={(e) => setFormData({ ...formData, posicionPrincipal: e.target.value })}
                        onFocus={() => setShowSugerenciasPrincipal(sugerenciasPrincipal.length > 0)}
                        onBlur={() => setTimeout(() => setShowSugerenciasPrincipal(false), 200)}
                        placeholder="Ej: Delantero Centro, Mediocampista, Defensor..."
                        required
                        disabled={formLoading}
                      />
                      {showSugerenciasPrincipal && sugerenciasPrincipal.length > 0 && (
                        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                          {sugerenciasPrincipal.map((sugerencia, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                              onClick={() => handleSugerenciaPrincipalClick(sugerencia)}
                            >
                              {sugerencia}
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        {posiciones.length > 0
                          ? "Escribe la posición - aparecerán sugerencias basadas en posiciones ya creadas en tu equipo"
                          : "Escribe la posición - será la primera posición creada para tu equipo"}
                      </p>
                    </div>

                    <div className="space-y-2 relative">
                      <Label htmlFor="posicionSecundaria">Posición Secundaria</Label>
                      <Input
                        id="posicionSecundaria"
                        type="text"
                        value={formData.posicionSecundaria}
                        onChange={(e) => setFormData({ ...formData, posicionSecundaria: e.target.value })}
                        onFocus={() => setShowSugerenciasSecundaria(sugerenciasSecundaria.length > 0)}
                        onBlur={() => setTimeout(() => setShowSugerenciasSecundaria(false), 200)}
                        placeholder="Ej: Lateral Derecho, Extremo..."
                        disabled={formLoading}
                      />
                      {showSugerenciasSecundaria && sugerenciasSecundaria.length > 0 && (
                        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                          {sugerenciasSecundaria.map((sugerencia, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                              onClick={() => handleSugerenciaSecundariaClick(sugerencia)}
                            >
                              {sugerencia}
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        {posiciones.length > 0
                          ? "Opcional - Escribe la posición, aparecerán sugerencias basadas en posiciones ya creadas en tu equipo"
                          : "Opcional - Escribe la posición, será agregada a las posiciones de tu equipo"}
                      </p>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="text-md font-semibold text-gray-900">Credenciales de Acceso</h4>

                      <div className="space-y-2">
                        <Label htmlFor="username">Nombre de Usuario</Label>
                        <Input
                          id="username"
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                          placeholder="jperez"
                          required
                          disabled={formLoading}
                        />
                        <p className="text-xs text-gray-500">
                          Email generado: {formData.username ? generateEmail(formData.username) : ""}
                        </p>
                      </div>

                      {!editingJugador && (
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

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Rol:</strong> Jugador (asignado automáticamente)
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          El jugador podrá acceder al sistema con sus credenciales en su primer login.
                        </p>
                      </div>
                    </div>
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
                      setEditingJugador(null)
                      setFormData({
                        nombre: "",
                        apellido: "",
                        nombreVisualizacion: "",
                        fechaNacimiento: "",
                        posicionPrincipal: "",
                        posicionSecundaria: "",
                        altura: "",
                        peso: "",
                        username: "",
                        password: "",
                        estado: "activo",
                        foto: "",
                      })
                      setShowSugerenciasPrincipal(false)
                      setShowSugerenciasSecundaria(false)
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
                        {editingJugador ? "Actualizando..." : "Creando..."}
                      </div>
                    ) : editingJugador ? (
                      "Actualizar Jugador"
                    ) : (
                      "Crear Jugador"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de jugadores */}
        {loadingJugadores ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : jugadores.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserPlus className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay jugadores</h3>
              <p className="text-gray-500 text-center mb-6">
                Comienza creando tu primer jugador para gestionar el equipo.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Jugador
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jugadores
              .sort((a, b) => {
                const nombreA = `${a.nombre ?? ""} ${a.apellido ?? ""}`.trim().toLowerCase()
                const nombreB = `${b.nombre ?? ""} ${b.apellido ?? ""}`.trim().toLowerCase()
                return nombreA.localeCompare(nombreB)
              })
              .map((jugador) => (
                <Card key={jugador.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {(() => {
                          const initials = initialsFrom(
                            jugador.nombre,
                            jugador.apellido,
                            jugador.nombreVisualizacion,
                            jugador.email,
                          )
                          return (
                            <Avatar className="h-12 w-12 overflow-hidden rounded-full ring-1 ring-border">
                              <AvatarImage
                                src={jugador.fotoUrl || undefined}
                                alt={`Foto de ${jugador.nombreVisualizacion}`}
                                className="h-full w-full object-cover"
                              />
                              <AvatarFallback className="font-semibold">{initials}</AvatarFallback>
                            </Avatar>
                          )
                        })()}
                        <div>
                          <CardTitle className="text-lg">{jugador.nombreVisualizacion}</CardTitle>
                          <p className="text-sm text-gray-600">
                            {jugador.nombre} {jugador.apellido}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={jugador.estado === "activo" ? "default" : "secondary"}>
                              {jugador.estado}
                            </Badge>
                            {jugador.needsActivation && (
                              <Badge variant="outline" className="text-orange-600 border-orange-200">
                                Pendiente activación
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(jugador)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(jugador.id)}
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
                        <span className="text-gray-500">Edad:</span>
                        <span className="font-medium">{calcularEdad(jugador.fechaNacimiento)} años</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Posición:</span>
                        <span className="font-medium">{getPosicionNombre(jugador.posicionPrincipal)}</span>
                      </div>
                      {jugador.posicionSecundaria && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Pos. Secundaria:</span>
                          <span className="font-medium">{getPosicionNombre(jugador.posicionSecundaria)}</span>
                        </div>
                      )}
                      {jugador.altura && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Altura:</span>
                          <span className="font-medium">{jugador.altura} cm</span>
                        </div>
                      )}
                      {jugador.peso && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Peso:</span>
                          <span className="font-medium">{jugador.peso} kg</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Usuario:</span>
                        <span className="font-medium">{jugador.username}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500">Creado: {jugador.fechaCreacion.toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">Por: {jugador.creadoPor}</p>
                      {jugador.needsActivation && (
                        <p className="text-xs text-orange-600 mt-1">
                          Se activará automáticamente en el primer login del jugador
                        </p>
                      )}
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
