import { NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

export async function GET() {
  try {
    console.log("🧪 Probando configuración de Firebase Admin...")

    // Verificar variables de entorno
    console.log("📋 Variables de entorno:")
    console.log("- FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID ? "✓ Presente" : "✗ Faltante")
    console.log("- FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL ? "✓ Presente" : "✗ Faltante")
    console.log("- FIREBASE_PRIVATE_KEY:", process.env.FIREBASE_PRIVATE_KEY ? "✓ Presente" : "✗ Faltante")

    // Mostrar primeros caracteres de la clave privada para verificar formato
    if (process.env.FIREBASE_PRIVATE_KEY) {
      const keyStart = process.env.FIREBASE_PRIVATE_KEY.substring(0, 27)
      const keyEnd = process.env.FIREBASE_PRIVATE_KEY.substring(process.env.FIREBASE_PRIVATE_KEY.length - 25)
      console.log("- FIREBASE_PRIVATE_KEY formato:", `${keyStart}...${keyEnd}`)
    }

    // Inicializar Firebase Admin
    if (getApps().length === 0) {
      console.log("🚀 Inicializando Firebase Admin...")

      if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
        throw new Error("Faltan variables de entorno de Firebase Admin")
      }

      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")

      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
      })

      console.log("✅ Firebase Admin inicializado correctamente")
    } else {
      console.log("✅ Firebase Admin ya estaba inicializado")
    }

    // Probar acceso a Auth y Firestore
    const auth = getAuth()
    const db = getFirestore()

    console.log("✅ Acceso a Auth y Firestore confirmado")

    return NextResponse.json({
      success: true,
      message: "Firebase Admin configurado correctamente",
      projectId: process.env.FIREBASE_PROJECT_ID,
    })
  } catch (error: any) {
    console.error("❌ Error en la configuración de Firebase Admin:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
