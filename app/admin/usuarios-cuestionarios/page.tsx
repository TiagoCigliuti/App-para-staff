"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react'
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  getFirestore,
  serverTimestamp,
} from "firebase/firestore"
import { getApp, getApps, initializeApp } from "firebase/app"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
}

function getClientDb() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  return getFirestore(app)
}

type Cliente = {
  id: string
  nombre?: string
}

type UsuarioCustionario = {
  id: string
  username: string
  email: string
  clienteid: string
  rol?: string
  createdAt?: Date | null
  uid?: string
}

export default function UsuariosCuestionariosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const db = getClientDb()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [clienteId, setClienteId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioCustionario[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingClientes, setLoadingClientes] = useState(true)

  const emailPreview = username ? `${username}@cuestionario.com` : ""

  async function loadClientes() {
    try {
      setLoadingClientes(true)
      const ref = collection(db, "clientes")
      const q = query(ref, orderBy("nombre", "asc"))
      const snap = await getDocs(q)
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Cliente[]
      setClientes(data)
    } catch (e) {
      console.error("Error cargando clientes", e)
      setClientes([])
    } finally {
      setLoadingClientes(false)
    }
  }

  async function loadUsuarios() {
    try {
      setLoadingList(true)
      // Nota: la colección se llama "usuarios-custionario" (según tu especificación)
      const ref = collection(db, "usuarios-custionario")
      const q = query(ref, orderBy("createdAt", "desc"))
      const snap = await getDocs(q)
      const data = snap.docs.map((d) => {
        const raw = d.data() as any
        return {
          id: d.id,
          username: raw.username,
          email: raw.email,
          clienteid: raw.clienteid,
          rol: raw.rol,
          uid: raw.uid,
          createdAt: raw.createdAt?.toDate ? raw.createdAt.toDate() : raw.createdAt ?? null,
        } as UsuarioCustionario
      })
      setUsuarios(data)
    } catch (e) {
      console.error("Error cargando usuarios-custionario", e)
      setUsuarios([])
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    loadClientes()
    loadUsuarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password || !clienteId) {
      toast({ description: "Completa usuario, contraseña y cliente.", variant: "destructive" })
      return
    }
    if (username.includes("@")) {
      toast({ description: "No incluyas @ en el nombre de usuario.", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      // Validar que el cliente seleccionado exista y usar su id exacto
      const selectedCliente = clientes.find((c) => c.id === clienteId)
      if (!selectedCliente) {
        toast({ description: "El cliente seleccionado no es válido.", variant: "destructive" })
        return
      }

      // 1) Crear usuario en Firebase Auth (servidor)
      const res = await fetch("/api/usuarios-custionario/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password,
        }),
      })

      const contentType = res.headers.get("content-type") || ""
      const isJson = contentType.includes("application/json")
      const payload: any = isJson ? await res.json() : await res.text()

      if (!res.ok) {
        const message =
          (isJson && payload && typeof payload === "object" && (payload.error || payload.message)) ||
          (typeof payload === "string" && payload) ||
          "No se pudo crear el usuario"
        throw new Error(message)
      }

      // 2) Guardar el documento en Firestore con clienteid EXACTO y rol "cuestionario"
      const uid = payload.uid as string
      const email = payload.email as string
      await addDoc(collection(db, "usuarios-custionario"), {
        username: username.toLowerCase(),
        email,
        clienteid: selectedCliente.id, // exactamente el id del cliente asignado
        uid,
        rol: "cuestionario",
        createdAt: serverTimestamp(),
      })

      toast({ description: "Usuario creado correctamente." })
      setUsername("")
      setPassword("")
      setClienteId("")
      await loadUsuarios()
    } catch (err: any) {
      console.error(err)
      toast({
        description: err?.message || "Error al crear usuario",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push("/admin")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Usuarios para cuestionarios</h1>
          </div>
          <Button variant="outline" onClick={() => loadUsuarios()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Recargar
          </Button>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Crear nuevo usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <div className="flex">
                  <Input
                    id="username"
                    placeholder="ej: juanperez"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                    disabled={submitting}
                    className="rounded-r-none"
                    required
                  />
                  <div className="px-3 border border-l-0 rounded-r-md bg-gray-50 text-gray-500 flex items-center">
                    {"@cuestionario.com"}
                  </div>
                </div>
                {emailPreview && <p className="text-xs text-gray-500">Email generado: {emailPreview}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente">Asignar cliente</Label>
                <select
                  id="cliente"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  disabled={submitting || loadingClientes}
                  required
                >
                  <option value="">{loadingClientes ? "Cargando..." : "Seleccionar cliente..."}</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre || c.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 pt-2">
                <Button type="submit" disabled={submitting || loadingClientes || !clientes.length} className="gap-2">
                  <Plus className="w-4 h-4" />
                  {submitting ? "Creando..." : "Crear usuario"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listado de usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingList ? (
              <div className="py-8 text-center text-gray-500">Cargando...</div>
            ) : usuarios.length === 0 ? (
              <div className="py-8 text-center text-gray-500">{"Aún no hay usuarios creados."}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border rounded-md overflow-hidden">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left text-sm font-medium text-gray-700 p-3">Usuario</th>
                      <th className="text-left text-sm font-medium text-gray-700 p-3">Email</th>
                      <th className="text-left text-sm font-medium text-gray-700 p-3">Cliente</th>
                      <th className="text-left text-sm font-medium text-gray-700 p-3">Rol</th>
                      <th className="text-left text-sm font-medium text-gray-700 p-3">Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => (
                      <tr key={u.id} className="border-t">
                        <td className="p-3">{u.username}</td>
                        <td className="p-3">{u.email}</td>
                        <td className="p-3">{u.clienteid}</td>
                        <td className="p-3">{u.rol || "-"}</td>
                        <td className="p-3">{u.createdAt ? new Date(u.createdAt).toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
