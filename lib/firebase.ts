import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, addDoc, limit } from "firebase/firestore"
import { auth, db } from "./firebaseConfig"

interface LoginResult {
  success: boolean
  userData?: any
  error?: string
}

// Función para verificar conexión a Firestore con permisos mínimos
export const testFirestoreConnection = async () => {
  try {
    console.log("🔄 Probando conexión a Firestore...")

    // En lugar de crear un documento, intentamos leer una colección
    // Esto requiere menos permisos
    const testCollection = collection(db, "jugadores")
    const testQuery = query(testCollection, limit(1))

    // Intentar hacer una consulta simple
    await getDocs(testQuery)

    console.log("✅ Conexión a Firestore exitosa")
    return true
  } catch (error: any) {
    console.error("❌ Error conectando a Firestore:", error.message)

    // Si es un error de permisos, aún podemos intentar operaciones específicas
    if (error.code === "permission-denied") {
      console.log("⚠️ Permisos limitados, pero Firestore está disponible")
      return true // Consideramos que está conectado pero con permisos limitados
    }

    return false
  }
}

// Función para verificar conexión específica con la colección bienestar
export const testBienestarCollection = async (): Promise<boolean> => {
  try {
    console.log("🔄 Probando conexión específica con colección 'bienestar'...")

    const bienestarRef = collection(db, "bienestar")
    const testQuery = query(bienestarRef, limit(1))

    // Intentar leer la colección bienestar
    const snapshot = await getDocs(testQuery)
    console.log("✅ Conexión con colección 'bienestar' exitosa")
    console.log("📊 Documentos encontrados:", snapshot.size)

    return true
  } catch (error: any) {
    console.error("❌ Error conectando con colección 'bienestar':", error.message)

    if (error.code === "permission-denied") {
      console.log("⚠️ Sin permisos para leer colección 'bienestar'")
    }

    return false
  }
}

// Función para probar escritura específicamente en la colección bienestar
export const testBienestarWrite = async (): Promise<boolean> => {
  try {
    console.log("🔄 Probando permisos de escritura en colección 'bienestar'...")

    if (!auth.currentUser) {
      throw new Error("Usuario no autenticado")
    }

    const bienestarRef = collection(db, "bienestar")

    const testData = {
      test: true,
      timestamp: new Date(),
      testType: "bienestar_write_permission_check",
      uid: auth.currentUser.uid,
      jugadorId: "test_jugador",
      jugadorEmail: auth.currentUser.email || "test@test.com",
      clienteId: "test_client",
      fecha: new Date().toISOString().split("T")[0],
      estadoAnimo: 1,
      horasSueno: 1,
      calidadSueno: 1,
      nivelRecuperacion: 1,
      dolorMuscular: 1,
      comentarios: "Test de permisos",
      fechaCreacion: new Date(),
    }

    // Usar addDoc en lugar de setDoc para crear un documento con ID automático
    const docRef = await addDoc(bienestarRef, testData)
    console.log("✅ Permisos de escritura en 'bienestar' confirmados")
    console.log("📄 Documento de prueba creado con ID:", docRef.id)

    // Limpiar el documento de prueba
    try {
      await deleteDoc(docRef)
      console.log("✅ Documento de prueba eliminado de 'bienestar'")
    } catch (deleteError) {
      console.log("⚠️ No se pudo eliminar documento de prueba de 'bienestar':", deleteError)
    }

    return true
  } catch (error: any) {
    console.error("❌ Error en permisos de escritura en 'bienestar':", error.message)
    console.error("❌ Código de error:", error.code)

    if (error.code === "permission-denied") {
      console.error("❌ PERMISOS DENEGADOS: Verifica las reglas de Firestore para la colección 'bienestar'")
    }

    return false
  }
}

// Función para verificar si podemos escribir en Firestore
export const testFirestoreWrite = async () => {
  try {
    console.log("🔄 Probando permisos de escritura en Firestore...")

    // En lugar de crear un documento en una colección de prueba,
    // intentemos escribir en una colección que sabemos que existe y tiene permisos
    const jugadoresCollection = collection(db, "jugadores")
    const testDoc = doc(jugadoresCollection, "test_write_" + Date.now())

    // Intentar crear un documento temporal en jugadores
    await setDoc(testDoc, {
      test: true,
      timestamp: new Date(),
      testType: "write_permission_check",
    })

    // Si llegamos aquí, los permisos funcionan
    console.log("✅ Permisos de escritura confirmados")

    // Limpiar el documento de prueba
    try {
      await deleteDoc(testDoc)
      console.log("✅ Documento de prueba eliminado")
    } catch (deleteError) {
      console.log("⚠️ No se pudo eliminar documento de prueba:", deleteError)
    }

    return true
  } catch (error: any) {
    console.error("❌ Error en permisos de escritura:", error.message)

    // Si es un error de permisos específico, aún podemos intentar operaciones de lectura
    if (error.code === "permission-denied") {
      console.log("⚠️ Sin permisos de escritura, pero la conexión funciona")
      return false
    }

    return false
  }
}

