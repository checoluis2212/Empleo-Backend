// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const vacancyRoutes = require('./routes/vacancies');
const applicationRoutes = require('./routes/applications');
const { ensureAuth } = require('./middlewares/auth');

const app = express();

// 1) Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  })
);
app.use(express.json());

// 2) Rutas públicas
app.use('/api/auth', authRoutes);
app.use('/api/vacancies', vacancyRoutes);

// 3) Rutas protegidas (requieren token)
app.use('/api/applications', ensureAuth, applicationRoutes);

// 4) Ruta de prueba
app.get('/', (req, res) => {
  res.send('🚀 Backend de EmpleoMKT (Firestore) funcionando');
});

// 5) Handler 404
app.use((req, res) => {
  res.status(404).json({ error: 'No encontrado' });
});

// 6) Handler global de errores (último middleware)
app.use((err, req, res, next) => {
  console.error('ERROR GLOBAL:', err);
  res.status(err.statusCode || 500).json({ error: err.message || 'Algo salió mal.' });
});

// 7) Arrancar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
