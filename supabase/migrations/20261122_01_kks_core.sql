-- =========================================================================
-- Sistem Informasi KKS Terpadu AIRNAV — Migrasi 01: inti & hak akses
-- Aman dijalankan ulang. Kompatibel dengan web inventaris lama (admins/is_admin).
-- =========================================================================
create extension if not exists pgcrypto;

-- ---------- LOKASI (8) ----------
create table if not exists public.units (
  id          text primary key,
  icao        text,
  sheet_code  text,
  name        text not null,
  short_name  text,
  type        text,
  city        text,
  aliases     text[] not null default '{}',
  sort        int  not null default 0,
  active      boolean not null default true
);

insert into public.units (id, icao, sheet_code, name, short_name, type, city, aliases, sort) values
  ('TRK','WAQQ','TRK','Perum LPPNPI Cabang Tarakan','Tarakan','Cabang','Tarakan','{TARAKAN}',1),
  ('MLN','WAQM','LNU','Perum LPPNPI Cabang Pembantu Malinau','Malinau','Cabang Pembantu','Malinau','{MALINAU,LNU}',2),
  ('NNX','WAQA','NNX','Perum LPPNPI Unit Nunukan','Nunukan','Unit','Nunukan','{NUNUKAN}',3),
  ('TJS','WAQD','TJS','Perum LPPNPI Unit Tanjung Harapan','Tanjung Harapan','Unit','Tanjung Selor','{"TANJUNG HARAPAN","TANJUNG SELOR"}',4),
  ('LBW','WAQJ','LBW','Perum LPPNPI Unit Long Bawan','Long Bawan','Unit','Long Bawan','{"LONG BAWAN"}',5),
  ('LPU','WAQL','LPU','Perum LPPNPI Unit Long Apung','Long Apung','Unit','Long Apung','{"LONG APUNG","LONG AMPUNG"}',6),
  ('LYU','WAQU','LYU','Perum LPPNPI Unit Long Layu','Long Layu','Unit','Long Layu','{"LONG LAYU"}',7),
  ('BNG','WAQG','BNG','Perum LPPNPI Unit Binuang','Binuang','Unit','Binuang','{BINUANG}',8)
on conflict (id) do update set icao = excluded.icao, sheet_code = excluded.sheet_code, name = excluded.name,
  short_name = excluded.short_name, type = excluded.type, city = excluded.city, aliases = excluded.aliases, sort = excluded.sort;

-- Inventaris lama: ganti CHECK 6 lokasi menjadi FK ke units (8 lokasi)
alter table public.items drop constraint if exists items_unit_id_check;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'items_unit_id_fkey') then
    alter table public.items add constraint items_unit_id_fkey foreign key (unit_id) references public.units(id);
  end if;
end $$;
alter table public.items add column if not exists ideal_qty int;
alter table public.items add column if not exists brand text;
alter table public.items add column if not exists material text;
alter table public.items add column if not exists item_condition text;

-- ---------- PENGGUNA, PERAN, MATRIKS HAK ----------
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  position_title text,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists public.user_roles (
  id       bigserial primary key,
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     text not null check (role in ('superadmin','admin_kks','petugas_k3','avsec','inspektur_kampen',
                                         'teknik','operasi','kepala_unit','pimpinan')),
  unit_id  text references public.units(id),          -- NULL = semua lokasi
  created_at timestamptz not null default now()
);
create unique index if not exists user_roles_uniq on public.user_roles (user_id, role, coalesce(unit_id, '*'));

create table if not exists public.perm_matrix (
  module text not null,
  role   text not null,
  perms  text not null,          -- huruf C R U D A
  primary key (module, role)
);

-- Cek hak: superadmin selalu boleh; selain itu lihat matriks + cakupan lokasi peran.
create or replace function public.can(p_module text, p_action text, p_unit text default null)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.active from public.profiles p where p.user_id = auth.uid()), true)
     and (
       exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = 'superadmin')
       or exists (
         select 1 from public.user_roles r
           join public.perm_matrix m on m.role = r.role and m.module = p_module
          where r.user_id = auth.uid()
            and position(p_action in m.perms) > 0
            and (r.unit_id is null or p_unit is null or r.unit_id = p_unit))
     );
$$;
grant execute on function public.can(text, text, text) to authenticated, anon;

