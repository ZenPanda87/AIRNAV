/**
 * Konfigurasi koneksi Supabase.
 *
 * Isi dengan nilai dari: Supabase Dashboard > Project Settings > API
 *   - Project URL         -> SUPABASE_URL
 *   - anon / public key   -> SUPABASE_ANON_KEY
 *
 * Anon key memang aman ditaruh di sisi browser karena seluruh akses data
 * dijaga oleh Row Level Security (lihat supabase/schema.sql).
 * JANGAN pernah menaruh "service_role" key di sini.
 *
 * Jika kedua nilai dikosongkan, aplikasi berjalan dalam MODE LOKAL
 * (offline, data di localStorage peramban, tanpa login).
 */
window.APP_CONFIG = {
  SUPABASE_URL: 'https://zdwseuyakwnknmuejppk.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_HTVNjoe2CgPYKnZmKESs5w_dZFuOpQn'
};
