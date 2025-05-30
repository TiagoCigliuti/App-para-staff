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

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "ID de usuario es requerido" }, { status: 400 })
    }

    // Eliminar usuario de Firebase Auth
    await adminAuth.deleteUser(userId)

    // Eliminar documento de Firestore
    await adminDb.collection("users").doc(userId).delete()

    console.log("Usuario eliminado:", userId)

    return NextResponse.json({
      success: true,
      message: "Usuario eliminado con éxito",
      userId: userId,
    })
  } catch (error: any) {
    console.error("Error al eliminar usuario:", error)

    let errorMessage = "Error al eliminar usuario"

    if (error.code === "auth/user-not-found") {
      errorMessage = "Usuario no encontrado"
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
