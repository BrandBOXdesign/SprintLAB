// Fase 1.1 del roadmap: sincronizacion en la nube.
//
// PASOS QUE TIENES QUE HACER TU EN LA CONSOLA DE FIREBASE (una sola vez):
//   1. Entra a https://console.firebase.google.com y crea un proyecto (gratis).
//   2. Dentro del proyecto: "Compilacion" -> "Authentication" -> "Comenzar"
//      -> pestaña "Sign-in method" -> habilita "Correo electronico/contraseña".
//   3. "Compilacion" -> "Firestore Database" -> "Crear base de datos"
//      -> puedes empezar en "modo de prueba" y luego aplicar las reglas de
//      seguridad de mas abajo antes de usarlo con datos reales.
//   4. "Configuracion del proyecto" (el engranaje) -> baja hasta "Tus apps"
//      -> icono "</>" (Web) -> registra la app -> copia el objeto
//      `firebaseConfig` que te muestra y pegalo aqui abajo, reemplazando
//      los valores de ejemplo.
//
// REGLAS DE SEGURIDAD DE FIRESTORE (pegar en Firestore -> Reglas):
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /users/{userId}/{document=**} {
//         allow read, write: if request.auth != null && request.auth.uid == userId;
//       }
//     }
//   }
//   Esto asegura que cada entrenador solo puede leer/escribir sus propios datos.

// IMPORTANTE (modo offline): el SDK de Firebase se carga con import()
// dinámico y solo cuando se usa la nube (getFirebase). Un import estático
// desde gstatic.com hacía que, sin internet, FALLARA todo el grafo de
// módulos y la app ni siquiera arrancaba.
const FIREBASE_VERSION = '12.15.0';
const FB_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

// TODO: reemplaza esto con el firebaseConfig real de tu proyecto (paso 4 de arriba).
const firebaseConfig = {
  apiKey: 'AIzaSyCWxWgOfxonNOBrHNKOF5vCdEtcIrAVQpc',
  authDomain: 'sprintlab-753b0.firebaseapp.com',
  projectId: 'sprintlab-753b0',
  storageBucket: 'sprintlab-753b0.firebasestorage.app',
  messagingSenderId: '552760725040',
  appId: '1:552760725040:web:4c2c0162ce45f72bc5e7f5',
  measurementId: 'G-YNJYMJY7QY',
};

export const FIREBASE_CONFIGURED = firebaseConfig.apiKey !== 'TU_API_KEY';

let _fb = null;
/**
 * Carga (una sola vez) el SDK de Firebase y devuelve { app, auth, firestore, authApi, fsApi }.
 * Lanza si no hay configuración o no hay internet; quien llama debe atrapar el error.
 */
export async function getFirebase() {
  if (!FIREBASE_CONFIGURED) throw new Error('Firebase no está configurado. Edita js/services/firebaseConfig.js primero.');
  if (!_fb) {
    _fb = (async () => {
      const [{ initializeApp }, authApi, fsApi] = await Promise.all([
        import(`${FB_BASE}/firebase-app.js`),
        import(`${FB_BASE}/firebase-auth.js`),
        import(`${FB_BASE}/firebase-firestore.js`),
      ]);
      const app = initializeApp(firebaseConfig);
      return { app, auth: authApi.getAuth(app), firestore: fsApi.getFirestore(app), authApi, fsApi };
    })();
    _fb.catch(() => { _fb = null; }); // permite reintentar si la primera carga falló por falta de red
  }
  return _fb;
}