-- Kompatibel web inventaris lama: "admin" = boleh mengubah inventaris
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
      or public.can('INVENTARIS', 'U', null);
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- Admin lama → superadmin
insert into public.user_roles (user_id, role, unit_id)
select a.user_id, 'superadmin', null from public.admins a
on conflict do nothing;
insert into public.profiles (user_id, full_name, position_title)
select a.user_id, 'Super Admin', 'Manager KKS' from public.admins a
on conflict (user_id) do nothing;

-- Matriks hak akses (sesuai 03_RANCANGAN_USE_CASE §8). superadmin implisit penuh.
delete from public.perm_matrix;
insert into public.perm_matrix (module, role, perms)
select v.module, v.role, v.perms from (values
  ('USERS','admin_kks','R'),
  ('MASTER','admin_kks','CRUD'),('MASTER','petugas_k3','R'),('MASTER','avsec','R'),('MASTER','inspektur_kampen','R'),
  ('MASTER','teknik','R'),('MASTER','operasi','R'),('MASTER','kepala_unit','R'),('MASTER','pimpinan','R'),
  ('PERSONEL','admin_kks','CRUD'),('PERSONEL','petugas_k3','R'),('PERSONEL','avsec','R'),('PERSONEL','inspektur_kampen','R'),
  ('PERSONEL','teknik','R'),('PERSONEL','operasi','R'),('PERSONEL','kepala_unit','R'),('PERSONEL','pimpinan','R'),
  ('INVENTARIS','admin_kks','CRUD'),('INVENTARIS','petugas_k3','CRU'),('INVENTARIS','teknik','R'),('INVENTARIS','kepala_unit','CRU'),('INVENTARIS','pimpinan','R'),
  ('APAR','admin_kks','CRUDA'),('APAR','petugas_k3','CRU'),('APAR','teknik','R'),('APAR','kepala_unit','CRU'),('APAR','pimpinan','R'),
  ('P3K','admin_kks','CRUDA'),('P3K','petugas_k3','CRU'),('P3K','teknik','R'),('P3K','kepala_unit','CRU'),('P3K','pimpinan','R'),
  ('PATROL','admin_kks','CRUDA'),('PATROL','petugas_k3','CRU'),('PATROL','teknik','R'),('PATROL','operasi','R'),('PATROL','kepala_unit','R'),('PATROL','pimpinan','R'),
  ('JSAWP','admin_kks','CRUDA'),('JSAWP','petugas_k3','RUA'),('JSAWP','teknik','CRU'),('JSAWP','operasi','CRU'),('JSAWP','kepala_unit','R'),('JSAWP','pimpinan','R'),
  ('LINGKUNGAN','admin_kks','CRUD'),('LINGKUNGAN','petugas_k3','CRU'),('LINGKUNGAN','teknik','R'),('LINGKUNGAN','kepala_unit','R'),('LINGKUNGAN','pimpinan','R'),
  ('SMK3','admin_kks','CRUD'),('SMK3','petugas_k3','R'),('SMK3','kepala_unit','R'),('SMK3','pimpinan','RA'),
  ('KEGIATAN','admin_kks','CRUD'),('KEGIATAN','petugas_k3','CRU'),('KEGIATAN','avsec','CRU'),('KEGIATAN','inspektur_kampen','CRU'),
  ('KEGIATAN','operasi','CRU'),('KEGIATAN','teknik','R'),('KEGIATAN','kepala_unit','R'),('KEGIATAN','pimpinan','R'),
  ('TRAFFIC','admin_kks','CRUD'),('TRAFFIC','operasi','CRU'),('TRAFFIC','teknik','R'),('TRAFFIC','kepala_unit','R'),('TRAFFIC','pimpinan','R'),
  ('OCCURRENCE','admin_kks','CRUD'),('OCCURRENCE','teknik','R'),('OCCURRENCE','operasi','R'),('OCCURRENCE','kepala_unit','R'),('OCCURRENCE','pimpinan','R'),
  ('AVAILABILITY','admin_kks','CRUD'),('AVAILABILITY','teknik','CRU'),('AVAILABILITY','kepala_unit','R'),('AVAILABILITY','pimpinan','R'),
  ('KPI','admin_kks','CRUD'),('KPI','teknik','R'),('KPI','operasi','R'),('KPI','kepala_unit','R'),('KPI','pimpinan','RA'),
  ('HAZARD','admin_kks','CRUDA'),('HAZARD','petugas_k3','R'),('HAZARD','teknik','RU'),('HAZARD','operasi','RU'),('HAZARD','kepala_unit','RU'),('HAZARD','pimpinan','R'),
  ('SAG','admin_kks','CRUD'),('SAG','petugas_k3','R'),('SAG','teknik','RU'),('SAG','operasi','RU'),('SAG','kepala_unit','RU'),('SAG','pimpinan','RA'),
  ('SAFREC','admin_kks','CRUD'),('SAFREC','teknik','RU'),('SAFREC','operasi','RU'),('SAFREC','kepala_unit','R'),('SAFREC','pimpinan','R'),
  ('RSA','admin_kks','CRUD'),('RSA','kepala_unit','R'),('RSA','pimpinan','R'),
  ('SECPROG','admin_kks','CRUDA'),('SECPROG','avsec','R'),('SECPROG','inspektur_kampen','CRU'),('SECPROG','kepala_unit','R'),('SECPROG','pimpinan','RA'),
  ('SECLOG','admin_kks','CRUD'),('SECLOG','avsec','CRU'),('SECLOG','inspektur_kampen','R'),('SECLOG','kepala_unit','R'),('SECLOG','pimpinan','R'),
  ('SECFAC','admin_kks','CRUD'),('SECFAC','avsec','CRU'),('SECFAC','inspektur_kampen','R'),('SECFAC','teknik','R'),('SECFAC','kepala_unit','R'),('SECFAC','pimpinan','R'),
  ('SECINC','admin_kks','CRUD'),('SECINC','avsec','CR'),('SECINC','inspektur_kampen','R'),('SECINC','kepala_unit','CR'),('SECINC','pimpinan','R'),
  ('SECRISK','admin_kks','CRUD'),('SECRISK','avsec','R'),('SECRISK','inspektur_kampen','CRU'),('SECRISK','kepala_unit','R'),('SECRISK','pimpinan','R'),
  ('TEMUAN','admin_kks','CRUDA'),('TEMUAN','petugas_k3','CRU'),('TEMUAN','avsec','RU'),('TEMUAN','inspektur_kampen','CRU'),
  ('TEMUAN','teknik','RU'),('TEMUAN','operasi','RU'),('TEMUAN','kepala_unit','RU'),('TEMUAN','pimpinan','R'),
  ('PROKER','admin_kks','CRUD'),('PROKER','petugas_k3','R'),('PROKER','avsec','R'),('PROKER','inspektur_kampen','R'),
  ('PROKER','teknik','R'),('PROKER','operasi','R'),('PROKER','kepala_unit','R'),('PROKER','pimpinan','RA'),
  ('LAPORAN','admin_kks','CRUD'),('LAPORAN','petugas_k3','R'),('LAPORAN','avsec','R'),('LAPORAN','inspektur_kampen','R'),
  ('LAPORAN','teknik','R'),('LAPORAN','operasi','R'),('LAPORAN','kepala_unit','R'),('LAPORAN','pimpinan','RA'),
  ('EVIDENCE','admin_kks','CRUD'),('EVIDENCE','petugas_k3','CR'),('EVIDENCE','avsec','CR'),('EVIDENCE','inspektur_kampen','CR'),
  ('EVIDENCE','teknik','CR'),('EVIDENCE','operasi','CR'),('EVIDENCE','kepala_unit','CR'),('EVIDENCE','pimpinan','R')
) as v(module, role, perms);

