"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/components/auth/AuthProvider"
import { collection, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"
import { HeartPulse, Activity, ArrowLeft } from "lucide-react"
import { getCuestionarioUserClienteId } from "@/lib/cuestionario-utils"

type Jugador = {
  id: string
  nombre?: string
  apellido?: string
  displayName?: string
  email?: string
  photoURL?: string
  clienteId?: string
  estado?: string
  uid?: string
}

function initials(name?: string) {
  if (!name) return "U"
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] || "U").toUpperCase() + (parts[1]?.[0] || "").toUpperCase()
}

export default function PlayerActionsPage() {
  const router = useRouter()
  const params = useParams<{ jugadorId: string }>()
  const { user, loading } = useAuth()
  const [jugador, setJugador] = useState<Jugador | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      setChecking(true)
      setError(null)
      try {
        // Get questionnaire user's clienteId and role
        const { clienteId: userClienteId, rol } = await getCuestionarioUserClienteId({
          uid: user.uid,
          email: user.email,
        })

        if (!userClienteId || rol !== "cuestionario") {
          setError("No tienes permisos para operar cuestionarios.")
          return
        }

        // Load jugador
        const jugadorRef = doc(collection(db, "jugadores"), params.jugadorId)
        const jugadorSnap = await getDoc(jugadorRef)
        if (!jugadorSnap.exists()) {
          setError("Jugador no encontrado.")
          return
        }
        const data = jugadorSnap.data() as any
        const j: Jugador = {
          id: jugadorSnap.id,
          nombre: data.nombre,
          apellido: data.apellido,
          displayName: data.displayName,
          email: data.email,
          photoURL: data.photoURL || data.fotoUrl,
          clienteId: data.clienteId,
          estado: data.estado || (data.activo ? "activo" : "inactivo"),
          uid: data.uid,
        }

        // Ensure same cliente
        if (!j.clienteId || j.clienteId !== userClienteId) {
          setError("El jugador no pertenece a tu cliente.")
          return
        }
        if ((j.estado || "").toLowerCase() !== "activo") {
          setError("El jugador no está activo.")
          return
        }

        setJugador(j)
      } catch (e: any) {
        setError(e?.message || "Error cargando datos")
      } finally {
        setChecking(false)
      }
    }
    if (!loading && user && params.jugadorId) void load()
  }, [user, loading, params.jugadorId])

  if (loading || checking) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" aria-label="Cargando" />
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center">
        <Button onClick={() => router.push("/login")}>Iniciar sesión</Button>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" onClick={() => router.push("/cuestionario")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-[100dvh] px-4 py-6 md:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push("/cuestionario")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-12 w-12">
              {jugador?.photoURL ? (
                <AvatarImage src={jugador.photoURL || "/placeholder.svg"} alt="Foto jugador" />
              ) : (
                <AvatarFallback>{initials(`${jugador?.nombre || ""} ${jugador?.apellido || ""}`)}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <CardTitle className="text-xl">
                {`${jugador?.nombre || ""} ${jugador?.apellido || ""}`.trim() || jugador?.displayName || "Jugador"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{jugador?.email}</p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Button
              variant="outline"
              className="h-24 flex-col items-center justify-center bg-transparent"
              onClick={() => router.push(`/cuestionario/${jugador?.id}/bienestar`)}
            >
              <HeartPulse className="h-6 w-6 text-green-600 mb-2" />
              Completar Bienestar
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col items-center justify-center bg-transparent"
              onClick={() => router.push(`/cuestionario/${jugador?.id}/percepcion-esfuerzo`)}
            >
              <Activity className="h-6 w-6 text-orange-600 mb-2" />
              Percepción del esfuerzo
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