export const loginWithEmailOrUsername = async (usuario: string, password: string): Promise<LoginResult> => {
  try {
    console.log("🔐 Iniciando proceso de login para:", usuario)

    // Detectar si es email o username
    const esEmail = usuario.includes("@")

    if (esEmail) {
      console.log("📧 Detectado como email, intentando login directo...")

      try {
        // Intentar login directo con Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, usuario, password)
        console.log("✅ Login directo exitoso con email")

        // Determinar rol basado en el email
        const isAdmin = usuario.includes("@staffpro.com") || usuario.includes("admin")
        const isStaff = usuario.includes("@staff")
        const isJugador = usuario.includes("@jugador") || usuario.includes("@player")

        return {
          success: true,
          userData: {
            user: userCredential.user,
            isFirstLogin: false,
            isAdmin,
            isStaff,
            isJugador,
          },
        }
      } catch (authError: any) {
        console.log("⚠️ Login directo falló:", authError.message)
        return { success: false, error: "Credenciales incorrectas" }
      }
    } else {
      console.log("👤 Detectado como username, buscando en base de datos...")

      try {
        // Buscar por username en la colección users
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("username", "==", usuario))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
          return { success: false, error: "Usuario no encontrado" }
        }

        const userData = querySnapshot.docs[0].data()
        console.log("✅ Usuario encontrado:", userData.username)

        // Verificar que el usuario esté activo
        if (userData.estado !== "activo") {
          return { success: false, error: "Usuario inactivo. Contacta al administrador." }
        }

        // Intentar login con el email del usuario
        const email = userData.email
        if (!email) {
          return { success: false, error: "Usuario sin email configurado" }
        }

        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password)
          console.log("✅ Login exitoso con username")

          return {
            success: true,
            userData: {
              user: userCredential.user,
              isFirstLogin: false,
              isAdmin: userData.rol === "admin",
              isStaff: userData.rol === "staff",
              isJugador: userData.rol === "jugador",
            },
          }
        } catch (authError: any) {
          console.log("⚠️ Error en login con username:", authError.message)

          // Si el usuario no existe en Firebase Auth, crearlo
          if (authError.code === "auth/user-not-found") {
            try {
              console.log("🔄 Creando usuario en Firebase Auth...")
              const userCredential = await createUserWithEmailAndPassword(auth, email, password)
              const newUser = userCredential.user

              await updateProfile(newUser, {
                displayName:
                  `${userData.firstName || userData.nombre || ""} ${userData.lastName || userData.apellido || ""}`.trim(),
              })

              console.log("✅ Usuario creado y activado exitosamente")

              return {
                success: true,
                userData: {
                  user: newUser,
                  isFirstLogin: true,
                  isAdmin: userData.rol === "admin",
                  isStaff: userData.rol === "staff",
                  isJugador: userData.rol === "jugador",
                },
              }
            } catch (createError: any) {
              console.error("❌ Error creando usuario:", createError.message)
              return { success: false, error: "Error creando usuario en el sistema" }
            }
          } else {
            return { success: false, error: "Contraseña incorrecta" }
          }
        }
      } catch (firestoreError: any) {
        console.error("❌ Error consultando Firestore:", firestoreError.message)

        // Si es error de permisos, usar localStorage como fallback
        if (firestoreError.code === "permission-denied") {
          console.log("⚠️ Usando localStorage debido a permisos limitados")

          try {
            const savedUsers = localStorage.getItem("usuarios")
            if (savedUsers) {
              const users = JSON.parse(savedUsers)
              const foundUser = users.find((u: any) => u.username === usuario)
              if (foundUser && foundUser.estado === "activo") {
                // Intentar login con el email del usuario
                try {
                  const userCredential = await signInWithEmailAndPassword(auth, foundUser.email, password)
                  return {
                    success: true,
                    userData: {
                      user: userCredential.user,
                      isFirstLogin: false,
                      isAdmin: foundUser.rol === "admin",
                      isStaff: foundUser.rol === "staff",
                      isJugador: foundUser.rol === "jugador",
                    },
                  }
                } catch (authError: any) {
                  return { success: false, error: "Contraseña incorrecta" }
                }
              }
            }
          } catch (localStorageError) {
            console.error("Error con localStorage:", localStorageError)
          }
        }

        return { success: false, error: "Error de conexión con la base de datos" }
      }
    }
  } catch (error: any) {
    console.error("❌ Error general en login:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}
