const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');
const { ensureAuth } = require('../middlewares/auth');
const admin = require('firebase-admin');

// Crear vacante (solo recruiter)
router.post('/', ensureAuth, async (req, res) => {
  try {
    const { uid, role } = req.user;
    if (role !== 'RECRUITER') {
      return res.status(403).json({ error: 'Solo reclutadores pueden crear vacantes' });
    }
    const { title, company, location, description } = req.body;
    if (!title || !company || !location || !description) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    const now = admin.firestore.Timestamp.fromDate(new Date());
    const newVacRef = await db.collection('vacancies').add({
      title,
      company,
      location,
      description,
      recruiterId: uid,
      createdAt: now,
    });
    const newDoc = await newVacRef.get();
    return res.status(201).json({ id: newDoc.id, ...newDoc.data() });
  } catch (err) {
    console.error('Error POST /vacancies:', err);
    return res.status(500).json({ error: 'Error al crear vacante' });
  }
});

// Ver vacantes del recruiter (con conteo de postulaciones)
router.get('/recruiter', ensureAuth, async (req, res) => {
  try {
    const { uid, role } = req.user;
    if (role !== 'RECRUITER') {
      return res.status(403).json({ error: 'Solo reclutadores pueden ver esto' });
    }

    const snap = await db.collection('vacancies')
      .where('recruiterId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();

    const vacancies = [];
    for (const doc of snap.docs) {
      const vac = { id: doc.id, ...doc.data() };
      // Contar postulaciones para cada vacante
      const appsSnap = await db.collection('applications')
        .where('vacancyId', '==', doc.id)
        .get();
      vac.applicationsCount = appsSnap.size;
      vacancies.push(vac);
    }
    res.json(vacancies);
  } catch (err) {
    console.error('Error GET /vacancies/recruiter:', err);
    res.status(500).json({ error: 'Error al obtener vacantes' });
  }
});

// Obtener TODAS las vacantes (público: candidatos y reclutadores)
router.get('/', async (req, res) => {
  try {
    const snap = await db.collection('vacancies').orderBy('createdAt', 'desc').get();
    const vacancies = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(vacancies);
  } catch (err) {
    console.error('Error GET /vacancies:', err);
    res.status(500).json({ error: 'Error al obtener vacantes' });
  }
});

module.exports = router;
