import { render } from '../render/layout.js';
import { state } from '../state/state.js';
import { signIn, signOutUser, signUp, syncNow, watchAuthState } from '../services/cloudSync.js';
import { FIREBASE_CONFIGURED } from '../services/firebaseConfig.js';

// Se llama una vez al arrancar la app (desde app.js) para reaccionar cuando
// Firebase detecta sesión iniciada/cerrada (por ejemplo, al recargar la página
// con una sesión ya guardada por el navegador).
export function initAuthListener() {
  if (!FIREBASE_CONFIGURED) return;
  watchAuthState((user) => {
    state.cloudUser = user;
    render();
  });
}

export function setAuthFormField(field, value) {
  state.authForm[field] = value;
}

export function toggleAuthFormMode() {
  state.authFormMode = state.authFormMode === 'login' ? 'register' : 'login';
  state.authError = null;
  render();
}

export async function handleAuthSubmit() {
  const { email, password } = state.authForm;
  if (!email || !password) { state.authError = 'Completa correo y contraseña.'; render(); return; }
  state.authError = null;
  try {
    if (state.authFormMode === 'register') await signUp(email, password);
    else await signIn(email, password);
    state.authForm = { email: '', password: '' };
    render();
  } catch (e) {
    state.authError = translateAuthError(e);
    render();
  }
}

export async function handleSignOut() {
  try { await signOutUser(); } catch (e) { console.error(e); }
  render();
}

export async function handleSyncNow() {
  if (!state.cloudUser) return;
  state.syncStatus = 'syncing';
  state.syncMessage = 'Sincronizando…';
  render();
  try {
    const count = await syncNow(state.cloudUser.uid);
    state.syncStatus = 'synced';
    state.syncMessage = `Listo · ${count} atleta(s) sincronizado(s).`;
  } catch (e) {
    state.syncStatus = 'error';
    state.syncMessage = 'Error al sincronizar: ' + (e.message || e);
  }
  render();
}

function translateAuthError(e) {
  const code = e && e.code;
  const map = {
    'auth/email-already-in-use': 'Ese correo ya tiene una cuenta.',
    'auth/invalid-email': 'Correo no válido.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  };
  return map[code] || (e.message || 'Error de autenticación.');
}
