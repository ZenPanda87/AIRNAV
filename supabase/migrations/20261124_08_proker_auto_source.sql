-- Migrasi 08: hubungkan tiap kegiatan program kerja ke menu sumber realisasinya (dihitung langsung di aplikasi).
-- Kode: APAR, P3K, PATROL, JSAWP, SAG, EFFORT, OVERSIGHT, SEC:<jenis>, ACT:<domain>:<jenis kegiatan>
alter table public.work_programs add column if not exists auto_source text[] not null default '{}';

update public.work_programs w set auto_source = m.src from (values
 ('APAR Cek Rutin', '{APAR}'::text[]),
 ('Pelatihan P3K & APAR', '{"ACT:K3:Pelatihan P3K & APAR","ACT:K3:Simulasi APAR"}'),
 ('Rapat Triwulan Tim K3', '{"ACT:K3:Rapat Tim K3 / P2K3"}'),
 ('Emergency Drill/Table Top', '{"ACT:K3:Simulasi ERP","ACT:K3:Simulasi gempa / evakuasi","ACT:K3:Emergency drill / table top"}'),
 ('Tinjauan Manajemen', '{"ACT:K3:Tinjauan Manajemen"}'),
 ('Safety Patrol rutin', '{PATROL}'),
 ('Duty Safety Training (DST)', '{"SEC:DST","ACT:KEAMANAN:DST (Duty Security Training)"}'),
 ('Audit Keamanan Internal', '{SEC:AUDIT}'),
 ('Inspeksi Keamanan Internal', '{SEC:INSPEKSI}'),
 ('Test Keamanan Internal', '{SEC:TEST}'),
 ('Review ANSSP dan SOP Keamanan', '{"ACT:KEAMANAN:Review ANSSP & SOP"}'),
 ('Sosialisasi Dokumen ANSSP dan SOP Keamanan', '{"ACT:KEAMANAN:Sosialisasi ANSSP & SOP"}'),
 ('Safety Action Group (SAG)', '{SAG}'),
 ('Evaluasi & Analisa EFFORT rutin', '{EFFORT}'),
 ('Inspeksi & Monitoring ke Unit', '{"ACT:PENGAWASAN:Inspeksi & monitoring ke unit"}'),
 ('Safety Campaign', '{"ACT:KESELAMATAN:Safety campaign"}'),
 ('Audit, Monitoring dan Inspeksi', '{OVERSIGHT}')
) as m(act, src)
where w.unit_id = 'TRK' and w.year = 2026 and w.activity = m.act;

update public.work_programs set realization = '{}'::jsonb
 where unit_id = 'TRK' and year = 2026
   and ((activity = 'APAR Cek Rutin' and realization = '{"11-4": true}'::jsonb)
     or (activity = 'Audit, Monitoring dan Inspeksi' and realization = '{"9-4": true}'::jsonb));
