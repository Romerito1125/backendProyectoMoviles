// Middleware global de manejo de errores
const errorHandler = (err, req, res, next) => {
  console.error(err);

  const status = err.status || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(status).json({ success: false, message });
};

module.exports = errorHandler;
