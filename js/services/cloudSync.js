// Fase 1.1: autenticacion y sincronizacion con Firestore.
// Todo esto es opcional -- si no se configura Firebase (ver firebaseConfig.js),
// la app sigue funcionando 100% en localStorage como hasta ahora.
import { DB } from '../db/db.js';
import { FIREBASE_CONFIGURED, getFirebase } from './firebaseConfig.js';

function requireFirebase() {
  if (!FIREBASE_CONFIGURED) throw new Error('Firebase no está configurado. Edita js/services/firebaseConfig.js primero.');
}

// Devuelve una función para cancelar la suscripción. Si Firebase no está
// configurado, o no hay internet, avisa user=null y la app sigue en modo local.
export function watchAuthState(callback) {
  if (!FIREBASE_CONFIGURED) { callback(null); return () => {}; }
  let unsub = () => {}, cancelled = false;
  getFirebase().then(({ auth, authApi }) => {
    if (!cancelled) unsub = authApi.onAuthStateChanged(auth, (user) => callback(user));
  }).catch((err) => { console.warn('Sprint Lab: sin conexión con Firebase, sigue el modo local.', err); callback(null); });
  return () => { cancelled = true; unsub(); };
}

export async function signUp(email, password) {
  const { auth, authApi } = await getFirebase();
  const cred = await authApi.createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signIn(email, password) {
  const { auth, authApi } = await getFirebase();
  const cred = await authApi.signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOutUser() {
  const { auth, authApi } = await getFirebase();
  await authApi.signOut(auth);
}

function athleteDocRef(fb, uid, athleteId) {
  return fb.fsApi.doc(fb.firestore, 'users', uid, 'athletes', athleteId);
}

// Sube UN atleta (perfil + sesiones + modelo + plan semanal + notas + notificaciones
// descartadas) al documento Firestore correspondiente. `merge: true` para no
// pisar campos que no mandamos (por si en el futuro se agregan mas).
export async function pushAthleteToCloud(uid, athleteId) {
  const fb = await getFirebase();
  const payload = {
    profile: DB.getAthlete(athleteId),
    sessions: DB.getSessions(athleteId),
    model: DB.getModel(athleteId),
    weeklyPlan: DB.getWeeklyPlan(athleteId),
    customPhases: DB.getCustomPhases(athleteId),
    clinicalNotes: DB.getClinicalNotes(athleteId),
    dismissedIds: DB.getDismissedNotifications(athleteId),
    updatedAt: fb.fsApi.serverTimestamp(),
  };
  await fb.fsApi.setDoc(athleteDocRef(fb, uid, athleteId), payload, { merge: true });
}

export async function pushAllAthletesToCloud(uid) {
  requireFirebase();
  const ids = DB.getAthleteIds();
  for (const id of ids) await pushAthleteToCloud(uid, id);
  return ids.length;
}

// Trae todos los atletas del usuario desde Firestore y los guarda localmente.
// Simplificacion importante (documentada): en caso de conflicto, GANA LA NUBE.
// No hay merge campo-a-campo entre lo local y lo remoto todavia; eso requeriria
// timestamps por campo o un CRDT, que queda fuera del alcance de esta fase.
export async function pullAllAthletesFromCloud(uid) {
  requireFirebase();
  const fb = await getFirebase();
  const snap = await fb.fsApi.getDocs(fb.fsApi.collection(fb.firestore, 'users', uid, 'athletes'));
  const localIds = new Set(DB.getAthleteIds());
  snap.forEach(docSnap => {
    const athleteId = docSnap.id;
    const data = docSnap.data();
    if (data.profile) DB.saveAthlete(athleteId, data.profile);
    if (data.sessions) DB.saveSessions(athleteId, data.sessions);
    if (data.model !== undefined) DB.saveModel(athleteId, data.model);
    if (data.weeklyPlan) DB.saveWeeklyPlan(athleteId, data.weeklyPlan);
    if (Array.isArray(data.customPhases)) DB.saveCustomPhases(athleteId, data.customPhases);
    if (data.clinicalNotes) DB.saveClinicalNotes(athleteId, data.clinicalNotes);
    if (data.dismissedIds) DB.saveDismissedNotifications(athleteId, data.dismissedIds);
    localIds.add(athleteId);
  });
  DB.saveAthleteIds(Array.from(localIds));
  return snap.size;
}

// Sincronizacion completa manual: primero sube lo local que la nube no tenga
// version mas nueva, luego trae lo de la nube. Para esta primera version se
// hace secuencial (push y luego pull) -- ver nota de conflictos arriba.
export async function syncNow(uid) {
  await pushAllAthletesToCloud(uid);
  const count = await pullAllAthletesFromCloud(uid);
  return count;
}
