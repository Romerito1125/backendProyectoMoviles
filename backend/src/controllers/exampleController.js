const supabase = require('../config/supabase');

// GET /api/items
const getItems = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('items').select('*');

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// GET /api/items/:id
const getItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Item no encontrado' });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// POST /api/items
const createItem = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('items')
      .insert(req.body)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// PUT /api/items/:id
const updateItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('items')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Item no encontrado' });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/items/:id
const deleteItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('items').delete().eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Item eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getItems, getItemById, createItem, updateItem, deleteItem };
