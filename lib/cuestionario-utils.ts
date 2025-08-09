import { collection, getDocs, limit, query, where } from "firebase/firestore"
import { db } from "@/lib/firebaseConfig"

export async function getCuestionarioUserClienteId(params: { uid?: string | null; email?: string | null }) {
  const { uid, email } = params
  const collectionsToTry = ["usuarios-custionario", "usuarios-cuestionario"]
  for (const colName of collectionsToTry) {
    const baseRef = collection(db, colName)
    const queries = []
    if (uid) queries.push(query(baseRef, where("uid", "==", uid), limit(1)))
    if (email) queries.push(query(baseRef, where("email", "==", email), limit(1)))
    for (const q of queries) {
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
