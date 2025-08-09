import { NextResponse } from "next/server"

type SignUpSuccess = {
  idToken: string
  email: string
  refreshToken: string
  expiresIn: string
  localId: string // uid
}

type SignUpError = {
  error?: {
    code?: number
    message?: string
    status?: string
    errors?: Array<{ message?: string; domain?: string; reason?: string }>
  }
}

export async function POST(req: Request) {
  try {
    const { username, password } = (await req.json()) as {
      username?: string
      password?: string
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: "Faltan campos: username y password son obligatorios." },
        { status: 400 }
      )
    }

    if (username.includes("@")) {
      return NextResponse.json(
        { error: "No incluyas @ en el nombre de usuario." },
        { status: 400 }
      )
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Falta NEXT_PUBLIC_FIREBASE_API_KEY en variables de entorno." },
        { status: 500 }
      )
    }

    const email = `${username.trim().toLowerCase()}@cuestionario.com`

    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    )

    const payload = (await resp.json()) as SignUpSuccess & SignUpError

    if (!resp.ok) {
      const code = payload?.error?.message || "UNKNOWN"
      // Mapeo de errores comunes a un status más útil
      if (code === "EMAIL_EXISTS") {
        return NextResponse.json(
          { error: "El email ya existe." },
          { status: 409 }
        )
      }
      if (code === "WEAK_PASSWORD : Password should be at least 6 characters") {
        return NextResponse.json(
          { error: "La contraseña debe tener al menos 6 caracteres." },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: "No se pudo crear el usuario en Firebase Auth.", details: code },
        { status: 500 }
      )
    }

    const { localId, email: createdEmail } = payload

    return NextResponse.json(
      { uid: localId, email: createdEmail },
      { status: 201 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { error: "Error interno del servidor", details: err?.message || String(err) },
      { status: 500 }
    )
  }
}
