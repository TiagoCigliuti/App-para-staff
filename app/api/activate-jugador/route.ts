import { NextResponse } from "next/server"
import { adminAuth, adminDb, diagnoseAdmin } from "@/lib/firebase-admin"

export const runtime = "nodejs"

export async function GET() {
  // Diagnóstico siempre JSON
  const diag = diagnoseAdmin()
  const status = diag.ok ? 200 : 500
  return NextResponse.json(diag, { status })
}

export async function POST(request: Request) {
  // Asegúrate de NUNCA tirar errores fuera del try para evitar páginas HTML
  try {
    // Parseo robusto del body
    let body: any = null
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: "Body inválido. Se esperaba JSON." },
        { status: 400 },
      )
    }

    const email: string | undefined = body?.email
    const password: string | undefined = body?.password

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email y contraseña son requeridos" },
        { status: 400 },
      )
    }

    const db = adminDb()
    const auth = adminAuth()

    // 1) Buscar documento en 'users'
    const usersSnap = await db.collection("users").where("email", "==", email).limit(1).get()
    if (usersSnap.empty) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado en colección 'users'" },
        { status: 404 },
      )
    }
    const userDoc = usersSnap.docs[0]
    const data = userDoc.data() || {}

    // 2) Validar tempPassword si existe
    if (data.tempPassword && data.tempPassword !== password) {
      return NextResponse.json({ success: false, error: "Contraseña incorrecta" }, { status: 400 })
    }

    // 3) Si ya activado, sincroniza jugador y sal
    if (data.needsActivation === false) {
      const jugadoresSnap = await db.collection("jugadores").where("email", "==", email).limit(1).get()
      if (!jugadoresSnap.empty) {
        await jugadoresSnap.docs[0].ref.set(
          {
            needsActivation: false,
            tempPassword: null,
            fechaActivacion: new Date(),
          },
          { merge: true },
        )
      }
      return NextResponse.json({ success: true, info: "Usuario ya activado" })
    }

    // 4) Obtener/crear usuario en Auth
    let uid: string
    try {
      const existing = await auth.getUserByEmail(email)
      uid = existing.uid
    } catch (e: any) {
      // No existe, crear
      const displayName = `${data.firstName || data.nombre || ""} ${data.lastName || data.apellido || ""}`.trim()
      try {
        const record = await auth.createUser({
          email,
          password,
          displayName: displayName || undefined,
          emailVerified: false,
          disabled: false,
        })
        uid = record.uid
      } catch (createErr: any) {
        // Devuelve el código específico de firebase-admin si existe
        return NextResponse.json(
          {
            success: false,
            error: "No se pudo crear el usuario en Auth",
            code: createErr?.code,
            details: createErr?.message,
          },
          { status: 500 },
        )
      }
    }

    // 5) Actualizar 'users'
    await userDoc.ref.set(
      {
        firebaseUid: uid,
        needsActivation: false,
        tempPassword: null,
        fechaActivacion: new Date(),
      },
      { merge: true },
    )

    // 6) Actualizar 'jugadores'
    const jugadoresSnap = await db.collection("jugadores").where("email", "==", email).limit(1).get()
    if (!jugadoresSnap.empty) {
      await jugadoresSnap.docs[0].ref.set(
        {
          firebaseUid: uid,
          needsActivation: false,
          tempPassword: null,
          fechaActivacion: new Date(),
        },
        { merge: true },
      )
    }

    return NextResponse.json({ success: true, uid })
  } catch (err: any) {
    // SIEMPRE responder JSON
    return NextResponse.json(
      {
        success: false,
        error: "Error interno activando jugador",
        details: err?.message || String(err),
      },
      { status: 500 },
    )
  }
}
