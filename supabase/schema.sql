-- =========================================================================
-- Sistem Rekapitulasi Inventaris Alat K3 - Perum LPPNPI Cabang Tarakan
-- Skema database Supabase (jalankan sekali di: Supabase Dashboard > SQL Editor)
-- =========================================================================

-- ---------- TABEL ADMIN ----------
-- Hanya user yang terdaftar di tabel ini yang boleh mengubah data.
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Fungsi pengecekan admin (security definer agar bisa membaca tabel admins)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admin dapat melihat dirinya" on public.admins;
create policy "admin dapat melihat dirinya" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- ---------- TABEL MASTER ALAT K3 ----------
create table if not exists public.items (
  id          text primary key,
  unit_id     text not null default 'TRK'
              check (unit_id in ('TRK','MLN','NNX','TJS','LBW','LPU')),
  nama        text not null,
  satuan      text not null default 'PCS',
  stok_awal   integer not null default 0 check (stok_awal >= 0),
  min_stok    integer not null default 2 check (min_stok >= 0),
  kategori    text,
  lokasi      text default 'Lemari K3',
  keterangan  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists items_unit_nama_uniq on public.items (unit_id, upper(nama));

-- ---------- TABEL TRANSAKSI MUTASI ----------
create table if not exists public.transactions (
  id           text primary key,
  tanggal      timestamptz not null default now(),
  jenis        text not null check (jenis in ('MASUK','KELUAR')),
  unit_id      text not null default 'TRK',
  barang_id    text not null references public.items(id) on delete cascade on update cascade,
  nama_barang  text not null,
  satuan       text not null default 'PCS',
  jumlah       integer not null check (jumlah > 0),
  petugas      text,
  keperluan    text,
  keterangan   text,
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now()
);

-- ---------- MIGRASI DARI SKEMA LAMA (aman dijalankan ulang) ----------
alter table public.items add column if not exists updated_at timestamptz not null default now();
alter table public.transactions add column if not exists created_by uuid default auth.uid();
alter table public.transactions alter column tanggal set default now();
update public.items set unit_id = 'TRK' where unit_id is null;
alter table public.items alter column unit_id set default 'TRK';
alter table public.items alter column unit_id set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_barang_id_fkey') then
    alter table public.transactions
      add constraint transactions_barang_id_fkey foreign key (barang_id)
      references public.items(id) on delete cascade on update cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_jenis_check') then
    alter table public.transactions add constraint transactions_jenis_check check (jenis in ('MASUK','KELUAR'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_jumlah_check') then
    alter table public.transactions add constraint transactions_jumlah_check check (jumlah > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'items_stok_awal_check') then
    alter table public.items add constraint items_stok_awal_check check (stok_awal >= 0);
  end if;
end $$;

-- Hapus policy lama yang mengizinkan SIAPA PUN menulis/menghapus data
drop policy if exists "Allow public read on items" on public.items;
drop policy if exists "Allow public insert on items" on public.items;
drop policy if exists "Allow public update on items" on public.items;
drop policy if exists "Allow public delete on items" on public.items;
drop policy if exists "Allow public read on transactions" on public.transactions;
drop policy if exists "Allow public insert on transactions" on public.transactions;
drop policy if exists "Allow public update on transactions" on public.transactions;
drop policy if exists "Allow public delete on transactions" on public.transactions;

create index if not exists transactions_barang_idx on public.transactions (barang_id);
create index if not exists transactions_unit_tanggal_idx on public.transactions (unit_id, tanggal desc);

-- ---------- VALIDASI STOK DI SISI SERVER ----------
-- Mencegah stok minus walaupun dua admin menginput bersamaan.
create or replace function public.cek_stok_keluar()
returns trigger
language plpgsql
as $$
declare
  sisa integer;
begin
  if new.jenis = 'KELUAR' then
    -- kunci baris alat agar transaksi bersamaan diproses berurutan
    perform 1 from public.items where id = new.barang_id for update;
    select i.stok_awal
           + coalesce(sum(case when t.jenis = 'MASUK' then t.jumlah else 0 end), 0)
           - coalesce(sum(case when t.jenis = 'KELUAR' then t.jumlah else 0 end), 0)
      into sisa
      from public.items i
      left join public.transactions t on t.barang_id = i.id and t.id <> new.id
     where i.id = new.barang_id
     group by i.stok_awal;
    if sisa is null or new.jumlah > sisa then
      raise exception 'Stok tidak mencukupi. Sisa saat ini: %', coalesce(sisa, 0)
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cek_stok_keluar on public.transactions;
create trigger trg_cek_stok_keluar
  before insert or update on public.transactions
  for each row execute function public.cek_stok_keluar();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_items_updated_at on public.items;
create trigger trg_items_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- ---------- ROW LEVEL SECURITY ----------
alter table public.items enable row level security;
alter table public.transactions enable row level security;

-- Baca: semua pengunjung (mode lihat saja / read-only).
-- Jika data hanya boleh dilihat admin, ganti "to anon, authenticated using (true)"
-- menjadi "to authenticated using (public.is_admin())".
drop policy if exists "baca items" on public.items;
create policy "baca items" on public.items
  for select to anon, authenticated using (true);

drop policy if exists "baca transaksi" on public.transactions;
create policy "baca transaksi" on public.transactions
  for select to anon, authenticated using (true);

-- Tulis: hanya admin
drop policy if exists "admin kelola items" on public.items;
create policy "admin kelola items" on public.items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin kelola transaksi" on public.transactions;
create policy "admin kelola transaksi" on public.transactions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- IMPOR / PULIHKAN DATA (atomik, khusus admin) ----------
-- Dipakai fitur "Pulihkan (Restore)", "Reset ke Awal" dan "Unggah data lokal".
create or replace function public.import_data(
  p_items jsonb,
  p_transactions jsonb,
  p_replace boolean default false
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat mengimpor data' using errcode = '42501';
  end if;

  if p_replace then
    delete from public.transactions where true;
    delete from public.items where true;
  end if;

  insert into public.items (id, unit_id, nama, satuan, stok_awal, min_stok, kategori, lokasi, keterangan, created_at)
  select x.id, coalesce(x.unit_id, 'TRK'), upper(x.nama), coalesce(x.satuan, 'PCS'),
         coalesce(x.stok_awal, 0), coalesce(x.min_stok, 2), x.kategori,
         coalesce(x.lokasi, 'Lemari K3'), x.keterangan, coalesce(x.created_at, now())
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as x(
      id text, unit_id text, nama text, satuan text, stok_awal int, min_stok int,
      kategori text, lokasi text, keterangan text, created_at timestamptz)
  on conflict (id) do update set
    unit_id = excluded.unit_id, nama = excluded.nama, satuan = excluded.satuan,
    stok_awal = excluded.stok_awal, min_stok = excluded.min_stok, kategori = excluded.kategori,
    lokasi = excluded.lokasi, keterangan = excluded.keterangan;

  -- Urutkan kronologis (MASUK lebih dulu) agar validasi stok tidak menolak data lama
  insert into public.transactions (id, tanggal, jenis, unit_id, barang_id, nama_barang, satuan, jumlah, petugas, keperluan, keterangan)
  select x.id, coalesce(x.tanggal, now()), x.jenis, coalesce(x.unit_id, 'TRK'), x.barang_id,
         x.nama_barang, coalesce(x.satuan, 'PCS'), x.jumlah, x.petugas, x.keperluan, x.keterangan
    from jsonb_to_recordset(coalesce(p_transactions, '[]'::jsonb)) as x(
      id text, tanggal timestamptz, jenis text, unit_id text, barang_id text, nama_barang text,
      satuan text, jumlah int, petugas text, keperluan text, keterangan text)
   order by x.tanggal, case x.jenis when 'MASUK' then 0 else 1 end
  on conflict (id) do nothing;
end;
$$;

grant execute on function public.import_data(jsonb, jsonb, boolean) to authenticated;
revoke execute on function public.import_data(jsonb, jsonb, boolean) from anon, public;

-- ---------- DATA AWAL (6 alat K3 Cabang Tarakan) ----------
insert into public.items (id, unit_id, nama, satuan, stok_awal, min_stok, kategori, lokasi, keterangan) values
  ('K3-001','TRK','ROMPI','PCS',4,2,'APD','Lemari K3','Rompi keselamatan reflektif standar K3'),
  ('K3-002','TRK','KARUNG','PCS',2,2,'Perlengkapan Darurat','Lemari K3','Karung pengaman penahan debu/tanggul'),
  ('K3-003','TRK','HELM','PCS',5,2,'APD','Lemari K3','Helm keselamatan kerja (Safety Helmet)'),
  ('K3-004','TRK','MASKER GAS','PCS',1,1,'APD Khusus','Lemari K3','Masker respirator gas beracun/asap'),
  ('K3-005','TRK','KACAMATA SAFETY','PCS',3,2,'APD','Lemari K3','Kacamata pelindung mata (Safety Goggles)'),
  ('K3-006','TRK','SEPATU SAFETY','PCS',3,2,'APD','Lemari K3','Sepatu pelindung berujung baja')
on conflict (id) do nothing;

-- =========================================================================
-- MENDAFTARKAN ADMIN
-- 1. Buat user di: Authentication > Users > Add user (email + password,
--    centang "Auto Confirm User").
-- 2. Jalankan perintah di bawah (ganti email):
--
--    insert into public.admins (user_id)
--    select id from auth.users where email = 'admin@contoh.com'
--    on conflict do nothing;
--
-- 3. Matikan pendaftaran publik: Authentication > Sign In / Providers >
--    nonaktifkan "Allow new users to sign up".
-- =========================================================================
