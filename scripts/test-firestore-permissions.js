// Script para probar permisos de Firestore
// Ejecuta: node scripts/test-firestore-permissions.js

import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, setDoc, updateDoc, deleteDoc, getDoc, collection, addDoc } from "firebase/firestore"

// Configuración de Firebase (reemplaza con tu configuración)
const firebaseConfig = {
  // Tu configuración aquí
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

async function testPermissions() {
  try {
    console.log("🔄 Iniciando prueba de permisos de Firestore...")

    // Necesitas estar autenticado para probar
    console.log("⚠️  Para probar permisos, necesitas autenticarte primero")
    console.log("📧 Ingresa tu email y contraseña cuando se solicite")

    // Aquí deberías autenticarte con un usuario válido
    // const userCredential = await signInWithEmailAndPassword(auth, "tu-email@ejemplo.com", "tu-contraseña")
    // console.log("✅ Usuario autenticado:", userCredential.user.email)

    console.log("⚠️  Asegúrate de estar autenticado antes de continuar")

    // Test 1: Crear documento
    console.log("\n📝 Test 1: Crear documento de prueba...")
    const testDocRef = doc(db, "test-permissions", "test-doc-" + Date.now())
    await setDoc(testDocRef, {
      test: true,
      createdAt: new Date(),
      message: "Test de permisos de creación",
    })
    console.log("✅ Documento creado exitosamente")

    // Test 2: Leer documento
    console.log("\n📖 Test 2: Leer documento...")
    const docSnap = await getDoc(testDocRef)
    if (docSnap.exists()) {
      console.log("✅ Documento leído exitosamente:", docSnap.data())
    } else {
      console.log("❌ No se pudo leer el documento")
    }

    // Test 3: Actualizar documento
    console.log("\n✏️  Test 3: Actualizar documento...")
    await updateDoc(testDocRef, {
      updated: true,
      updatedAt: new Date(),
      message: "Test de permisos de actualización",
    })
    console.log("✅ Documento actualizado exitosamente")

    // Test 4: Verificar actualización
    console.log("\n🔍 Test 4: Verificar actualización...")
    const updatedDocSnap = await getDoc(testDocRef)
    if (updatedDocSnap.exists()) {
      const data = updatedDocSnap.data()
      if (data.updated) {
        console.log("✅ Actualización verificada exitosamente")
      } else {
        console.log("❌ La actualización no se reflejó")
      }
    }

    // Test 5: Eliminar documento
    console.log("\n🗑️  Test 5: Eliminar documento...")
    await deleteDoc(testDocRef)
    console.log("✅ Documento eliminado exitosamente")

    // Test 6: Probar colecciones específicas
    console.log("\n🎯 Test 6: Probar colecciones específicas...")

    const collections = ["jugadores", "partidos", "usuarios", "staff", "clientes"]

    for (const collectionName of collections) {
      try {
        console.log(`\n📁 Probando colección: ${collectionName}`)
        const testRef = await addDoc(collection(db, collectionName), {
          test: true,
          collection: collectionName,
          createdAt: new Date(),
        })
        console.log(`✅ ${collectionName}: Creación exitosa`)

        await updateDoc(testRef, {
          updated: true,
          updatedAt: new Date(),
        })
        console.log(`✅ ${collectionName}: Actualización exitosa`)

        await deleteDoc(testRef)
        console.log(`✅ ${collectionName}: Eliminación exitosa`)
      } catch (error) {
        console.log(`❌ ${collectionName}: Error - ${error.code}: ${error.message}`)
      }
    }

    console.log("\n🎉 Prueba de permisos completada")
  } catch (error) {
    console.error("❌ Error en la prueba de permisos:", error.code, error.message)

    if (error.code === "permission-denied") {
      console.log("\n🚨 ERROR DE PERMISOS DETECTADO")
      console.log("📋 Pasos para solucionarlo:")
      console.log("1. Ve a Firebase Console > Firestore Database > Rules")
      console.log("2. Reemplaza las reglas con:")
      console.log(`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write, create, update, delete: if request.auth != null;
    }
  }
}`)
      console.log("3. Haz clic en 'Publicar'")
      console.log("4. Espera unos segundos y vuelve a probar")
    }
  }
}

// Ejecutar la prueba
testPermissions()

console.log(`
🔧 INSTRUCCIONES DE USO:
1. Asegúrate de tener un usuario autenticado
2. Ejecuta: node scripts/test-firestore-permissions.js
3. Revisa los resultados para identificar problemas de permisos
`)
