import { initializeApp, cert, getApps, getApp, type App } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

type AdminEnv = {
  projectId: string
  clientEmail: string
  privateKey: string
}

function readAdminEnv(): AdminEnv {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY

  const missing: string[] = []
  if (!projectId) missing.push("FIREBASE_PROJECT_ID")
  if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL")
  if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY")

  if (missing.length) {
    throw new Error(
      `Faltan variables de entorno para Firebase Admin: ${missing.join(
        ", ",
      )}. Asegúrate de configurarlas en tu proyecto.`,
    )
  }

  // Normaliza saltos de línea escapados
  privateKey = privateKey!.replace(/\\n/g, "\n")

  // Validación básica de formato
  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "El formato de FIREBASE_PRIVATE_KEY es inválido. Debe incluir '-----BEGIN PRIVATE KEY-----' y saltos de línea. Verifica que no tenga comillas extra y que los \\n se reemplacen por nuevas líneas.",
    )
  }

  return { projectId: projectId!, clientEmail: clientEmail!, privateKey: privateKey! }
}

let _app: App | null = null

export function adminApp(): App {
  if (_app) return _app
  const apps = getApps()
  if (apps.length) {
    _app = getApp()
    return _app
    }
  const { projectId, clientEmail, privateKey } = readAdminEnv()
  _app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
  return _app
}

export function adminAuth(): Auth {
  return getAuth(adminApp())
}

export function adminDb(): Firestore {
  return getFirestore(adminApp())
}

/**
 * Utilidad de diagnóstico para el endpoint GET.
 */
export function diagnoseAdmin(): {
  ok: boolean
  hasEnv: boolean
  details?: Record<string, unknown>
  error?: string
} {
  try {
    const diag: Record<string, unknown> = {}
    // Validar envs y formato
    const env = readAdminEnv()
    diag.env = {
      FIREBASE_PROJECT_ID: !!env.projectId,
      FIREBASE_CLIENT_EMAIL: !!env.clientEmail,
      FIREBASE_PRIVATE_KEY_present: !!env.privateKey,
      FIREBASE_PRIVATE_KEY_hasMarker: env.privateKey.includes("BEGIN PRIVATE KEY"),
    }

    // Inicializar servicios
    const app = adminApp()
    diag.appName = app.name

    // Tocar servicios
    const a = adminAuth()
    const db = adminDb()
    diag.services = {
      authReady: !!a,
      firestoreReady: !!db,
    }

    return { ok: true, hasEnv: true, details: diag }
  } catch (e: any) {
    return {
      ok: false,
      hasEnv: false,
      error: e?.message || String(e),
    }
  }
}
