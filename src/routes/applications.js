const express = require('express');
const router = express.Router();
const { db } = require('../config/firebaseAdmin');
const { ensureAuth } = require('../middlewares/auth');
const admin = require('firebase-admin');

// Candidato se postula
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

    // Revisar si ya tiene postulación
    const existsSnap = await db.collection('applications')
      .where('vacancyId', '==', vacancyId)
      .where('userId', '==', uid)
      .limit(1).get();
    if (!existsSnap.empty) {
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

// El candidato ve sus postulaciones
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

// ---- CORREGIDO: El recruiter ve postulaciones recibidas en sus vacantes ----
router.get('/recruiter', ensureAuth, async (req, res) => {
  try {
    const { uid, role } = req.user;
    if (role !== 'RECRUITER') {
      return res.status(403).json({ error: 'Solo reclutadores pueden ver esto' });
    }

    // Buscar vacantes de este recruiter
    const vacSnap = await db.collection('vacancies')
      .where('recruiterId', '==', uid)
      .get();

    const vacIds = vacSnap.docs.map(doc => doc.id);

    if (!vacIds.length) return res.json([]);

    // Buscar postulaciones de esas vacantes (máx 10 por in)
    const appsSnap = await db.collection('applications')
      .where('vacancyId', 'in', vacIds.slice(0, 10))
      .get();

    const apps = [];
    for (const doc of appsSnap.docs) {
      const data = doc.data();
      let vacancy = null;
      try {
        const v = vacSnap.docs.find(vac => vac.id === data.vacancyId);
        if (v) vacancy = v.data();
      } catch (_) { vacancy = null; }

      apps.push({
        id: doc.id,
        ...data,
        vacancy,
        createdAt: data.createdAt && data.createdAt.toDate()
      });
    }
    res.json(apps);
  } catch (err) {
    console.error('Error GET /applications/recruiter:', err);
    res.status(500).json({ error: 'Error al obtener postulaciones' });
  }
});

// Cambiar estado de una postulación (recruiter)
router.patch('/:id', ensureAuth, async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'RECRUITER') {
      return res.status(403).json({ error: 'Solo reclutadores pueden cambiar estado' });
    }
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Falta estado' });
    await db.collection('applications').doc(id).update({ status });
    res.json({ success: true });
  } catch (err) {
    console.error('Error PATCH /applications/:id:', err);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

module.exports = router;
