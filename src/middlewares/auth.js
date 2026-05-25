const { supabaseAdmin } = require('../config/supabase');

/**
 * Middleware de autenticación.
 * Verifica el JWT de Supabase enviado en el header Authorization: Bearer <token>.
 * Si es válido, adjunta req.user = { id: 'uuid', email: '...' } y llama a next().
 * Si no, responde 401.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return res.status(401).json({ success: false, message: 'Token de autorización requerido' });
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
    }

    req.user = user; // { id: 'uuid', email: '...', ... }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authMiddleware;
