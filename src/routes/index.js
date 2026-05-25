const { Router } = require('express');
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');
const {
  getPagos,
  getPagoById,
  getPagosByEmpleado,
  createPago,
  updatePago,
  deletePago,
} = require('../controllers/pagosController');
const {
  getJornadas,
  getJornadaById,
  getJornadasByEmpleado,
  getResumenExtrasEmpleado,
  marcarEntrada,
  marcarSalida,
  updateJornada,
  deleteJornada,
} = require('../controllers/jornadaController');

const router = Router();

// ── Employees ────────────────────────────────────────────────────────────────
router.get('/employees', getEmployees);
router.get('/employees/:id', getEmployeeById);
router.post('/employees', createEmployee);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);

// ── Pagos ─────────────────────────────────────────────────────────────────────
router.get('/pagos', getPagos);
router.get('/pagos/empleado/:idEmpleado', getPagosByEmpleado); // antes de /pagos/:id
router.get('/pagos/:id', getPagoById);
router.post('/pagos', createPago);
router.put('/pagos/:id', updatePago);
router.delete('/pagos/:id', deletePago);

// ── Jornadas ──────────────────────────────────────────────────────────────────
// Rutas estáticas primero (antes de las que tienen :id)
router.get('/jornadas', getJornadas);
router.get('/jornadas/empleado/:idEmpleado', getJornadasByEmpleado);
router.get('/jornadas/empleado/:idEmpleado/resumen-extras', getResumenExtrasEmpleado);

// POST  → marcar entrada (crea el registro, hora_salida queda NULL)
router.post('/jornadas', marcarEntrada);

// PATCH → marcar salida (actualiza el registro existente con hora_salida y recalcula horas)
router.patch('/jornadas/:id/salida', marcarSalida);

// Rutas con :id
router.get('/jornadas/:id', getJornadaById);
router.put('/jornadas/:id', updateJornada);       // edición completa (admin)
router.delete('/jornadas/:id', deleteJornada);    // eliminar (admin)

module.exports = router;
