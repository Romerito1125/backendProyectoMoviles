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
  createJornada,
  updateJornada,
  deleteJornada,
} = require('../controllers/jornadaController');

const router = Router();

// Employees
router.get('/employees', getEmployees);
router.get('/employees/:id', getEmployeeById);
router.post('/employees', createEmployee);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);

// Pagos
router.get('/pagos', getPagos);
router.get('/pagos/empleado/:idEmpleado', getPagosByEmpleado); // must be before /pagos/:id
router.get('/pagos/:id', getPagoById);
router.post('/pagos', createPago);
router.put('/pagos/:id', updatePago);
router.delete('/pagos/:id', deletePago);

// Jornadas
router.get('/jornadas', getJornadas);
router.get('/jornadas/empleado/:idEmpleado', getJornadasByEmpleado);
router.get('/jornadas/empleado/:idEmpleado/resumen-extras', getResumenExtrasEmpleado); // must be before /jornadas/:id
router.get('/jornadas/:id', getJornadaById);
router.post('/jornadas', createJornada);
router.put('/jornadas/:id', updateJornada);
router.delete('/jornadas/:id', deleteJornada);

module.exports = router;
