// Script para generar reglas de Firestore más permisivas
// Ejecuta: node scripts/firestore-rules.js

console.log(`
🔥 REGLAS DE FIRESTORE ACTUALIZADAS - VERSIÓN PERMISIVA
=====================================================

Copia y pega estas reglas en Firebase Console > Firestore Database > Rules:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regla general: cualquier usuario autenticado puede hacer cualquier operación
    match /{document=**} {
      allow read, write, create, update, delete: if request.auth != null;
    }
    
    // Reglas específicas para mayor claridad (redundantes pero explícitas)
    match /jugadores/{document} {
      allow read, write, create, update, delete: if request.auth != null;
    }
    
    match /partidos/{document} {
      allow read, write, create, update, delete: if request.auth != null;
    }
    
    match /staff/{document} {
      allow read, write, create, update, delete: if request.auth != null;
    }
    
    match /users/{document} {
      allow read, write, create, update, delete: if request.auth != null;
    }
    
    match /clientes/{document} {
      allow read, write, create, update, delete: if request.auth != null;
    }
    
    match /posiciones/{document} {
      allow read, write, create, update, delete: if request.auth != null;
    }
    
    match /bienestar/{document} {
      allow read, write, create, update, delete: if request.auth != null;
    }
    
    match /entrenamientos/{document} {
      allow read, write, create, update, delete: if request.auth != null;
    }
    
    match /evaluaciones/{document} {
      allow read, write, create, update, delete: if request.auth != null;
    }
    
    match /test-permissions/{document} {
      allow read, write, create, update, delete: if request.auth != null;
    }
  }
}

📋 PASOS PARA APLICAR:
1. Ve a https://console.firebase.google.com
2. Selecciona tu proyecto
3. Ve a Firestore Database > Rules
4. BORRA todo el contenido actual
5. PEGA las reglas de arriba
6. Haz clic en "Publicar"
7. Espera 30-60 segundos para que se apliquen
8. Prueba crear y editar un jugador

⚠️  IMPORTANTE: Estas reglas son muy permisivas y están diseñadas para desarrollo.
En producción, considera implementar reglas más específicas basadas en roles.

🔧 DIAGNÓSTICO:
Si sigues teniendo problemas después de aplicar estas reglas:
1. Ejecuta: node scripts/test-firestore-permissions.js
2. Revisa la consola del navegador para errores específicos
3. Verifica que estés autenticado correctamente
4. Comprueba tu conexión a internet

`)
