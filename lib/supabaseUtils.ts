import { supabase } from "./supabaseClient"

/**
 * Helper functions to make Firebase-like queries with Supabase
 */

// Collection reference equivalent
export const collection = (tableName: string) => {
  return {
    tableName,
    // Add document to collection (similar to addDoc in Firebase)
    add: async (data: any) => {
      const { data: result, error } = await supabase.from(tableName).insert(data).select()

      if (error) throw error
      return { id: result?.[0]?.id, ...result?.[0] }
    },
    // Get all documents from collection
    get: async () => {
      const { data, error } = await supabase.from(tableName).select("*")

      if (error) throw error
      return {
        docs: data.map((doc) => ({
          id: doc.id,
          data: () => ({ ...doc }),
        })),
      }
    },
    // Create a query with where clause
    where: (field: string, operator: string, value: any) => {
      let queryBuilder = supabase.from(tableName).select("*")

      // Map Firebase operators to Supabase
      switch (operator) {
        case "==":
          queryBuilder = queryBuilder.eq(field, value)
          break
        case "!=":
          queryBuilder = queryBuilder.neq(field, value)
          break
        case ">":
          queryBuilder = queryBuilder.gt(field, value)
          break
        case ">=":
          queryBuilder = queryBuilder.gte(field, value)
          break
        case "<":
          queryBuilder = queryBuilder.lt(field, value)
          break
        case "<=":
          queryBuilder = queryBuilder.lte(field, value)
          break
        case "array-contains":
          queryBuilder = queryBuilder.contains(field, [value])
          break
        default:
          throw new Error(`Operator ${operator} not supported`)
      }

      return {
        get: async () => {
          const { data, error } = await queryBuilder

          if (error) throw error
          return {
            docs: data.map((doc) => ({
              id: doc.id,
              data: () => ({ ...doc }),
            })),
          }
        },
      }
    },
  }
}

// Document reference equivalent
export const doc = (tableName: string, docId: string) => {
  return {
    // Get document by ID
    get: async () => {
      const { data, error } = await supabase.from(tableName).select("*").eq("id", docId).single()

      if (error) throw error
      return {
        exists: !!data,
        id: docId,
        data: () => data,
      }
    },
    // Set document data
    set: async (data: any) => {
      const { error } = await supabase.from(tableName).upsert({ id: docId, ...data })

      if (error) throw error
    },
    // Update document data
    update: async (data: any) => {
      const { error } = await supabase.from(tableName).update(data).eq("id", docId)

      if (error) throw error
    },
    // Delete document
    delete: async () => {
      const { error } = await supabase.from(tableName).delete().eq("id", docId)

      if (error) throw error
    },
  }
}

// Auth helpers to mimic Firebase Auth
export const authHelpers = {
  // Sign up with email and password
  createUserWithEmailAndPassword: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error
    return { user: data.user }
  },

  // Sign in with email and password
  signInWithEmailAndPassword: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return { user: data.user }
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Get current user
  onAuthStateChanged: (callback: (user: any) => void) => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null)
    })

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe()
    }
  },
}
