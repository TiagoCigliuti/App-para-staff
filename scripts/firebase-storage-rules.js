// Reglas de Firebase Storage para permitir subida de archivos
// Copia estas reglas en Firebase Console > Storage > Rules

const storageRules = `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permitir acceso a archivos de tareas para usuarios autenticados
    match /tareas/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
    
    // Permitir acceso a imágenes públicas
    match /images/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Permitir acceso a archivos de perfil de usuario
    match /profiles/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Regla general para usuarios autenticados
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
`

console.log("=== REGLAS DE FIREBASE STORAGE ===")
console.log("Copia estas reglas en Firebase Console > Storage > Rules:")
console.log("")
console.log(storageRules)
console.log("")
console.log("=== INSTRUCCIONES ===")
console.log("1. Ve a Firebase Console")
console.log("2. Selecciona tu proyecto")
console.log("3. Ve a Storage > Rules")
console.log("4. Reemplaza las reglas existentes con las de arriba")
console.log("5. Haz clic en 'Publicar'")
