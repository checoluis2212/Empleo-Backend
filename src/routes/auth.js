// ── src/routes/auth.js ─────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db } = require('../config/firebaseAdmin');
const { generateToken } = require('../utils/jwt');

/**
 * Estructura en Firestore:
 * Colección: users
 * Documento con ID = email (por simplicidad). 
 * Campos: { passwordHash: string, role: "CANDIDATE" | "RECRUITER", createdAt: Timestamp }
 */

/**
 * POST /api/auth/register
 * {
 *   email: string,
 *   password: string,
 *   role: "CANDIDATE" | "RECRUITER"
 * }
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    if (role !== 'CANDIDATE' && role !== 'RECRUITER') {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    // 1) Verificar si el usuario ya existe en Firestore
    const userRef = db.collection('users').doc(email);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      return res.status(409).json({ error: 'Usuario ya registrado' });
    }

    // 2) Hashear la contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 3) Crear el documento en Firestore
    const now = new Date();
    await userRef.set({
      passwordHash,
      role,
      createdAt: now
    });

    // 4) Generar el token JWT
    const token = generateToken({ uid: email, role });
    return res.status(201).json({ token, role });

  } catch (err) {
    console.error('Error en /register:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/auth/login
 * {
 *   email: string,
 *   password: string
 * }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    // 1) Buscar el documento del usuario en Firestore
    const userRef = db.collection('users').doc(email);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const userData = userDoc.data(); // { passwordHash, role, createdAt }

    // 2) Comparar la contraseña
    const match = await bcrypt.compare(password, userData.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 3) Generar token
    const token = generateToken({ uid: email, role: userData.role });
    return res.json({ token, role: userData.role });

  } catch (err) {
    console.error('Error en /login:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
