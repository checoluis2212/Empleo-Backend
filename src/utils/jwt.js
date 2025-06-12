// ── src/utils/jwt.js ───────────────────────────────────────────────────────

/**
 * Funciones auxiliares para generar y verificar JSON Web Tokens (JWT).
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Genera un token que incluirá el campo "uid" (email) y "role".
 * Este token expirará en 24 horas (puedes ajustar el tiempo si quieres).
 */
function generateToken(user) {
  // user = { uid: 'correo@ejemplo.com', role: 'CANDIDATE' }
  return jwt.sign(
    {
      uid: user.uid,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Verifica un token recibido en la cabecera Authorization.
 * Si es válido, devuelve el objeto payload { uid, role, iat, exp }.
 * Si no, lanza un error.
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  generateToken,
  verifyToken
};
