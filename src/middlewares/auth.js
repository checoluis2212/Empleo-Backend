// ── src/middlewares/auth.js ───────────────────────────────────────────────

/**
 * Middleware para proteger rutas:
 * - Verifica que exista un header "Authorization: Bearer <token>"
 * - Verifica ese token usando jsonwebtoken
 * - Si el token es válido, inyecta en req.user: { uid, role }
 * - Si el token no es válido o el header está mal formado, responde 401 con JSON { error: '...' }
 */

const { verifyToken } = require('../utils/jwt');

function ensureAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header mal formado' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authorization header mal formado' });
  }

  try {
    const decoded = verifyToken(token); // { uid, role, iat, exp }
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Error en ensureAuth:', err);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = { ensureAuth };
