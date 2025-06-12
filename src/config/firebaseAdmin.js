// ── src/config/firebaseAdmin.js ──────────────────────────────────────────
const admin = require('firebase-admin');
const path  = require('path');

// 1) Construimos la ruta absoluta al JSON de credenciales:
const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

// 2) Lo cargamos con require. SI el JSON no existe en esa ruta, aquí fallará.
const serviceAccount = require(serviceAccountPath);

// 3) Inicializamos la app de Admin (sólo una vez):
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// 4) Exportamos la instancia de Firestore:
const db = admin.firestore();
module.exports = { admin, db };
