const supabase = require('../config/supabase');

const HORAS_JORNADA_NORMAL = 7.33; // jornada laboral diaria (7h 20min); lo que supere esto son horas extra
const VALOR_HORA_EXTRA = 9948.32; // valor monetario fijo por hora extra diurna

// Valida que la fecha tenga formato YYYY-MM-DD y que exista en el calendario
const isValidDate = (dateStr) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() + 1 === month &&
    d.getUTCDate() === day
  );
};

// Valida que la hora tenga formato HH:MM o HH:MM:SS dentro de rango válido
const isValidTime = (timeStr) => /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(timeStr);

// Convierte "HH:MM" o "HH:MM:SS" a minutos totales
const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// Calcula horas_trabajadas, horas_extra y su valor monetario a partir de
// hora_entrada, hora_salida y descanso_horas.
// Soporta turnos que cruzan medianoche (ej: 22:00 -> 06:00).
// Retorna null si el descanso supera el tiempo trabajado.
const calcularHoras = (hora_entrada, hora_salida, descanso_horas) => {
  const entradaMin = timeToMinutes(hora_entrada);
  let salidaMin = timeToMinutes(hora_salida);

  if (salidaMin <= entradaMin) salidaMin += 24 * 60; // turno nocturno

  const descansoMin = parseFloat(descanso_horas) * 60;
  const trabajadasMin = salidaMin - entradaMin - descansoMin;

  if (trabajadasMin < 0) return null;

  const horas_trabajadas = parseFloat((trabajadasMin / 60).toFixed(2));
  const horas_extra = parseFloat(Math.max(0, horas_trabajadas - HORAS_JORNADA_NORMAL).toFixed(2));
  const valor_horas_extra = parseFloat((horas_extra * VALOR_HORA_EXTRA).toFixed(2));

  return { horas_trabajadas, horas_extra, valor_horas_extra };
};

