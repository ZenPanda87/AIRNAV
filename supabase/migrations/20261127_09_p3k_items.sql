-- Migrasi 09: daftar isi standar kotak P3K per lokasi (jumlah bisa disesuaikan, obat/item tambahan bisa ditambah)
create table if not exists public.p3k_items (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  sort int not null default 99, name text not null, std_qty numeric not null default 1, uom text,
  category text not null default 'Standar' check (category in ('Standar','Obat','Tambahan')),
  track_expiry boolean not null default false, active boolean not null default true, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now(),
  unique (unit_id, name));

alter table public.p3k_items enable row level security;
drop policy if exists kks_sel on public.p3k_items; drop policy if exists kks_ins on public.p3k_items;
drop policy if exists kks_upd on public.p3k_items; drop policy if exists kks_del on public.p3k_items;
create policy kks_sel on public.p3k_items for select to authenticated using (public.can('P3K','R',unit_id));
create policy kks_ins on public.p3k_items for insert to authenticated with check (public.can('P3K','C',unit_id));
create policy kks_upd on public.p3k_items for update to authenticated using (public.can('P3K','U',unit_id) or public.can('P3K','A',unit_id)) with check (public.can('P3K','U',unit_id) or public.can('P3K','A',unit_id));
create policy kks_del on public.p3k_items for delete to authenticated using (public.can('P3K','D',unit_id));
drop trigger if exists trg_updated_at on public.p3k_items;
create trigger trg_updated_at before update on public.p3k_items for each row execute function public.set_updated_at();
drop trigger if exists trg_log on public.p3k_items;
create trigger trg_log after insert or update or delete on public.p3k_items for each row execute function public.log_activity();
create index if not exists p3k_items_unit_idx on public.p3k_items (unit_id, sort);

insert into public.p3k_items (unit_id, sort, name, std_qty, uom, category)
select u.id, v.no, v.name, v.qty, v.uom, 'Standar'
from public.units u, (values
 (1,'Kasa steril terbungkus',20,'bungkus'),(2,'Perban (lebar 5 cm)',2,'gulung'),(3,'Perban (lebar 10 cm)',2,'gulung'),
 (4,'Plester (1,25 cm)',2,'gulung'),(5,'Plester cepat',10,'lembar'),(6,'Kapas (25 gram)',1,'bungkus'),
 (7,'Kain segitiga / mitela',2,'lembar'),(8,'Gunting',1,'buah'),(9,'Peniti',12,'buah'),(10,'Sarung tangan sekali pakai',2,'pasang'),
 (11,'Masker',1,'buah'),(12,'Pinset',1,'buah'),(13,'Lampu senter',1,'buah'),(14,'Gelas untuk cuci mata',1,'buah'),
 (15,'Kantong plastik bersih',1,'buah'),(16,'Aquades (100 ml lar. saline)',1,'botol'),(17,'Povidon iodin (60 ml)',1,'botol'),
 (18,'Alkohol 70%',1,'botol'),(19,'Buku panduan P3K di tempat kerja',1,'buah'),(20,'Buku catatan daftar isi kotak',1,'buah')
) as v(no, name, qty, uom)
on conflict (unit_id, name) do nothing;
update public.p3k_items set track_expiry = true where category = 'Standar' and name in ('Kasa steril terbungkus','Aquades (100 ml lar. saline)','Povidon iodin (60 ml)','Alkohol 70%');
