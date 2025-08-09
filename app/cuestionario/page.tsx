"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/AuthProvider"
import { db } from "@/lib/firebaseConfig"
import { collection, getDocs, query, where, type DocumentData, type QueryConstraint } from "firebase/firestore"
import { getAuth, signOut } from "firebase/auth"
import { getStorage, ref as storageRef, getDownloadURL } from "firebase/storage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { LogOut, UserRound, CheckCircle2, CircleAlert } from "lucide-react"

type Jugador = {
  id: string
  email?: string
  clienteId?: string
  nombre?: string
  apellido?: string
  displayName?: string
  uid?: string
  estado?: string
  foto?: string
  photoURL?: string
  photoUrl?: string
  avatarUrl?: string
  avatar?: string
  fotoPerfil?: string
  imagen?: string
  imageUrl?: string
}

// utils
function localDateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function pickPhotoPath(j: Partial<Jugador> | null | undefined) {
  if (!j) return ""
  const candidates = [j.foto, j.photoURL, j.photoUrl, j.avatarUrl, j.avatar, j.fotoPerfil, j.imagen, j.imageUrl].filter(
    Boolean,
  ) as string[]
  return candidates[0] || ""
}

function displayNameOf(j: Jugador) {
  const composed = [j.nombre, j.apellido].filter(Boolean).join(" ")
  if (composed.trim()) return composed
  if (j.displayName) return j.displayName
  return j.email || "Jugador"
}

