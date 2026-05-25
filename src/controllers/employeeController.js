const supabase = require('../config/supabase');
const { supabaseAdmin } = require('../config/supabase');
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

// Retorna el empleado del usuario autenticado.
// GET /api/employees/me
// Requiere authMiddleware antes: usa req.user.id (UUID verificado por Supabase).
const getEmployeeByAuthId = async (req, res, next) => {
  try {
    const authUserId = req.user.id;

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no vinculado a una cuenta. Contacta al administrador.',
      });
    }

    res.json({ success: true, data: sanitizeEmployee(data) });
  } catch (error) {
    next(error);
  }
};

// Retorna un empleado por su ID.
// Si :id es un número entero → busca por la columna id (PK).
// Si :id es un UUID          → busca por auth_user_id (clave de Supabase Auth).
const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const column = isUUID ? 'auth_user_id' : 'id';

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq(column, id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Empleado no encontrado' });

    res.json({ success: true, data: sanitizeEmployee(data) });
  } catch (error) {
    next(error);
  }
};

/**
 * Crea un empleado nuevo:
 * 1. Verifica que no exista ya en employees (por email o cédula) → 409 si existe.
 * 2. Invita al usuario por email usando supabaseAdmin (SERVICE ROLE KEY).
 * 3. Guarda el empleado en la tabla employees con auth_user_id del usuario invitado.
 * 4. Si la invitación falla, NO guarda el empleado.
 *
 * Espera body: { cedula, nombre, apellido, email, salario, rol? }
 */
const createEmployee = async (req, res, next) => {
  try {
    const { cedula, nombre, apellido, email, salario, rol = 'empleado' } = req.body;

    // Validación de campos requeridos
    if (!cedula || !nombre || !apellido || !email || salario === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: cedula, nombre, apellido, email, salario',
      });
    }

    if (!['empleado', 'admin'].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: "El campo rol debe ser 'empleado' o 'admin'",
      });
    }

    // Verificar duplicado por email
    const { data: byEmail } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (byEmail) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un empleado con ese email',
      });
    }

    // Verificar duplicado por cédula (la cédula está encriptada, hay que buscar por valor encriptado)
    // Como AES-CBC usa IV aleatorio, no podemos comparar directamente en BD.
    // Traemos todas las cédulas y comparamos en memoria (aceptable para volúmenes pequeños).
    const { data: allEmployees } = await supabaseAdmin
      .from('employees')
      .select('id, cedula');

    const cedulaExists = (allEmployees || []).some((emp) => {
      try {
        return decrypt(emp.cedula) === String(cedula);
      } catch {
        return false;
      }
    });

    if (cedulaExists) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un empleado con esa cédula',
      });
    }

    // Invitar al usuario por email (Supabase envía el correo de invitación)
    const redirectTo = process.env.INVITE_REDIRECT_URL || 'http://localhost:8100/set-password';

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: { nombre, apellido },
      }
    );

    if (inviteError) {
      return res.status(502).json({
        success: false,
        message: `Error al enviar la invitación: ${inviteError.message}`,
      });
    }

    const authUserId = inviteData.user?.id;

    if (!authUserId) {
      return res.status(502).json({
        success: false,
        message: 'Supabase no devolvió el ID del usuario invitado',
      });
    }

    // Guardar empleado en la tabla
    const { data: employee, error: insertError } = await supabaseAdmin
      .from('employees')
      .insert({
        auth_user_id: authUserId,
        cedula: encrypt(cedula),
        nombre,
        apellido,
        email,
        salario,
        rol,
      })
      .select()
      .single();

    if (insertError) {
      // Si falla el insert, intentar eliminar el usuario de Auth para no dejar huérfanos
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {});
      throw insertError;
    }

    res.status(201).json({ success: true, data: sanitizeEmployee(employee) });
  } catch (error) {
    next(error);
  }
};

// Actualiza solo los campos enviados. Si viene cédula, se encripta.
// Espera params.id y body con uno o más de: { cedula, nombre, apellido, salario, rol, activo }
const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cedula, nombre, apellido, salario, rol, activo } = req.body;

    const updates = {};
    if (cedula !== undefined) updates.cedula = encrypt(cedula);
    if (nombre !== undefined) updates.nombre = nombre;
    if (apellido !== undefined) updates.apellido = apellido;
    if (salario !== undefined) updates.salario = salario;
    if (rol !== undefined) updates.rol = rol;
    if (activo !== undefined) updates.activo = activo;

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

module.exports = { getEmployees, getEmployeeById, getEmployeeByAuthId, createEmployee, updateEmployee, deleteEmployee };
