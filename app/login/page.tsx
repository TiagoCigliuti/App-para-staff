"use client"

import { useAuth } from "@/components/auth/AuthProvider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import LoginForm from "@/components/auth/LoginForm"
import { collection, getDocs, limit, query, where } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [checkingRole, setCheckingRole] = useState(false)

  useEffect(() => {
    async function routeByRole() {
      if (!user) return
      setCheckingRole(true)
      try {
        // Determinar si el usuario tiene rol "cuestionario"
        const candidates = ["usuarios-custionario", "usuarios-cuestionario"]
        let isCuestionario = false
        for (const colName of candidates) {
          const baseRef = collection(db, colName)
          const queries = [
            user.uid ? query(baseRef, where("uid", "==", user.uid), limit(1)) : null,
            user.email ? query(baseRef, where("email", "==", user.email), limit(1)) : null,
          ].filter(Boolean) as any[]
          for (const q of queries) {
            const snap = await getDocs(q)
            if (!snap.empty) {
              const data = snap.docs[0].data() as any
              if ((data.rol || "").toLowerCase() === "cuestionario") {
                isCuestionario = true
              }
              break
            }
          }
          if (isCuestionario) break
        }
        if (isCuestionario) {
          router.push("/cuestionario")
        } else {
          router.push("/")
        }
      } finally {
        setCheckingRole(false)
      }
    }
    if (!loading && user) {
      void routeByRole()
    }
  }, [user, loading, router])

  if (loading || checkingRole) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
      </main>
    )
  }

  if (user) return null

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <h1
          className="text-center text-4xl font-extrabold tracking-tight mb-6 text-fuchsia-600 dark:text-fuchsia-400"
          aria-label="StaffPro"
        >
          {"StaffPro"}
        </h1>
        <LoginForm />
      </div>
    </main>
  )
}
