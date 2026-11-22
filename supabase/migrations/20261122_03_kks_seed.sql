-- =========================================================================
-- Sistem Informasi KKS Terpadu AIRNAV — Migrasi 03: data awal (dari 05_BASIS_PENGETAHUAN_KKS.md)
-- Hanya diisi bila tabel masih kosong untuk lokasi tsb (aman dijalankan ulang).
-- =========================================================================

-- APAR Cabang Tarakan (TW IV 2025: CF-500 ABC 5 kg, Chozi, isi ulang 30-12-2025)
insert into public.apar (unit_id, code, building, location, room_size, type, brand, capacity_kg, last_refill, valid_months)
select 'TRK', v.code, v.b, v.loc, v.sz, 'ABC Powder (CF-500)', 'Chozi', 5, date '2025-12-30', 12
from (values
 ('APAR 001','Gedung ADM/APP','Lt.1 – Lobby Kanan (R.GM, R.Manager, R.Adm Keuangan)','10,8 × 5,2'),
 ('APAR 002','Gedung ADM/APP','Lt.2 – Lobby Kiri (R.Kontrol APP, R.Rapat)','10,8 × 5,2'),
 ('APAR 003','Gedung ADM/APP','Lt.3 – Lobby Kiri (R.Standby Teknisi, R.Automasi)','6,8 × 5,2'),
 ('APAR 004','Gedung Tower','Lt.1 – Depan Lift','2,3 × 4,5'),
 ('APAR 005','Gedung Tower','Lt.2 – Ruang Server CCTV','5,6 × 5,6'),
 ('APAR 006','Gedung Tower','Lt.3 – Ruang Baterai/UPS','5,6 × 5,6'),
 ('APAR 007','Gedung Tower','Lt.4 – Ruang Peralatan AMSC','5,6 × 5,6'),
 ('APAR 008','Gedung Tower','Lt.5 – Ruang Peralatan Radio VHF & Recorder','5,6 × 5,6'),
 ('APAR 009','Gedung Tower','Lt.6 – Depan Sangkar Lift','4,75 × 8,44'),
 ('APAR 010','Gedung Tower','Lt.7 – Cabin Tower (Ruang Kontrol TWR)','8,44 × 8,44'),
 ('APAR 011','Shelter','Gedung/Shelter Radar – Ruang Peralatan Radar','5 × 6,5'),
 ('APAR 012','Shelter','Gedung VHF-ER',null),
 ('APAR 013','Shelter','Gedung Localizer',null),
 ('APAR 014','Shelter','Gedung DVOR',null),
 ('APAR 015','Shelter','Gedung Glide Path',null)
) as v(code, b, loc, sz)
where not exists (select 1 from public.apar where unit_id = 'TRK')
on conflict do nothing;

insert into public.apar (unit_id, code, building, location, type, capacity_kg, note)
select 'MLN', v.code, 'Gedung Tower', v.loc, 'DCP Powder', 6, 'Data 2024 — perlu pembaruan tanggal isi ulang'
from (values ('APAR 001','Lt.1 – Briefing Office'),('APAR 002','Lt.2 – R. Kepala Capem'),('APAR 003','Lt.3'),
             ('APAR 004','Cabin Tower'),('APAR 005','Ruang Teknik')) as v(code, loc)
where not exists (select 1 from public.apar where unit_id = 'MLN')
on conflict do nothing;

insert into public.apar (unit_id, code, building, location, type, capacity_kg, last_refill, condition, note)
select 'NNX', v.code, v.b, v.loc, 'Gas Cair (CF-21)', 3, date '2020-01-31', 'PERLU TINDAKAN', 'Expired Jan 2021 — diperlukan pengisian'
from (values ('APAR 001','Gedung Tower','Gedung Tower'),('APAR 002','Shelter','Shelter DVOR')) as v(code, b, loc)
where not exists (select 1 from public.apar where unit_id = 'NNX')
on conflict do nothing;

-- Kotak P3K
insert into public.p3k_boxes (unit_id, code, location, type)
select 'TRK', v.code, v.loc, 'A' from (values
 ('P3K 01','G.OPS (ADM/APP) Lt.1'),('P3K 02','G.OPS (ADM/APP) Lt.2'),('P3K 03','G.OPS (ADM/APP) Lt.3'),
 ('P3K 04','G.Tower Lt.1'),('P3K 05','G.Tower Lt.2'),('P3K 06','G.Tower Lt.3'),
 ('P3K 07','G.Tower Lt.4'),('P3K 08','G.Tower Lt.5'),('P3K 09','G.Tower Lt.6')) as v(code, loc)
