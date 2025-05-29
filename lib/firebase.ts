import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc, query, collection, where, getDocs } from "firebase/firestore"
import { auth, db } from "./firebaseConfig"

/**
 * Inicia sesión en Firebase Authentication
 * Soporta tanto email como username para usuarios staff
 */
export async function loginConEmailYPassword(usuario: string, password: string) {
  try {
    console.log("🔐 Intentando login con:", usuario)

    // Detectar si es un email (contiene @) o un username
    const esEmail = usuario.includes("@")

    if (esEmail) {
      console.log("📧 Detectado como email, intentando login directo")
      // Si contiene @, intentar login directo como email
      const userCredential = await signInWithEmailAndPassword(auth, usuario, password)
      console.log("✅ Login exitoso con email")
      return userCredential.user
    } else {
      console.log("👤 Detectado como username, buscando email asociado")
      // Si no contiene @, es un username - buscar el email asociado
      const q = query(collection(db, "users"), where("username", "==", usuario))
      console.log("🔍 Buscando usuario con username:", usuario)
      console.log("🔍 Query creada:", q)
      const querySnapshot = await getDocs(q)
      console.log("📊 Resultados de la búsqueda:")
      console.log("- Número de documentos encontrados:", querySnapshot.docs.length)
      console.log("- Query snapshot vacío:", querySnapshot.empty)

      // Mostrar todos los usuarios encontrados
      querySnapshot.docs.forEach((doc, index) => {
        const data = doc.data()
        console.log(`👤 Usuario ${index + 1}:`, {
          id: doc.id,
          username: data.username,
          email: data.email,
          rol: data.rol || data.role,
          clienteId: data.clienteId,
        })
      })

      if (querySnapshot.empty) {
        console.error("❌ No se encontró ningún usuario con ese username")
        throw {
          code: "auth/user-not-found",
          message: "No se encontró ningún usuario con ese nombre de usuario",
        }
      }

      // Verificar si hay múltiples usuarios con el mismo username
      if (querySnapshot.docs.length > 1) {
        console.warn("⚠️ Se encontraron múltiples usuarios con el mismo username")
      }

      const userDoc = querySnapshot.docs[0]
      const userData = userDoc.data()
      console.log("📋 Datos del usuario encontrado:", {
        id: userDoc.id,
        username: userData.username,
        email: userData.email,
        hasEmail: !!userData.email,
      })

      // Si tiene email asociado, intentar login con ese email
      if (userData.email) {
        console.log("📧 Intentando login con email asociado:", userData.email)
        try {
          const userCredential = await signInWithEmailAndPassword(auth, userData.email, password)
          console.log("✅ Login exitoso con email asociado")
          return userCredential.user
        } catch (authError: any) {
          console.error("❌ Error al autenticar con el email asociado:", authError)

          // Mejorar los mensajes de error específicos
          if (authError.code === "auth/wrong-password") {
            throw {
              code: "auth/wrong-password",
              message: "Contraseña incorrecta para el usuario " + usuario,
            }
          } else if (authError.code === "auth/invalid-credential") {
            throw {
              code: "auth/invalid-credential",
              message: "Las credenciales no son válidas. Verifica tu usuario y contraseña.",
            }
          } else if (authError.code === "auth/too-many-requests") {
            throw {
              code: "auth/too-many-requests",
              message: "Demasiados intentos fallidos. Intenta más tarde.",
            }
          }

          throw authError // Reenviar el error original si no es uno específico
        }
      } else {
        console.error("❌ Usuario encontrado pero sin email asociado")
        throw {
          code: "auth/invalid-user-data",
          message: "El usuario existe pero no tiene email asociado. Contacta al administrador.",
        }
      }
    }
  } catch (error: any) {
    console.error("💥 Error en loginConEmailYPassword:", error)

    // Asegurarse de que el error tenga un código y mensaje
    if (!error.code) {
      error = {
        code: "auth/unknown-error",
        message: error.message || "Error desconocido al iniciar sesión",
      }
    }

    throw error
  }
}

/**
 * A partir del UID del usuario autenticado, trae los datos del usuario + tema asignado
 * Funciona tanto para admins como para usuarios staff
 */
export async function getClienteConTema(uid: string) {
  try {
    // Buscar el usuario en la colección "users" por firebaseUid o por ID del documento
    let userSnap
    let userData

    // Primero intentar buscar por firebaseUid
    const q = query(collection(db, "users"), where("firebaseUid", "==", uid))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      userSnap = querySnapshot.docs[0]
      userData = userSnap.data()
    } else {
      // Si no se encuentra por firebaseUid, intentar por ID del documento (compatibilidad)
      const userRef = doc(db, "users", uid)
      userSnap = await getDoc(userRef)
      userData = userSnap.exists() ? userSnap.data() : null
    }

    if (!userData) {
      console.log("Usuario no encontrado en Firestore")

      // Para usuarios staff creados recientemente, verificar si es un email de staff
      const currentUser = auth.currentUser
      if (currentUser && currentUser.email && currentUser.email.includes("@staff.local")) {
        console.log("Usuario staff detectado, pero sin datos en Firestore. Marcando como perfil incompleto.")
        return {
          esAdmin: false,
          cliente: null,
          tema: null,
          logo: null,
          perfilIncompleto: true,
          tipoUsuario: "staff",
        }
      }

      return {
        esAdmin: false,
        cliente: null,
        tema: null,
        logo: null,
        perfilIncompleto: true,
      }
    }

    const clienteId = userData.clienteId
    const themeId = userData.themeId
    const esAdmin = userData.rol === "admin" || userData.role === "admin"
    const esStaff = userData.rol === "staff" || userData.role === "staff"

    // Si es admin, devolver datos de admin sin tema específico
    if (esAdmin) {
      return {
        esAdmin: true,
        cliente: null,
        tema: null,
        logo: null,
        tipoUsuario: "admin",
      }
    }

    // Obtener datos del cliente si está asignado
    let clienteData = null
    let logo = null
    if (clienteId) {
      try {
        const clienteRef = doc(db, "clients", clienteId)
        const clienteSnap = await getDoc(clienteRef)
        if (clienteSnap.exists()) {
          clienteData = clienteSnap.data()
          logo = clienteData.logo || null
        }
      } catch (error) {
        console.error("Error al cargar datos del cliente:", error)
      }
    }

    // Obtener tema asignado directamente al usuario
    let themeData = null
    if (themeId) {
      try {
        const themeRef = doc(db, "themes", themeId)
        const themeSnap = await getDoc(themeRef)
        if (themeSnap.exists()) {
          themeData = themeSnap.data().colors
          console.log("Tema asignado al usuario encontrado:", themeData)
        } else {
          console.log("Tema asignado no encontrado, usando tema por defecto")
        }
      } catch (error) {
        console.error("Error al cargar tema del usuario:", error)
      }
    }

    return {
      esAdmin: false,
      cliente: clienteData,
      tema: themeData,
      logo,
      tipoUsuario: esStaff ? "staff" : "user",
    }
  } catch (error) {
    console.error("Error al obtener datos del usuario:", error)
    return {
      esAdmin: false,
      cliente: null,
      tema: null,
      logo: null,
      error: true,
    }
  }
}
