# Configuración de Reglas de Firestore para Bienestar

## Pasos para configurar las reglas de Firestore:

### 1. Acceder a la Consola de Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. En el menú lateral, haz clic en "Firestore Database"
4. Ve a la pestaña "Rules"

### 2. Copiar las Reglas de Seguridad
Copia y pega las siguientes reglas en el editor:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reglas para la colección 'users'
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null;
    }
    
    // Reglas para la colección 'jugadores'
    match /jugadores/{jugadorId} {
      allow read, write: if request.auth != null;
    }
    
    // Reglas para la colección 'bienestar' - CRÍTICO PARA EL GUARDADO
    match /bienestar/{bienestarId} {
      // Permitir lectura si el usuario está autenticado
      allow read: if request.auth != null;
      
      // Permitir escritura si:
      // 1. El usuario está autenticado
      // 2. El UID del documento coincide con el UID del usuario autenticado
      // 3. O si el jugadorEmail coincide con el email del usuario autenticado
      allow create: if request.auth != null && 
        (request.resource.data.uid == request.auth.uid ||
         request.resource.data.jugadorEmail == request.auth.token.email);
      
      // Permitir actualización si el usuario es el propietario del documento
      allow update: if request.auth != null && 
        (resource.data.uid == request.auth.uid ||
         resource.data.jugadorEmail == request.auth.token.email);
      
      // Permitir eliminación si el usuario es el propietario del documento
      allow delete: if request.auth != null && 
        (resource.data.uid == request.auth.uid ||
         resource.data.jugadorEmail == request.auth.token.email);
    }
    
    // Reglas para otras colecciones
    match /entrenamientos/{entrenamientoId} {
      allow read, write: if request.auth != null;
    }
    
    match /evaluaciones/{evaluacionId} {
      allow read, write: if request.auth != null;
    }
    
    match /partidos/{partidoId} {
      allow read, write: if request.auth != null;
    }
    
    // Regla por defecto - denegar acceso a otras colecciones no especificadas
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
\`\`\`

### 3. Publicar las Reglas
1. Haz clic en "Publish" para aplicar las reglas
2. Confirma la publicación

### 4. Verificar el Funcionamiento
- La aplicación ahora probará automáticamente los permisos al cargar
- Si los permisos están correctos, verás un mensaje verde
- Si hay problemas, verás un mensaje rojo con detalles

### Puntos Clave de las Reglas:

1. **Autenticación Requerida**: Todos los usuarios deben estar autenticados
2. **Campo UID**: Cada documento de bienestar debe incluir el UID del usuario
3. **Campo jugadorEmail**: Como alternativa, se verifica el email del jugador
4. **Sin Fallback**: Los datos SOLO se guardan en Firestore, no en localStorage

### Solución de Problemas:

Si sigues teniendo problemas:
1. Verifica que el usuario esté autenticado correctamente
2. Revisa que el documento incluya los campos `uid` y `jugadorEmail`
3. Comprueba que el UID del usuario coincida con el campo `uid` del documento
4. Asegúrate de que las reglas se hayan publicado correctamente
