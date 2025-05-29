# Firebase to Supabase Migration Guide

This guide will help you migrate your Firebase application to Supabase.

## Authentication Migration

1. Replace Firebase Auth with Supabase Auth:

\`\`\`javascript
// Before (Firebase)
import { auth } from './lib/firebaseConfig'
import { signInWithEmailAndPassword } from 'firebase/auth'

const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    // ...
  } catch (error) {
    // ...
  }
}

// After (Supabase)
import { authHelpers } from './lib/supabaseUtils'

const login = async (email, password) => {
  try {
    const { user } = await authHelpers.signInWithEmailAndPassword(email, password)
    // ...
  } catch (error) {
    // ...
  }
}
\`\`\`

## Database Migration

1. Replace Firestore with Supabase Database:

\`\`\`javascript
// Before (Firebase)
import { db } from './lib/firebaseConfig'
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore'

// Add a document
const addUser = async (userData) => {
  try {
    const docRef = await addDoc(collection(db, "users"), userData)
    console.log("Document written with ID: ", docRef.id)
  } catch (error) {
    console.error("Error adding document: ", error)
  }
}

// Query documents
const getActiveUsers = async () => {
  try {
    const q = query(collection(db, "users"), where("status", "==", "active"))
    const querySnapshot = await getDocs(q)
    const users = []
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() })
    })
    return users
  } catch (error) {
    console.error("Error getting documents: ", error)
    return []
  }
}

// After (Supabase)
import { collection } from './lib/supabaseUtils'

// Add a document
const addUser = async (userData) => {
  try {
    const newUser = await collection("users").add(userData)
    console.log("Document written with ID: ", newUser.id)
  } catch (error) {
    console.error("Error adding document: ", error)
  }
}

// Query documents
const getActiveUsers = async () => {
  try {
    const querySnapshot = await collection("users").where("status", "==", "active").get()
    const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return users
  } catch (error) {
    console.error("Error getting documents: ", error)
    return []
  }
}
\`\`\`

## Data Migration

To migrate your existing data from Firebase to Supabase:

1. Export your Firestore data using the Firebase Admin SDK
2. Transform the data to match Supabase's structure
3. Import the data into Supabase

You can use the Firebase wrapper in Supabase to help with this migration:
https://supabase.com/docs/guides/database/extensions/wrappers/firebase

## Schema Setup in Supabase

Before importing data, create the necessary tables in Supabase:

1. Go to the Supabase dashboard
2. Navigate to the SQL Editor
3. Create tables that match your Firestore collections

Example:

\`\`\`sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see their own data
CREATE POLICY "Users can view their own data" 
  ON users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);
