// Reglas de Firestore para permitir acceso a todas las colecciones necesarias
// Copia estas reglas en Firebase Console > Firestore Database > Rules

const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acceso completo a usuarios autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Reglas específicas para bienestar
    match /bienestar/{document} {
      allow read, write: if request.auth != null 
        && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.uid;
    }
    
    // Reglas para calendario
    match /calendario/{clienteId}/actividades/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Reglas para jugadores
    match /jugadores/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Reglas para usuarios
    match /usuarios/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Reglas para staff
    match /staff/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Reglas para clientes
    match /clientes/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
`

console.log("Copia estas reglas en Firebase Console:")
console.log(firestoreRules)
