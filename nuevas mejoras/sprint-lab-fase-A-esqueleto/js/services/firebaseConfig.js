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

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

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

let app = null, auth = null, firestore = null;
if (FIREBASE_CONFIGURED) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  firestore = getFirestore(app);
} else {
  console.warn('Sprint Lab: Firebase no está configurado todavía (js/services/firebaseConfig.js). La app sigue funcionando 100% localmente hasta que pegues tu firebaseConfig ahí.');
}

export { app, auth, firestore };
