const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)'
  );
}

/**
 * Cliente con SERVICE ROLE KEY — tiene permisos de admin (invitar usuarios, bypassear RLS).
 * NUNCA exponer esta clave al frontend.
 */
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Cliente con ANON KEY — para operaciones públicas si aplica.
 * Puede ser null si no se configura SUPABASE_ANON_KEY.
 */
const supabase = anonKey
  ? createClient(supabaseUrl, anonKey)
  : supabaseAdmin; // fallback al admin si no hay anon key

module.exports = supabase;
module.exports.supabaseAdmin = supabaseAdmin;
