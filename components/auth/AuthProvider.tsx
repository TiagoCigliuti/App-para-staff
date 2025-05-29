"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth"
import { auth } from "@/lib/firebaseConfig"
import { getClienteConTema } from "@/lib/firebase"
import { useTheme } from "@/components/theme/ThemeProvider"
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"

interface User {
  id: string
  email: string
  nombre?: string
  apellido?: string
  fotoPerfil?: string | null
  equipoNombre?: string
  escudoEquipo?: string
}

interface ClienteData {
  esAdmin: boolean
  cliente: any
  tema: any
  logo: string | null
  perfilIncompleto?: boolean
  error?: boolean
  tipoUsuario?: "admin" | "staff" | "user"
}

interface AuthContextType {
  user: User | null
  clienteData: ClienteData | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUserData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [clienteData, setClienteData] = useState<ClienteData | null>(null)
  const [loading, setLoading] = useState(true)

  const themeContext = useTheme()

  // Función para cargar datos del usuario desde Firestore
  const loadUserData = async (firebaseUser: any) => {
    try {
      console.log("Loading user data from AuthProvider for:", firebaseUser.uid)

      // Buscar usuario por firebaseUid o por ID del documento
      let userDoc
      let userData

      // Primero intentar buscar por firebaseUid en la colección users
      const q = query(collection(db, "users"), where("firebaseUid", "==", firebaseUser.uid))
      const usersSnapshot = await getDocs(q)

      if (!usersSnapshot.empty) {
        userDoc = usersSnapshot.docs[0]
        userData = userDoc.data()
        console.log("User found by firebaseUid:", userData)
      } else {
        // Si no se encuentra por firebaseUid, intentar por ID del documento (compatibilidad)
        userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
        userData = userDoc.exists() ? userDoc.data() : null
        console.log("User found by document ID:", userData)
      }

      if (userData) {
        const nombre =
          userData.Nombre || userData.nombre || userData.firstName || userData.first_name || userData.name || ""

        const apellido =
          userData.Apellido || userData.apellido || userData.lastName || userData.last_name || userData.surname || ""

        const fotoPerfil =
          userData.fotoPerfil || userData.foto_perfil || userData.profilePicture || userData.avatar || null

        const equipoNombre = userData.equipoNombre || userData.equipo_nombre || ""

        const escudoEquipo = userData.escudoEquipo || userData.escudo_equipo || null

        console.log("Equipo nombre:", equipoNombre)
        console.log("Escudo equipo:", escudoEquipo)

        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          nombre,
          apellido,
          fotoPerfil,
          equipoNombre,
          escudoEquipo,
        })

        // Si el usuario no tiene rol definido, asignar "user" por defecto
        if (userData && !userData.rol && !userData.role) {
          try {
            const userDocRef = doc(db, "users", firebaseUser.uid)
            await updateDoc(userDocRef, {
              rol: "user",
              role: "user",
              updatedAt: new Date().toISOString(),
            })
          } catch (error) {
            console.log("Error asignando rol por defecto:", error)
          }
        }
      } else {
        // Usuario no encontrado en Firestore, crear datos básicos
        console.log("No user data found, creating basic user")
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || "",
          nombre: "",
          apellido: "",
          fotoPerfil: null,
          equipoNombre: "",
          escudoEquipo: null,
        })
      }
    } catch (error) {
      console.error("Error al obtener datos adicionales del usuario:", error)
      setUser({
        id: firebaseUser.uid,
        email: firebaseUser.email || "",
        nombre: "",
        apellido: "",
        fotoPerfil: null,
        equipoNombre: "",
        escudoEquipo: null,
      })
    }
  }

  // Función para refrescar los datos del usuario (útil después de actualizar el perfil)
  const refreshUserData = async () => {
    if (auth.currentUser) {
      await loadUserData(auth.currentUser)
      await loadClienteData(auth.currentUser.uid)
    }
  }

  useEffect(() => {
    // Listen for auth state changes with Firebase
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await loadUserData(firebaseUser)
        await loadClienteData(firebaseUser.uid)
      } else {
        setUser(null)
        setClienteData(null)
        // Reset theme to default when user logs out
        if (themeContext?.resetTheme) {
          themeContext.resetTheme()
        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Cargar datos del cliente y aplicar tema
  const loadClienteData = async (uid: string) => {
    try {
      const data = await getClienteConTema(uid)
      setClienteData({
        ...data,
        perfilIncompleto: false, // Ya no necesitamos completar perfil manualmente
      })

      // Apply theme if available
      if (data?.tema && themeContext?.setTheme) {
        console.log("Aplicando tema asignado al usuario:", data.tema)
        themeContext.setTheme({
          background: data.tema.background || "#ffffff",
          text: data.tema.text || "#000000",
          primary: data.tema.primary || "#000000",
          secondary: data.tema.secondary || "#cccccc",
          accent: data.tema.accent || "#cccccc",
          border: data.tema.border || "#e5e5e5",
        })
      } else if (data?.esAdmin && themeContext?.resetTheme) {
        // Los admins usan el tema por defecto
        console.log("Usuario admin detectado, usando tema por defecto")
        themeContext.resetTheme()
      } else if (!data?.tema && themeContext?.resetTheme) {
        // Si no hay tema asignado, usar tema por defecto
        console.log("No hay tema asignado al usuario, usando tema por defecto")
        themeContext.resetTheme()
      }
    } catch (error) {
      console.error("Error loading user data:", error)
      setClienteData({
        esAdmin: false,
        cliente: null,
        tema: null,
        logo: null,
        error: true,
        perfilIncompleto: false,
      })
      // En caso de error, usar tema por defecto
      if (themeContext?.resetTheme) {
        themeContext.resetTheme()
      }
    }
  }

  // Función para cerrar sesión
  const handleSignOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
    setClienteData(null)

    // Reset theme to default
    if (themeContext?.resetTheme) {
      themeContext.resetTheme()
    }
  }

  const value = {
    user,
    clienteData,
    loading,
    signOut: handleSignOut,
    refreshUserData,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
