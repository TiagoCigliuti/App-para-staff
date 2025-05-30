import { type NextRequest, NextResponse } from "next/server"

// Función para inicializar Firebase Admin de forma segura
async function initializeFirebaseAdmin() {
  try {
    const { getAuth } = await import("firebase-admin/auth")
    const { getFirestore } = await import("firebase-admin/firestore")
    const { initializeApp, getApps, cert } = await import("firebase-admin/app")

    if (getApps().length === 0) {
      // Verificar variables de entorno
      const projectId = process.env.FIREBASE_PROJECT_ID
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
      const privateKey = process.env.FIREBASE_PRIVATE_KEY

      console.log("🔧 Verificando configuración...")
      console.log("Project ID:", projectId ? "✓" : "✗")
      console.log("Client Email:", clientEmail ? "✓" : "✗")
      console.log("Private Key:", privateKey ? "✓" : "✗")

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error("Variables de entorno de Firebase Admin faltantes")
      }

      // Limpiar la private key
      const cleanPrivateKey = privateKey.replace(/\\n/g, "\n")

      const serviceAccount = {
        projectId,
        clientEmail,
        privateKey: cleanPrivateKey,
      }

      console.log("🚀 Inicializando Firebase Admin...")
      initializeApp({
        credential: cert(serviceAccount),
        projectId,
      })
      console.log("✅ Firebase Admin inicializado")
    }

    return {
      auth: getAuth(),
      db: getFirestore(),
    }
  } catch (error) {
    console.error("❌ Error inicializando Firebase Admin:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  console.log("📨 Recibida petición POST a /api/admin/create-user")

  try {
    // Inicializar Firebase Admin
    const { auth: adminAuth, db: adminDb } = await initializeFirebaseAdmin()

    // Parsear el body de la request
    let body
    try {
      body = await request.json()
      console.log("📝 Body parseado correctamente")
    } catch (parseError) {
      console.error("❌ Error parseando body:", parseError)
      return NextResponse.json({ error: "Formato de datos inválido" }, { status: 400 })
    }

    const { nombre, apellido, username, password, clienteId, temaId, clienteData } = body

    // Validaciones básicas
    if (!nombre || !apellido || !username || !password || !clienteId || !temaId) {
      console.log("❌ Faltan campos obligatorios")
      return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 })
    }

    if (password.length < 6) {
      console.log("❌ Contraseña muy corta")
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
    }

    // Generar email
    const email = `${username}@staff.com`
    console.log("📧 Email generado:", email)

    // Verificar username único
    try {
      console.log("🔍 Verificando username único...")
      const usersRef = adminDb.collection("users")
      const usernameQuery = await usersRef.where("username", "==", username).get()

      if (!usernameQuery.empty) {
        console.log("❌ Username ya existe")
        return NextResponse.json({ error: "Este nombre de usuario ya está en uso" }, { status: 400 })
      }
      console.log("✅ Username disponible")
    } catch (dbError) {
      console.error("❌ Error verificando username:", dbError)
      return NextResponse.json({ error: "Error verificando disponibilidad del username" }, { status: 500 })
    }

    // Crear usuario en Auth
    let userRecord
    try {
      console.log("👤 Creando usuario en Firebase Auth...")
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: `${nombre} ${apellido}`,
        disabled: false,
      })
      console.log("✅ Usuario creado en Auth:", userRecord.uid)
    } catch (authError: any) {
      console.error("❌ Error en Firebase Auth:", authError)

      let errorMessage = "Error al crear usuario"
      if (authError.code === "auth/email-already-exists") {
        errorMessage = "Este email ya está registrado"
      } else if (authError.code === "auth/weak-password") {
        errorMessage = "La contraseña es muy débil"
      } else if (authError.code === "auth/invalid-email") {
        errorMessage = "Email inválido"
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    // Preparar datos del usuario
    const userData = {
      email,
      username,
      Nombre: nombre,
      Apellido: apellido,
      rol: "staff",
      role: "staff",
      estado: "activo",
      status: "activo",
      clientId: clienteId, // Declare the variable here
      equipoNombre: clienteData?.nombre || clienteData?.name || clienteData?.clientName || "",
      escudoEquipo: clienteData?.logo || null,
      themeId: temaId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      firebaseUid: userRecord.uid,
      createdBy: "admin",
      permissions: ["create_players", "edit_players", "view_players"],
    }

    // Guardar en Firestore
    try {
      console.log("💾 Guardando en Firestore...")
      await adminDb.collection("users").doc(userRecord.uid).set(userData)
      console.log("✅ Usuario guardado en Firestore")
    } catch (dbError) {
      console.error("❌ Error guardando en Firestore:", dbError)

      // Rollback: eliminar usuario de Auth
      try {
        await adminAuth.deleteUser(userRecord.uid)
        console.log("🗑️ Usuario eliminado de Auth (rollback)")
      } catch (deleteError) {
        console.error("❌ Error en rollback:", deleteError)
      }

      return NextResponse.json({ error: "Error guardando datos del usuario" }, { status: 500 })
    }

    console.log("🎉 Usuario creado exitosamente!")
    return NextResponse.json({
      success: true,
      message: "Usuario staff creado con éxito",
      userId: userRecord.uid,
      email,
    })
  } catch (error: any) {
    console.error("❌ Error general:", error)
    console.error("Stack trace:", error.stack)

    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error.message,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

// Manejar otros métodos HTTP
export async function GET() {
  return NextResponse.json({ error: "Método no permitido" }, { status: 405 })
}
