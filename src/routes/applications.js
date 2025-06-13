// src/routes/applications.js

const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');
const { ensureAuth } = require('../middlewares/auth');
const admin = require('firebase-admin');

// POSTULARSE (solo una vez)
router.post('/', ensureAuth, async (req, res) => {
  try {
    const { uid, role } = req.user;
    if (role !== 'CANDIDATE') {
      return res.status(403).json({ error: 'Solo candidatos pueden postularse' });
    }
    const { vacancyId, resumeUrl } = req.body;
    if (!vacancyId || !resumeUrl) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // 1. Checar si ya existe postulación para ese usuario y vacante
    const duplicateSnap = await db.collection('applications')
      .where('userId', '==', uid)
      .where('vacancyId', '==', vacancyId)
      .limit(1)
      .get();

    if (!duplicateSnap.empty) {
      // En vez de error crítico, responde con mensaje y 409 (opcional)
      return res.status(409).json({ error: 'Ya te postulaste a esta vacante' });
    }

    const now = admin.firestore.Timestamp.fromDate(new Date());
    const newAppRef = await db.collection('applications').add({
      vacancyId,
      userId: uid,
      resumeUrl,
      status: 'PENDIENTE',
      createdAt: now
    });
    const newDoc = await newAppRef.get();
    return res.status(201).json({ id: newDoc.id, ...newDoc.data() });
  } catch (err) {
    console.error('Error POST /applications:', err);
    return res.status(500).json({ error: 'Error al crear postulación' });
  }
});

// LISTAR POSTULACIONES DEL USUARIO
router.get('/', ensureAuth, async (req, res) => {
  try {
    const { uid, role } = req.user;
    if (role !== 'CANDIDATE') {
      return res.status(403).json({ error: 'Solo candidatos pueden ver sus postulaciones' });
    }
    const snapshot = await db
      .collection('applications')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();

    const apps = [];
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      let vacancy = null;
      try {
        const vacSnap = await db.collection('vacancies').doc(data.vacancyId).get();
        if (vacSnap.exists) {
          vacancy = vacSnap.data();
        }
      } catch (_) {
        vacancy = null;
      }

      apps.push({
        id: docSnap.id,
        vacancyId: data.vacancyId,
        resumeUrl: data.resumeUrl,
        status: data.status,
        createdAt: data.createdAt.toDate(),
        vacancy
      });
    }

    return res.json(apps);
  } catch (err) {
    console.error('Error GET /applications:', err);
    return res.status(500).json({ error: 'Error al obtener postulaciones' });
  }
});

module.exports = router;