where not exists (select 1 from public.p3k_boxes where unit_id = 'TRK')
on conflict do nothing;
insert into public.p3k_boxes (unit_id, code, location, type, brand)
select 'MLN', v.code, v.loc, 'A', 'MC-11/AA' from (values
 ('P3K 01','Tower Lt.1'),('P3K 02','Tower Lt.2'),('P3K 03','Tower Lt.3'),('P3K 04','Cabin Tower'),('P3K 05','Ruang Teknik')) as v(code, loc)
where not exists (select 1 from public.p3k_boxes where unit_id = 'MLN')
on conflict do nothing;
insert into public.p3k_boxes (unit_id, code, location, type, brand)
select 'NNX', 'P3K 01', 'Gedung Tower', 'A', 'MC-11'
where not exists (select 1 from public.p3k_boxes where unit_id = 'NNX')
on conflict do nothing;

-- Area Cabang Tarakan
insert into public.areas (unit_id, building, floor, room, size_m, kind)
select 'TRK', v.b, v.f, v.r, v.sz, v.k from (values
 ('Gedung ADM/APP','Lt.1','Lobby (R.GM, R.Manager, R.Adm Keuangan, Ruang Rapat Sementara)','10,8 × 5,2','office'),
 ('Gedung ADM/APP','Lt.2','Ruang Kontrol APP, Ruang Rapat','10,8 × 5,2','ops'),
 ('Gedung ADM/APP','Lt.3','Ruang Teknik, R.Automasi, Ruang Alat VHF APP','6,8 × 5,2','ops'),
 ('Gedung Tower','Lt.1','Lobby, Ruang Rapat, Ruang GM, Administrasi/PUM, Managerial, Teknik, Server Teknik, ARO, Lounge, Gudang',null,'office'),
 ('Gedung Tower','Lt.2','Ruang Server CCTV','5,6 × 5,6','ops'),
 ('Gedung Tower','Lt.3','Ruang Baterai/UPS','5,6 × 5,6','ops'),
 ('Gedung Tower','Lt.4','Ruang Peralatan AMSC','5,6 × 5,6','ops'),
 ('Gedung Tower','Lt.5','Ruang Peralatan Radio VHF & Recorder','5,6 × 5,6','ops'),
 ('Gedung Tower','Lt.6','Rest Room / Depan Sangkar Lift','4,75 × 8,44','office'),
 ('Gedung Tower','Lt.7','Cabin Tower (Ruang Kontrol TWR)','8,44 × 8,44','ops'),
 ('Shelter','-','Gedung/Shelter Radar (MSSR)','5 × 6,5','shelter'),
 ('Shelter','-','Shelter VHF-ER',null,'shelter'),
 ('Shelter','-','Shelter Localizer (LOC)',null,'shelter'),
 ('Shelter','-','Shelter Glide Path (GP)',null,'shelter'),
 ('Shelter','-','Shelter DVOR/DME',null,'shelter'),
 ('Area luar','-','Area Parkir, Pos Security GT & GR, Warehouse, Genset, Kantin, TPS',null,'outdoor')
) as v(b, f, r, sz, k)
where not exists (select 1 from public.areas where unit_id = 'TRK');

