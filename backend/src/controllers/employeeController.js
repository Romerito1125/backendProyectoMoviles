const supabase = require('../config/supabase');
const { encrypt, decrypt } = require('../utils/encryption');

// Desencripta los campos sensibles antes de enviarlos al cliente
const sanitizeEmployee = (employee) => ({
  ...employee,
  cedula: decrypt(employee.cedula),
});

// Retorna todos los empleados con la cédula desencriptada
const getEmployees = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('employees').select('*');
    if (error) throw error;

    res.json({ success: true, data: data.map(sanitizeEmployee) });
  } catch (error) {
    next(error);
  }
};

// Retorna un empleado por su ID con la cédula desencriptada
// Espera: params.id (número entero)
const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Empleado no encontrado' });

    res.json({ success: true, data: sanitizeEmployee(data) });
  } catch (error) {
    next(error);
  }
};

// Crea un nuevo empleado. La cédula se encripta antes de guardarla.
// Espera body: { cedula, nombre, apellido, salario }
const createEmployee = async (req, res, next) => {
  try {
    const { cedula, nombre, apellido, salario } = req.body;

    if (!cedula || !nombre || !apellido || salario === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: cedula, nombre, apellido, salario',
      });
    }

    const { data, error } = await supabase
      .from('employees')
      .insert({ cedula: encrypt(cedula), nombre, apellido, salario })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data: sanitizeEmployee(data) });
  } catch (error) {
    next(error);
  }
};

// Actualiza solo los campos enviados. Si viene cédula, se encripta.
// Espera params.id y body con uno o más de: { cedula, nombre, apellido, salario }
const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cedula, nombre, apellido, salario } = req.body;

    const updates = {};
    if (cedula !== undefined) updates.cedula = encrypt(cedula);
    if (nombre !== undefined) updates.nombre = nombre;
    if (apellido !== undefined) updates.apellido = apellido;
    if (salario !== undefined) updates.salario = salario;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No se enviaron campos para actualizar' });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Empleado no encontrado' });

    res.json({ success: true, data: sanitizeEmployee(data) });
  } catch (error) {
    next(error);
  }
};

// Elimina un empleado por su ID
// Espera: params.id (número entero)
const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('employees').delete().eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Empleado eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee };
