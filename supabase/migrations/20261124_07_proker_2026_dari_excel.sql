-- Migrasi 07: Program Kerja Unit KKS TRK 2026 diselaraskan dengan file resmi
-- Sumber: C:\Users\user\Documents\VS.K3AIRNAV\airnav2025\4. AIRNAV 2026\1. KKS 2026 PROGRAM KERJA\Program Kerja Unit KKS TRK 2026.xlsx
-- (sheet "Program 3", baris 9–30; minggu rencana dibaca dari warna sel, sel putih = tidak direncanakan; TTD MKKS 06-01-2026)
alter table public.work_programs add column if not exists sort int not null default 0;

create or replace function public.__plan(variadic k text[]) returns jsonb language sql immutable as $$
  select coalesce(jsonb_object_agg(x, true), '{}'::jsonb) from unnest(k) x $$;

delete from public.work_programs where unit_id = 'TRK' and year = 2026
  and plan = '{}'::jsonb and realization = '{}'::jsonb and created_by is null;

insert into public.work_programs (unit_id, year, sort, field, activity, frequency, plan, note) values
('TRK',2026, 1,'K3','APAR Cek Rutin',12, public.__plan('1-2','2-2','3-2','4-2','5-2','6-2','7-2','8-2','9-2','10-2','11-2','12-2'),'Melibatkan Avsec'),
('TRK',2026, 2,'K3','Pelatihan P3K & APAR',1, public.__plan('7-1','7-2'),null),
('TRK',2026, 3,'K3','Rapat Triwulan Tim K3',4, public.__plan('3-1','6-1','9-1','12-1'),null),
('TRK',2026, 4,'K3','Emergency Drill/Table Top',1, public.__plan('6-3','6-4'),null),
('TRK',2026, 5,'K3','Tinjauan Manajemen',1, public.__plan('12-2'),null),
('TRK',2026, 6,'Keamanan','Safety Patrol rutin',12, public.__plan('1-1','2-1','3-1','4-1','5-1','6-1','7-1','8-1','9-1','10-1','11-1','12-1'),'Kegiatan rutin bulanan'),
('TRK',2026, 7,'Keamanan','Duty Safety Training (DST)',1, public.__plan('10-4'),'Peserta seluruh karyawan & OS kecuali Avsec'),
('TRK',2026, 8,'Keamanan','Audit Keamanan Internal',1, public.__plan('9-4'),'Inspektur Keamanan Internal'),
('TRK',2026, 9,'Keamanan','Inspeksi Keamanan Internal',1, public.__plan('6-2'),'Inspektur Keamanan Internal'),
('TRK',2026,10,'Keamanan','Test Keamanan Internal',6, public.__plan('1-4','3-4','5-4','7-4','9-4','11-4'),'Inspektur Keamanan Internal'),
('TRK',2026,11,'Keamanan','Review ANSSP dan SOP Keamanan',1, public.__plan('1-3','1-4'),null),
('TRK',2026,12,'Keamanan','Sosialisasi Dokumen ANSSP dan SOP Keamanan',1, public.__plan('2-2','2-3'),null),
('TRK',2026,13,'Standardisasi','Safety Action Group (SAG)',4, public.__plan('3-3','6-3','9-3','12-3'),null),
('TRK',2026,14,'Standardisasi','Evaluasi & Analisa EFFORT rutin',12, public.__plan('1-1','2-1','3-1','4-1','5-1','6-1','7-1','8-1','9-1','10-1','11-1','12-1'),'Data bulan sebelumnya'),
('TRK',2026,15,'Standardisasi','Inspeksi & Monitoring ke Unit',4, public.__plan('2-3','5-3','9-2','12-3'),'Karimun/Purbalingga (sesuai Excel)'),
('TRK',2026,16,'Standardisasi','Safety Campaign',2, public.__plan('4-3','11-3'),null),
('TRK',2026,17,'Standardisasi','Penyusunan Program Kerja tahun berikutnya',1, public.__plan('1-1'),'Di Excel tertulis "Penyusunan Program Kerja 2025"'),
('TRK',2026,18,'Standardisasi','Audit, Monitoring dan Inspeksi',6, '{}'::jsonb,'Tentatif (6× kegiatan) — waktu mengikuti jadwal regulator'),
('TRK',2026,19,'Standardisasi','Review/Updating dokumen MOS, SOP, LOCA dll',1, public.__plan('6-1','6-2','6-3','6-4','7-1','7-2','7-3','7-4'),null);

drop function public.__plan(text[]);
