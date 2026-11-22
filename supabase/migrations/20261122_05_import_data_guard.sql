-- Migrasi 05: fungsi import_data (Restore/Reset inventaris) hanya untuk admin lama atau peran dengan hak hapus INVENTARIS
-- (Super Admin / Admin KKS). Petugas K3 & Kepala Unit tetap bisa input mutasi, tetapi tidak bisa reset data.
do $$
declare src text;
begin
  select pg_get_functiondef('public.import_data(jsonb,jsonb,boolean)'::regprocedure) into src;
  src := replace(src, 'if not public.is_admin() then', 'if not (exists (select 1 from public.admins where user_id = auth.uid()) or public.can(''INVENTARIS'',''D'',null)) then');
  execute src;
end $$;