// Retorna todos los registros de jornada ordenados por fecha descendente
const getJornadas = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('registros_jornada')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Retorna un registro de jornada por su ID
// Espera: params.id (número entero)
const getJornadaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('registros_jornada')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Registro no encontrado' });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Retorna todas las jornadas de un empleado ordenadas por fecha descendente
// Espera: params.idEmpleado (número entero)
const getJornadasByEmpleado = async (req, res, next) => {
  try {
    const { idEmpleado } = req.params;
    const { data, error } = await supabase
      .from('registros_jornada')
      .select('*')
      .eq('id_empleado', idEmpleado)
      .order('fecha', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Retorna el total acumulado de horas extra y su valor monetario para un empleado
// Suma todas las jornadas registradas históricamente
// Espera: params.idEmpleado (número entero)
const getResumenExtrasEmpleado = async (req, res, next) => {
  try {
    const { idEmpleado } = req.params;

    const { data, error } = await supabase
      .from('registros_jornada')
      .select('horas_extra')
      .eq('id_empleado', idEmpleado);

    if (error) throw error;

    const total_horas_extra = parseFloat(
      data.reduce((sum, row) => sum + parseFloat(row.horas_extra || 0), 0).toFixed(2)
    );
    const total_valor_extras = parseFloat((total_horas_extra * VALOR_HORA_EXTRA).toFixed(2));

    res.json({
      success: true,
      data: {
        id_empleado: parseInt(idEmpleado),
        total_horas_extra,
        valor_hora_extra: VALOR_HORA_EXTRA,
        total_valor_extras,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Crea un nuevo registro de jornada. Calcula automáticamente horas_trabajadas y horas_extra.
// Espera body: { id_empleado, fecha (YYYY-MM-DD), hora_entrada (HH:MM), hora_salida (HH:MM), descanso_horas? (número >= 0, default 0) }
// Retorna el registro guardado más el valor_horas_extra calculado
const createJornada = async (req, res, next) => {
  try {
    const { id_empleado, fecha, hora_entrada, hora_salida, descanso_horas = 0 } = req.body;

    if (!id_empleado || !fecha || !hora_entrada || !hora_salida) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: id_empleado, fecha, hora_entrada, hora_salida',
      });
    }

    if (!isValidDate(fecha)) {
      return res.status(400).json({ success: false, message: 'fecha inválida. Usa el formato YYYY-MM-DD' });
    }

    if (!isValidTime(hora_entrada)) {
      return res.status(400).json({ success: false, message: 'hora_entrada inválida. Usa HH:MM o HH:MM:SS' });
    }

    if (!isValidTime(hora_salida)) {
      return res.status(400).json({ success: false, message: 'hora_salida inválida. Usa HH:MM o HH:MM:SS' });
    }

    const descanso = parseFloat(descanso_horas);
    if (isNaN(descanso) || descanso < 0) {
      return res.status(400).json({ success: false, message: 'descanso_horas debe ser un número >= 0' });
    }

    const horas = calcularHoras(hora_entrada, hora_salida, descanso);
    if (!horas) {
      return res.status(400).json({
        success: false,
        message: 'El tiempo de descanso no puede ser mayor al tiempo entre entrada y salida',
      });
    }

    const { data, error } = await supabase
      .from('registros_jornada')
      .insert({
        id_empleado,
        fecha,
        hora_entrada,
        hora_salida,
        descanso_horas: descanso,
        horas_trabajadas: horas.horas_trabajadas,
        horas_extra: horas.horas_extra,
      })
      .select()
      .single();

    if (error) throw error;

    // valor_horas_extra se calcula pero no se persiste en BD (la tabla no tiene esa columna)
    res.status(201).json({
      success: true,
      data: { ...data, valor_horas_extra: horas.valor_horas_extra },
    });
  } catch (error) {
    next(error);
  }
};

// Actualiza solo los campos enviados. Si cambia algún campo de tiempo, recalcula las horas.
// Espera params.id y body con uno o más de: { fecha, hora_entrada, hora_salida, descanso_horas }
// Retorna el registro actualizado; si hubo recálculo, incluye también valor_horas_extra
const updateJornada = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fecha, hora_entrada, hora_salida, descanso_horas } = req.body;

    const updates = {};

    if (fecha !== undefined) {
      if (!isValidDate(fecha)) {
        return res.status(400).json({ success: false, message: 'fecha inválida. Usa el formato YYYY-MM-DD' });
      }
      updates.fecha = fecha;
    }

    if (hora_entrada !== undefined) {
      if (!isValidTime(hora_entrada)) {
        return res.status(400).json({ success: false, message: 'hora_entrada inválida. Usa HH:MM o HH:MM:SS' });
      }
      updates.hora_entrada = hora_entrada;
    }

    if (hora_salida !== undefined) {
      if (!isValidTime(hora_salida)) {
        return res.status(400).json({ success: false, message: 'hora_salida inválida. Usa HH:MM o HH:MM:SS' });
      }
      updates.hora_salida = hora_salida;
    }

    if (descanso_horas !== undefined) {
      const descanso = parseFloat(descanso_horas);
      if (isNaN(descanso) || descanso < 0) {
        return res.status(400).json({ success: false, message: 'descanso_horas debe ser un número >= 0' });
      }
      updates.descanso_horas = descanso;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No se enviaron campos para actualizar' });
    }

    // Si cambió algún campo de tiempo, busca el registro actual para completar los valores
    // que no se enviaron y recalcular correctamente
    let valor_horas_extra = null;
    if (updates.hora_entrada || updates.hora_salida || updates.descanso_horas !== undefined) {
      const { data: current, error: fetchError } = await supabase
        .from('registros_jornada')
        .select('hora_entrada, hora_salida, descanso_horas')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!current) return res.status(404).json({ success: false, message: 'Registro no encontrado' });

      const entrada = updates.hora_entrada ?? current.hora_entrada;
      const salida = updates.hora_salida ?? current.hora_salida;
      const descanso = updates.descanso_horas ?? current.descanso_horas;

      const horas = calcularHoras(entrada, salida, descanso);
      if (!horas) {
        return res.status(400).json({
          success: false,
          message: 'El tiempo de descanso no puede ser mayor al tiempo entre entrada y salida',
        });
      }

      updates.horas_trabajadas = horas.horas_trabajadas;
      updates.horas_extra = horas.horas_extra;
      valor_horas_extra = horas.valor_horas_extra;
    }

    const { data, error } = await supabase
      .from('registros_jornada')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Registro no encontrado' });

    res.json({
      success: true,
      data: valor_horas_extra !== null ? { ...data, valor_horas_extra } : data,
    });
  } catch (error) {
    next(error);
  }
};

// Elimina un registro de jornada por su ID
// Espera: params.id (número entero)
const deleteJornada = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('registros_jornada').delete().eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Registro de jornada eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getJornadas,
  getJornadaById,
  getJornadasByEmpleado,
  getResumenExtrasEmpleado,
  createJornada,
  updateJornada,
  deleteJornada,
};