-- ---------- PENGATURAN (JSON) ----------
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

-- ---------- LOG AKTIVITAS ----------
create table if not exists public.activity_log (
  id       bigserial primary key,
  at       timestamptz not null default now(),
  user_id  uuid default auth.uid(),
  tbl      text not null,
  row_id   text,
  action   text not null,
  unit_id  text,
  old_data jsonb
);
create index if not exists activity_log_at_idx on public.activity_log (at desc);

create or replace function public.log_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare j jsonb;
begin
  j := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.activity_log (tbl, row_id, action, unit_id, old_data)
  values (tg_table_name, j->>'id', tg_op, j->>'unit_id', case when tg_op = 'DELETE' then to_jsonb(old) else null end);
  return null;
end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ---------- METADATA EVIDENCE (isi file di Google Drive kantor) ----------
create table if not exists public.files (
  id              uuid primary key default gen_random_uuid(),
  provider        text not null default 'gdrive',
  drive_file_id   text unique,
  drive_folder_id text,
  folder_path     text,
  file_name       text not null,
  mime            text,
  size_bytes      int,
  sha256          text,
  web_view_url    text,
  share_scope     text not null default 'domain_link' check (share_scope in ('domain_link','restricted')),
  unit_id         text not null references public.units(id),
  domain          text not null check (domain in ('K3','KESELAMATAN','KEAMANAN','PENGAWASAN','LAPORAN','UMUM')),
  module          text not null,           -- kode modul hak akses (APAR, P3K, TEMUAN, ...)
  entity          text not null,           -- nama tabel
  entity_id       text not null,
  period          text,
  caption         text,
  taken_at        timestamptz,
  uploaded_by     uuid default auth.uid(),
  uploaded_at     timestamptz not null default now(),
  locked          boolean not null default false,
  deleted_at      timestamptz,
  deleted_by      uuid
);
create index if not exists files_entity_idx on public.files (entity, entity_id);
create index if not exists files_unit_idx on public.files (unit_id, domain, period);
create unique index if not exists files_dedup on public.files (entity, entity_id, sha256) where deleted_at is null;