-- Program kerja Unit KKS 2026 (TRK)
insert into public.work_programs (unit_id, year, field, activity, frequency, note)
select 'TRK', 2026, v.f, v.a, v.n, v.k from (values
 ('K3','Pemeriksaan APAR',12,'melibatkan Avsec'),('K3','Pelatihan P3K & APAR',1,'berbiaya'),('K3','Bulan K3',1,null),
 ('K3','Rapat Triwulan Tim K3',4,'berbiaya (konsumsi)'),('K3','Emergency Drill / Table Top',1,'berbiaya'),
 ('K3','Tinjauan Manajemen',1,null),('K3','Safety Patrol rutin',12,'bulanan'),
 ('Keamanan','Safety Patrol rutin',6,null),('Keamanan','Duty Security Training (DST)',1,'seluruh karyawan & OS kecuali Avsec'),
 ('Keamanan','Audit Keamanan Internal',1,'inspektur internal'),('Keamanan','Inspeksi Keamanan Internal',1,'inspektur internal'),
 ('Keamanan','Table Top Exercise Keamanan',1,null),('Keamanan','Test Keamanan Internal',6,'2 bulanan'),
 ('Keamanan','Review ANSSP & SOP Keamanan',1,null),('Keamanan','Sosialisasi ANSSP & SOP Keamanan',1,null),
 ('Keamanan','Rapat Runway Safety Team',1,null),('Keamanan','Rapat Komite Keamanan',1,null),
 ('Standardisasi','Safety Action Group (SAG)',4,null),('Standardisasi','Evaluasi & Analisa EFFORT rutin',12,'data bulan sebelumnya'),
 ('Standardisasi','Inspeksi & Monitoring ke Unit',4,'biaya SPPD'),('Standardisasi','Safety Campaign',2,null),
 ('Standardisasi','Penyusunan Program Kerja tahun berikut',1,null),('Standardisasi','Audit, Monitoring dan Inspeksi',6,'tentatif'),
 ('Standardisasi','Review/Updating dokumen MOS, SOP, LOCA dll',1,null)
) as v(f, a, n, k)
where not exists (select 1 from public.work_programs where unit_id = 'TRK' and year = 2026);

-- Program pengawasan keamanan 2026: testing 2-bulanan TRK & MLN
insert into public.sec_program_slots (unit_id, year, kind, month, week, title)
select u, 2026, 'TEST', m, 2, 'Pengujian/Testing Keamanan Penerbangan Internal'
from unnest(array['TRK','MLN']) as u, unnest(array[2,4,6,8,10,12]) as m
where not exists (select 1 from public.sec_program_slots where year = 2026);

-- Fasilitas keamanan
insert into public.sec_facilities (unit_id, kind, brand_type, qty, condition, location)
select * from (values ('TRK','HHMD','Garrett',2,'Baik','Pos Security'),('TRK','Mirror',null,1,'Baik','Pos Security'),
  ('MLN','HHMD','Garrett Superwand',1,'Baik (80%)','Gedung Tower'),('MLN','HT','Yaesu VX-6',1,'Baik','Gedung Tower'),
  ('MLN','Access Door','Solution X105',1,'Baik','Gedung Tower')) as v(a,b,c,d,e,f)
where not exists (select 1 from public.sec_facilities);

-- Audit Dirkampen Cabang Tarakan 22–25 Sep 2026 + temuannya
with ev as (
  insert into public.oversight_events (unit_id, organizer, kind, title, start_date, end_date, unit_list)
  select 'TRK','Dirkampen','Audit','Audit Keamanan Penerbangan Dirkampen Cabang Tarakan', date '2026-09-22', date '2026-09-25', '{TRK}'
  where not exists (select 1 from public.oversight_events where organizer = 'Dirkampen' and start_date = date '2026-09-22')
  returning id)
insert into public.findings (unit_id, event_id, source, field, year, pq_no, finding, status)
select 'TRK', ev.id, 'Dirkampen', 'KMP', 2026, v.pq, v.f, 'OPEN' from ev, (values
 ('LEG 1.065','DPRK – pengisian matriks penilaian risiko belum sesuai'),
 ('TRG 2.001','Jumlah personel Avsec belum memenuhi kebutuhan'),
 ('NFP 4.015','Pelaksanaan keamanan di Daerah Keamanan Terkendali'),
 ('NFP 4.020','Patroli Daerah Terbatas')) as v(pq, f);

-- Safety recommendation airprox PK-SNS & HIU06
insert into public.safety_recommendations (unit_id, period, event, event_date, category, ans_contribution, recommendation, status)
select 'TRK','TW IV 2025','PK-SNS & HIU06', date '2025-11-08','B', true, v.r, 'OPEN' from (values
 ('Lokasi geografis yang terpisah secara visual perlu diperhatikan dalam pemberian informasi lalu lintas'),
 ('Panduan separasi VFR di ruang udara kelas C'),
 ('Koreksi readback oleh ATC')) as v(r)
where not exists (select 1 from public.safety_recommendations where event = 'PK-SNS & HIU06');

-- Jumlah ideal APD untuk inventaris yang sudah ada (tidak mengubah stok)
update public.items set ideal_qty = v.q from (values ('ROMPI',15),('HELM',7),('MASKER GAS',4),('KACAMATA SAFETY',2),('SEPATU SAFETY',19)) as v(n, q)
 where public.items.unit_id = 'TRK' and upper(public.items.nama) = v.n and public.items.ideal_qty is null;
