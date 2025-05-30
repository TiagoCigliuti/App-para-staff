import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Inicializar Firebase Admin SDK (reutilizar la inicialización)
if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }

  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  })
}

const adminAuth = getAuth()
const adminDb = getFirestore()

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, nombre, apellido, username, password, clienteId, temaId, clienteData, currentUsername } = body

    // Validar que todos los campos requeridos estén presentes
    if (!userId || !nombre || !apellido || !username || !clienteId || !temaId) {
      return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 })
    }

    // Verificar si el username cambió y si ya existe
    if (username !== currentUsername) {
      const usersRef = adminDb.collection("users")
      const usernameQuery = await usersRef.where("username", "==", username).get()

      if (!usernameQuery.empty) {
        return NextResponse.json({ error: "Este nombre de usuario ya está en uso" }, { status: 400 })
      }
    }

    // Actualizar datos en Firebase Auth si es necesario
    const updateData: any = {
      displayName: `${nombre} ${apellido}`,
    }

    // Solo actualizar password si se proporcionó uno nuevo
    if (password && password.trim() !== "") {
      updateData.password = password
    }

    await adminAuth.updateUser(userId, updateData)

    // Actualizar documento en Firestore
    const userData = {
      // Datos básicos del usuario
      username: username,
      Nombre: nombre,
      Apellido: apellido,

      // Datos del cliente asignado
      clientId: clienteId,
      equipoNombre: clienteData?.nombre || clienteData?.name || clienteData?.clientName || "",
      escudoEquipo: clienteData?.logo || null,

      // Tema asignado
      themeId: temaId,

      // Metadatos
      updatedAt: new Date().toISOString(),
    }

    await adminDb.collection("users").doc(userId).update(userData)

    console.log("Usuario actualizado:", userId)

    return NextResponse.json({
      success: true,
      message: "Usuario actualizado con éxito",
      userId: userId,
    })
  } catch (error: any) {
    console.error("Error al actualizar usuario:", error)

    let errorMessage = "Error al actualizar usuario"

    if (error.code === "auth/user-not-found") {
      errorMessage = "Usuario no encontrado"
    } else if (error.code === "auth/weak-password") {
      errorMessage = "La contraseña es muy débil (mínimo 6 caracteres)"
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
