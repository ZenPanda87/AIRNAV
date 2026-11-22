-- Migrasi 04: pengerasan keamanan (saran Supabase advisor)
alter function public.cek_stok_keluar() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.k3_level(int) set search_path = public;
alter function public.icao_tol(int, text) set search_path = public;
alter function public.sec_level(int) set search_path = public;
alter function public.sec_accept(int) set search_path = public;
revoke execute on function public.apar_after_inspection() from public, anon, authenticated;
revoke execute on function public.apar_after_service() from public, anon, authenticated;
revoke execute on function public.finding_after_update() from public, anon, authenticated;
revoke execute on function public.log_activity() from public, anon, authenticated;
revoke execute on function public.sec_activity_slot() from public, anon, authenticated;
revoke execute on function public.can(text,text,text) from public, anon;
grant execute on function public.can(text,text,text) to authenticated;
