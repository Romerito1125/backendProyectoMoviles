const { Router } = require('express');
const authMiddleware = require('../middlewares/auth');
const {
  getEmployees,
  getEmployeeById,
  getEmployeeByAuthId,
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
router.get('/employees/me', authMiddleware, getEmployeeByAuthId); // JWT verificado → antes de /:id
router.get('/employees/:id', getEmployeeById);                    // INT o UUID
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
router.get('/jornadas', getJornadas);
router.get('/jornadas/empleado/:idEmpleado', getJornadasByEmpleado);
router.get('/jornadas/empleado/:idEmpleado/resumen-extras', getResumenExtrasEmpleado);

router.post('/jornadas', authMiddleware, marcarEntrada);          // JWT verificado
router.patch('/jornadas/:id/salida', authMiddleware, marcarSalida); // JWT verificado

router.get('/jornadas/:id', getJornadaById);
router.put('/jornadas/:id', updateJornada);
router.delete('/jornadas/:id', deleteJornada);

module.exports = router;
