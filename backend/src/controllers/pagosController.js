const supabase = require('../config/supabase');

// Valida que la fecha tenga formato YYYY-MM-DD y que exista en el calendario
// (evita fechas como 2024-02-30 o 2024-13-01)
const isValidDate = (dateStr) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;

  const [year, month, day] = dateStr.split('-').map(Number);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
};

// Retorna todos los pagos ordenados por fecha programada ascendente
const getPagos = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .order('fechaprogramada', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Retorna un pago por su ID
// Espera: params.id (número entero)
const getPagoById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Pago no encontrado' });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Retorna todos los pagos de un empleado específico ordenados por fecha
// Espera: params.idEmpleado (número entero)
const getPagosByEmpleado = async (req, res, next) => {
  try {
    const { idEmpleado } = req.params;
    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .eq('idempleado', idEmpleado)
      .order('fechaprogramada', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Crea un nuevo pago para un empleado
// Espera body: { idEmpleado, totalPago, fechaProgramada (YYYY-MM-DD) }
const createPago = async (req, res, next) => {
  try {
    const { idEmpleado, totalPago, fechaProgramada } = req.body;

    if (!idEmpleado || totalPago === undefined || !fechaProgramada) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: idEmpleado, totalPago, fechaProgramada',
      });
    }

    if (!isValidDate(fechaProgramada)) {
      return res.status(400).json({
        success: false,
        message: 'fechaProgramada inválida. Usa el formato YYYY-MM-DD y asegúrate de que la fecha exista',
      });
    }

    // totalPago debe ser un entero positivo
    if (!Number.isInteger(Number(totalPago)) || Number(totalPago) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'totalPago debe ser un número entero positivo',
      });
    }

    const { data, error } = await supabase
      .from('pagos')
      .insert({ idempleado: idEmpleado, totalpago: totalPago, fechaprogramada: fechaProgramada })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Actualiza solo los campos enviados de un pago
// Espera params.id y body con uno o más de: { idEmpleado, totalPago, fechaProgramada }
const updatePago = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { idEmpleado, totalPago, fechaProgramada } = req.body;

    const updates = {};

    if (idEmpleado !== undefined) updates.idempleado = idEmpleado;

    if (totalPago !== undefined) {
      if (!Number.isInteger(Number(totalPago)) || Number(totalPago) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'totalPago debe ser un número entero positivo',
        });
      }
      updates.totalpago = totalPago;
    }

    if (fechaProgramada !== undefined) {
      if (!isValidDate(fechaProgramada)) {
        return res.status(400).json({
          success: false,
          message: 'fechaProgramada inválida. Usa el formato YYYY-MM-DD y asegúrate de que la fecha exista',
        });
      }
      updates.fechaprogramada = fechaProgramada;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No se enviaron campos para actualizar' });
    }

    const { data, error } = await supabase
      .from('pagos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Pago no encontrado' });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Elimina un pago por su ID
// Espera: params.id (número entero)
const deletePago = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('pagos').delete().eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Pago eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPagos, getPagoById, getPagosByEmpleado, createPago, updatePago, deletePago };