function sortKeyOf(j: Jugador) {
  const apellidoNombre = [j.apellido, j.nombre].filter(Boolean).join(" ").trim()
  const base = apellidoNombre || displayNameOf(j)
  return base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export default function CuestionarioPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string | undefined>>({})
  const [doneBienestar, setDoneBienestar] = useState<Record<string, boolean>>({})
  const [doneRpe, setDoneRpe] = useState<Record<string, boolean>>({})
  const [isLoadingJugadores, setIsLoadingJugadores] = useState(false)

  // Derive sorting
  const sortedJugadores = useMemo(() => {
    return [...jugadores].sort((a, b) => (sortKeyOf(a) > sortKeyOf(b) ? 1 : -1))
  }, [jugadores])

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      if (!user) return
      // Resolve clienteId by reading the cuestionario user mapping (supports both collection names)
      async function getCuestionarioUserClienteId(params: { uid?: string | null; email?: string | null }) {
        const { uid, email } = params
        const collectionsToTry = ["usuarios-custionario", "usuarios-cuestionario"]
        for (const colName of collectionsToTry) {
          const baseRef = collection(db, colName)
          const queries: QueryConstraint[] = []
          if (uid) queries.push(where("uid", "==", uid))
          if (email) queries.push(where("email", "==", email))
          for (const qy of queries) {
            const q = query(baseRef, qy)
            const snap = await getDocs(q)
            if (!snap.empty) {
              const doc = snap.docs[0].data() as any
              const clienteId = (doc.clienteid as string) || (doc.clienteId as string) || null
              const rol = (doc.rol as string) || null
              return { clienteId, rol }
            }
          }
        }
        return { clienteId: null as string | null, rol: null as string | null }
      }

      const { clienteId: cId, rol } = await getCuestionarioUserClienteId({ uid: user.uid, email: user.email })
      if (cancelled) return
      if (!cId || (rol !== "cuestionario" && rol !== "admin" && rol !== "staff")) {
        setClienteId(null)
        setJugadores([])
        return
      }
      setClienteId(cId)

      // Load jugadores for this cliente
      setIsLoadingJugadores(true)
      try {
        const jugadoresRef = collection(db, "jugadores")
        const qJug = query(jugadoresRef, where("clienteId", "==", cId))
        const snap = await getDocs(qJug)
        if (cancelled) return
        const list: Jugador[] = snap.docs.map((d) => {
          const data = d.data() as DocumentData
          return {
            id: d.id,
            email: data.email,
            clienteId: data.clienteId,
            nombre: data.nombre,
            apellido: data.apellido,
            displayName: data.displayName,
            uid: data.uid,
            estado: data.estado || (data.activo ? "activo" : "inactivo"),
            foto: data.foto,
            photoURL: data.photoURL,
            photoUrl: data.photoUrl,
            avatarUrl: data.avatarUrl,
            avatar: data.avatar,
            fotoPerfil: data.fotoPerfil,
            imagen: data.imagen,
            imageUrl: data.imageUrl,
          }
        })
        setJugadores(list)

        // Resolve photos asynchronously
        resolveAllPhotos(list).catch(() => {})

        // For today's completion flags
        resolveTodayCompletion(list).catch(() => {})
      } finally {
        if (!cancelled) setIsLoadingJugadores(false)
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [user, loading])

  async function resolveAllPhotos(list: Jugador[]) {
    const storage = getStorage()
    const tasks = list.map(async (j) => {
      const v = pickPhotoPath(j)
      if (!v) return [j.id, undefined] as const
      if (/^https?:\/\//i.test(v)) return [j.id, v] as const
      try {
        const url = await getDownloadURL(storageRef(storage, v))
        return [j.id, url] as const
      } catch {
        return [j.id, undefined] as const
      }
    })
    const entries = await Promise.all(tasks)
    setPhotoUrls((prev) => {
      const next = { ...prev }
      for (const [id, url] of entries) next[id] = url
      return next
    })
  }

  async function resolveTodayCompletion(list: Jugador[]) {
    const today = localDateKey()
    // naive approach: 2N small queries
    const bienestarFlags: Record<string, boolean> = {}
    const rpeFlags: Record<string, boolean> = {}
    await Promise.all(
      list.map(async (j) => {
        // Bienestar
        try {
          const qB = query(collection(db, "bienestar"), where("jugadorId", "==", j.id), where("fecha", "==", today))
          const sB = await getDocs(qB)
          bienestarFlags[j.id] = !sB.empty
        } catch {
          bienestarFlags[j.id] = false
        }
        // RPE
        try {
          const qR = query(
            collection(db, "percepcion-esfuerzo"),
            where("jugadorId", "==", j.id),
            where("fecha", "==", today),
          )
          const sR = await getDocs(qR)
          rpeFlags[j.id] = !sR.empty
        } catch {
          rpeFlags[j.id] = false
        }
      }),
    )
    setDoneBienestar(bienestarFlags)
    setDoneRpe(rpeFlags)
  }

  function handleSignOut() {
    const auth = getAuth()
    signOut(auth).then(() => {
      router.push("/login")
    })
  }

  const isLoading = loading || isLoadingJugadores

  return (
    <main className="min-h-[100dvh]">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-start sm:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-semibold">Bienvenido</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {"Seleccioná tu perfil y completá los cuestionarios."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSignOut} className="bg-transparent">
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Cerrar sesión</span>
              <span className="sr-only">Cerrar sesión</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content: only jugadores cards */}
      <section className="max-w-6xl mx-auto px-4 py-6">
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && (!clienteId || sortedJugadores.length === 0) && (
          <div className="text-center text-muted-foreground py-16">
            <UserRound className="w-8 h-8 mx-auto mb-3" />
            <p className="text-sm">
              {clienteId
                ? "No hay jugadores asociados a tu cliente."
                : "Tu usuario no tiene permisos para cargar cuestionarios."}
            </p>
          </div>
        )}

        {!isLoading && sortedJugadores.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedJugadores.map((j) => {
              const nombre = displayNameOf(j)
              const photo = photoUrls[j.id]
              const completoBienestar = !!doneBienestar[j.id]
              const completoRpe = !!doneRpe[j.id]
              const completoAmbos = completoBienestar && completoRpe

              return (
                <Card key={j.id} className="flex flex-col">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <Avatar className="h-12 w-12 ring-1 ring-border">
                      <AvatarImage
                        src={photo ?? "/placeholder.svg?height=96&width=96&query=jugador%20avatar%20placeholder"}
                        alt={`Foto de ${nombre}`}
                      />
                      <AvatarFallback className="font-medium">
                        {nombre
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p) => p[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{nombre}</CardTitle>
                    </div>
                    {completoAmbos ? (
                      <Badge variant="secondary" className="bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Hoy completo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 border-amber-300">
                        <CircleAlert className="w-3.5 h-3.5 mr-1" />
                        Pendiente
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 pt-0 pb-4">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/cuestionario/${j.id}/bienestar`} className="block">
                        <Button
                          variant={completoBienestar ? "secondary" : "outline"}
                          className={
                            completoBienestar ? "bg-green-50 text-green-700 border-green-200" : "bg-transparent"
                          }
                        >
                          {completoBienestar ? "Bienestar (hoy ✓)" : "Bienestar"}
                        </Button>
                      </Link>
                      <Link href={`/cuestionario/${j.id}/percepcion-esfuerzo`} className="block">
                        <Button
                          variant={completoRpe ? "secondary" : "outline"}
                          className={completoRpe ? "bg-green-50 text-green-700 border-green-200" : "bg-transparent"}
                        >
                          {completoRpe ? "RPE (hoy ✓)" : "RPE"}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
