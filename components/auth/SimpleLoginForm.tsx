"use client"

import type React from "react"

import { signInWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "@/lib/firebaseConfig"
import { doc, getDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SimpleLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const uid = userCredential.user.uid

      const userDoc = await getDoc(doc(db, "users", uid))
      const userData = userDoc.data()
      const role = userData?.rol || userData?.role // Soporte para ambos nombres

      if (role === "admin") {
        router.push("/admin")
      } else if (role === "staff") {
        router.push("/staff")
      } else {
        router.push("/client")
      }
    } catch (err: any) {
      console.error(err)

      // Mensajes de error más específicos y amigables
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-email") {
        setError("Usuario no encontrado. Verifica tu correo electrónico.")
      } else if (err.code === "auth/wrong-password") {
        setError("Contraseña incorrecta. Inténtalo de nuevo.")
      } else if (err.code === "auth/too-many-requests") {
        setError("Demasiados intentos fallidos. Intenta más tarde o restablece tu contraseña.")
      } else {
        setError("Usuario o contraseña incorrectos.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <form onSubmit={handleLogin} className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6">Iniciar Sesión</h2>

        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={loading}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={loading}
        />

        <button
          type="submit"
          className="w-full bg-black text-white p-3 rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm font-medium text-center">{error}</p>
          </div>
        )}
      </form>
    </div>
  )
}