-- ---------- RLS INTI ----------
alter table public.units enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.perm_matrix enable row level security;
alter table public.app_settings enable row level security;
alter table public.activity_log enable row level security;
alter table public.files enable row level security;

drop policy if exists units_read on public.units;
create policy units_read on public.units for select to anon, authenticated using (true);
drop policy if exists units_write on public.units;
create policy units_write on public.units for all to authenticated
  using (public.can('MASTER','U',null)) with check (public.can('MASTER','U',null));

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (true);
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for update to authenticated
  using (user_id = auth.uid() or public.can('USERS','U',null))
  with check (user_id = auth.uid() or public.can('USERS','U',null));
drop policy if exists profiles_admin_ins on public.profiles;
create policy profiles_admin_ins on public.profiles for insert to authenticated with check (public.can('USERS','C',null));

drop policy if exists roles_read on public.user_roles;
create policy roles_read on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.can('USERS','R',null));
drop policy if exists roles_write on public.user_roles;
create policy roles_write on public.user_roles for all to authenticated
  using (public.can('USERS','U',null)) with check (public.can('USERS','U',null));

drop policy if exists perm_read on public.perm_matrix;
create policy perm_read on public.perm_matrix for select to authenticated using (true);
drop policy if exists perm_write on public.perm_matrix;
create policy perm_write on public.perm_matrix for all to authenticated
  using (public.can('USERS','U',null)) with check (public.can('USERS','U',null));

drop policy if exists settings_read on public.app_settings;
create policy settings_read on public.app_settings for select to authenticated using (true);
drop policy if exists settings_write on public.app_settings;
create policy settings_write on public.app_settings for all to authenticated
  using (public.can('MASTER','U',null)) with check (public.can('MASTER','U',null));

drop policy if exists log_read on public.activity_log;
create policy log_read on public.activity_log for select to authenticated using (public.can('USERS','R',null));

drop policy if exists files_read on public.files;
create policy files_read on public.files for select to authenticated
  using (public.can(module,'R',unit_id));
drop policy if exists files_ins on public.files;
create policy files_ins on public.files for insert to authenticated
  with check (public.can('EVIDENCE','C',unit_id) and (public.can(module,'C',unit_id) or public.can(module,'U',unit_id)));
drop policy if exists files_upd on public.files;
create policy files_upd on public.files for update to authenticated
  using (not locked and (public.can('EVIDENCE','D',unit_id) or (uploaded_by = auth.uid() and uploaded_at > now() - interval '24 hours')))
  with check (true);

-- Inventaris: tulis per lokasi sesuai peran (baca publik tetap seperti semula)
drop policy if exists "admin kelola items" on public.items;
create policy "admin kelola items" on public.items for all to authenticated
  using (exists (select 1 from public.admins where user_id = auth.uid()) or public.can('INVENTARIS','U',unit_id))
  with check (exists (select 1 from public.admins where user_id = auth.uid()) or public.can('INVENTARIS','U',unit_id));
drop policy if exists "admin kelola transaksi" on public.transactions;
create policy "admin kelola transaksi" on public.transactions for all to authenticated
  using (exists (select 1 from public.admins where user_id = auth.uid()) or public.can('INVENTARIS','U',unit_id))
  with check (exists (select 1 from public.admins where user_id = auth.uid()) or public.can('INVENTARIS','U',unit_id));
