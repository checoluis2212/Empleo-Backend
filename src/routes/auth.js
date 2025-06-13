// ── src/routes/auth.js ─────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { nanoid } = require('nanoid'); // <--- Usa nanoid
const { db } = require('../config/firebaseAdmin');
const { generateToken } = require('../utils/jwt');

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

    // 1) Buscar si ya existe un usuario con este email
    const usersRef = db.collection('users');
    const existingQuery = await usersRef.where('email', '==', email).limit(1).get();
    if (!existingQuery.empty) {
      return res.status(409).json({ error: 'Usuario ya registrado' });
    }

    // 2) Hashear la contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 3) Generar un id amigable de 5 caracteres
    const userId = nanoid(5);

    // 4) Crear el documento en Firestore
    const now = new Date();
    await usersRef.doc(userId).set({
      id: userId,
      email,
      passwordHash,
      role,
      createdAt: now,
      applications: 0 // contador de postulaciones (opcional)
    });

    // 5) Generar el token JWT
    const token = generateToken({ uid: userId, role });
    return res.status(201).json({ token, role, uid: userId });

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

    // 1) Buscar usuario por email (ya NO por documentId)
    const usersRef = db.collection('users');
    const querySnap = await usersRef.where('email', '==', email).limit(1).get();
    if (querySnap.empty) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const userDoc = querySnap.docs[0];
    const userData = userDoc.data();

    // 2) Comparar la contraseña
    const match = await bcrypt.compare(password, userData.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 3) Generar token con el id amigable
    const token = generateToken({ uid: userData.id, role: userData.role });
    return res.json({ token, role: userData.role, uid: userData.id });

  } catch (err) {
    console.error('Error en /login:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
