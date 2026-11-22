-- =========================================================================
-- Sistem Informasi KKS Terpadu AIRNAV — Migrasi 02: tabel modul + RLS
-- Semua tabel modul punya: id uuid, unit_id (8 lokasi), created_at/by, updated_at.
-- RLS seragam lewat public.can(<modul>, C/R/U/D/A, unit_id).
-- =========================================================================

-- ---------- Fungsi kategori risiko ----------
create or replace function public.k3_level(v int) returns text language sql immutable as $$
  select case when v is null then null when v <= 4 then 'LOW' when v <= 8 then 'MEDIUM'
              when v <= 12 then 'HIGH' else 'EXTREME' end;   -- RFN 15 = EXTREME (keputusan Q1)
$$;
create or replace function public.icao_tol(p int, s text) returns text language sql immutable as $$
  select case when p is null or s is null then null
              when (p::text || upper(s)) in ('5A','5B','5C','4A','4B','3A') then 'INTOLERABLE'
              when (p::text || upper(s)) in ('5D','5E','4C','4D','4E','3B','3C','3D','2A','2B','2C','1A') then 'TOLERABLE'
              else 'ACCEPTABLE' end;
$$;
create or replace function public.sec_level(v int) returns text language sql immutable as $$
  select case when v is null then null when v >= 26 then 'TINGGI' when v >= 20 then 'MENENGAH-TINGGI'
              when v >= 14 then 'MENENGAH' when v >= 8 then 'MENENGAH-RENDAH' else 'RENDAH' end;
$$;
create or replace function public.sec_accept(v int) returns text language sql immutable as $$
  select case when v is null then null when v >= 20 then 'TIDAK DAPAT DITOLERANSI'
              when v >= 14 then 'ALARP' else 'DAPAT DITOLERANSI' end;
$$;

-- ---------- MASTER ----------
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  building text not null, floor text, room text, size_m text, kind text default 'office',
  active boolean not null default true, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.personnel (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  full_name text not null, position_title text, employment text default 'Organik', functional_role text,
  avsec boolean not null default false, inspector boolean not null default false, active boolean not null default true, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  personnel_id uuid not null references public.personnel(id) on delete cascade,
  type text not null default 'K3', name text not null, number text, issuer text,
  valid_from date, valid_until date, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

-- ---------- K3 ----------
create table if not exists public.apar (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  code text not null, building text, location text not null, room_size text, type text default 'ABC Powder',
  brand text, capacity_kg numeric, qty int not null default 1, ideal_qty int not null default 1,
  last_refill date, valid_months int not null default 12, price_estimate numeric,
  condition text not null default 'BAIK', mitigation text, active boolean not null default true, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now(),
  unique (unit_id, code));

create table if not exists public.apar_inspections (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  apar_id uuid not null references public.apar(id) on delete cascade, date date not null default current_date,
  hose boolean not null default true, pressure boolean not null default true, body boolean not null default true,
  pin_seal boolean not null default true, handle boolean not null default true, unobstructed boolean not null default true,
  result text generated always as (case when hose and pressure and body and pin_seal and handle and unobstructed
                                   then 'BAIK' else 'PERLU TINDAKAN' end) stored,
  period text generated always as (extract(year from date)::int::text || '-' || lpad(extract(month from date)::int::text, 2, '0')) stored,
  inspector text, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());
create index if not exists apar_insp_idx on public.apar_inspections (apar_id, date desc);

create table if not exists public.apar_services (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  apar_id uuid not null references public.apar(id) on delete cascade,
  kind text not null default 'REFILL' check (kind in ('REFILL','GANTI','BARU','PERBAIKAN')),
  date date not null default current_date, vendor text, cost numeric, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create or replace function public.apar_after_service() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind in ('REFILL','GANTI','BARU') then
    update public.apar set last_refill = new.date, condition = 'BAIK' where id = new.apar_id;
  end if;
  return null;
end $$;
drop trigger if exists trg_apar_service on public.apar_services;
create trigger trg_apar_service after insert on public.apar_services for each row execute function public.apar_after_service();

create or replace function public.apar_after_inspection() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.apar set condition = case when new.result = 'BAIK' then 'BAIK' else 'PERLU TINDAKAN' end
   where id = new.apar_id
     and not exists (select 1 from public.apar_inspections i where i.apar_id = new.apar_id and i.date > new.date);
  return null;
end $$;
drop trigger if exists trg_apar_insp on public.apar_inspections;
create trigger trg_apar_insp after insert or update on public.apar_inspections for each row execute function public.apar_after_inspection();

create table if not exists public.p3k_boxes (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  code text not null, location text not null, type text not null default 'A', brand text,
  extra_items jsonb not null default '[]', active boolean not null default true, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now(),
  unique (unit_id, code));

create table if not exists public.p3k_checks (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  box_id uuid not null references public.p3k_boxes(id) on delete cascade, period text not null,
  date date not null default current_date, lines jsonb not null default '[]',
  complete_count int, total_count int, checked_by text, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now(),
  unique (box_id, period));

create table if not exists public.patrol_schedules (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  date date not null, coordinator text, members text,
  areas text[] not null default '{"G. ADM","G. TWR","VHF-ER","LOC","GP","VOR","RDR"}',
  status text not null default 'RENCANA' check (status in ('RENCANA','SELESAI','BATAL')), note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.patrol_results (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  schedule_id uuid not null references public.patrol_schedules(id) on delete cascade, area text not null,
  scores jsonb not null default '{}', notes jsonb not null default '{}',
  total int, max_score int, pct numeric, inspector text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now(),
  unique (schedule_id, area));

create table if not exists public.work_permits (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  number text, date date not null default current_date, title text not null,
  work_types text[] not null default '{}', location text, scope text,
  executor_type text default 'Vendor', vendor text, pic text, members text, tools text,
  hazards text[] not null default '{}', isolations text[] not null default '{}',
  ppe text[] not null default '{}', safeguards text[] not null default '{}',
  start_at timestamptz, end_at timestamptz, ext1_until timestamptz, ext2_until timestamptz,
  jsa_steps jsonb not null default '[]',
  status text not null default 'DRAFT' check (status in ('DRAFT','DIAJUKAN','DIPERIKSA','BERLAKU','DITOLAK','SELESAI')),
  reject_reason text, user_checked_by text, user_checked_at timestamptz,
  hse_approved_by text, hse_approved_at timestamptz, closed_at timestamptz, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.env_measurements (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  date date not null default current_date, area text not null,
  noise_low numeric, noise_high numeric, temp_c numeric, workload text default 'Ringan', work_regime text default '75-100%',
  lux numeric, lux_std numeric default 300, result text, recorded_by text, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.hiradc (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  date date default current_date, area text not null, proposed_by text, activity text not null, hazard text not null,
  she text default 'S', potential text, legal_ref text, condition text default 'R',
  l int check (l between 1 and 5), s int check (s between 1 and 5),
  rfn int generated always as (l * s) stored, level text generated always as (public.k3_level(l * s)) stored,
  ecm text, mitigation text, rl int check (rl between 1 and 5), rs int check (rs between 1 and 5),
  rrfn int generated always as (rl * rs) stored, rlevel text generated always as (public.k3_level(rl * rs)) stored,
  residual_control text, accepted boolean, finish_date date, reviewed_at date, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.smk3_evaluations (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  year int not null, quarter int not null check (quarter between 1 and 4),
  status text not null default 'DRAFT' check (status in ('DRAFT','DIAJUKAN','DISETUJUI')),
  lines jsonb not null default '[]', approved_by text, approved_at timestamptz, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now(),
  unique (unit_id, year, quarter));

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  domain text not null default 'K3' check (domain in ('K3','KESELAMATAN','KEAMANAN','PENGAWASAN')),
  kind text not null, title text not null, date date not null default current_date, end_date date,
  location text, participants text, number text, result text, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.rab (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  year int not null, title text not null, status text not null default 'DRAFT',
  lines jsonb not null default '[]', total numeric, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

-- ---------- PENGAWASAN ----------
create table if not exists public.oversight_events (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  organizer text not null, kind text not null default 'Audit', title text not null, number text,
  start_date date, end_date date, unit_list text[] not null default '{}', note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  event_id uuid references public.oversight_events(id) on delete set null,
  source text, field text, year int default extract(year from current_date)::int,
  pq_no text, regulation_ref text, protocol_item text, finding text not null, recommendation text,
  risk_index text, cap text, pic text, target_date date, target_date_new date,
  progress text, progress_pct int default 0, justification text,
  status text not null default 'OPEN' check (status in ('OPEN','IN PROGRESS','PROPOSED CLOSED','CLOSED')),
  regulator_status text, closed_at date, source_module text, source_id uuid, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());
create index if not exists findings_status_idx on public.findings (unit_id, status, target_date);

create table if not exists public.finding_updates (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  finding_id uuid not null references public.findings(id) on delete cascade,
  date date not null default current_date, kind text not null default 'PROGRES'
    check (kind in ('PROGRES','PERPANJANGAN','USUL CLOSE','CLOSE','CATATAN')),
  progress text, progress_pct int, new_target date, by_name text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create or replace function public.finding_after_update() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.findings f set
    progress = coalesce(new.progress, f.progress),
    progress_pct = coalesce(new.progress_pct, f.progress_pct),
    target_date_new = case when new.kind = 'PERPANJANGAN' and new.new_target is not null then new.new_target else f.target_date_new end,
    status = case new.kind when 'USUL CLOSE' then 'PROPOSED CLOSED' when 'CLOSE' then 'CLOSED'
                           else case when f.status = 'OPEN' then 'IN PROGRESS' else f.status end end,
    closed_at = case when new.kind = 'CLOSE' then new.date else f.closed_at end
  where f.id = new.finding_id;
  return null;
end $$;
drop trigger if exists trg_finding_update on public.finding_updates;
create trigger trg_finding_update after insert on public.finding_updates for each row execute function public.finding_after_update();

create table if not exists public.work_programs (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  year int not null, field text not null, activity text not null, frequency int default 1,
  plan jsonb not null default '{}', realization jsonb not null default '{}', note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

-- ---------- KESELAMATAN ----------
create table if not exists public.traffic_monthly (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  year int not null, month int not null check (month between 1 and 12),
  dom_dep int not null default 0, dom_arr int not null default 0, dom_ovf int not null default 0,
  int_dep int not null default 0, int_arr int not null default 0, int_ovf int not null default 0,
  local_cnt int not null default 0,
  total int generated always as (dom_dep + dom_arr + dom_ovf + int_dep + int_arr + int_ovf) stored,
  aggregate int, source text default 'MANUAL', note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now(),
  unique (unit_id, year, month));

create table if not exists public.occurrences (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  occurred_at timestamptz not null, branch text, ats_unit text, category text, classification text, category2 text,
  ssr text, aircraft_id text, reg text, ac_type text, pic_name text, operator text, frules text, fphase text,
  adep text, ades text, typef text, dta text, itp text, add_info text, weather text, flight text, description text,
  ans_contribution boolean not null default false,
  kpi_category text check (kpi_category in ('AIRPROX','COORD','RBHB','FAC')),
  source text not null default 'MANUAL', effort_key text unique, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());
create index if not exists occ_unit_date_idx on public.occurrences (unit_id, occurred_at);

create table if not exists public.availability_monthly (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  year int not null, month int not null check (month between 1 and 12),
  c numeric, n numeric, s numeric, a numeric, status_note text, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now(),
  unique (unit_id, year, month));

create table if not exists public.hazards (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  code text, found_at date default current_date, location text,
  verification text default 'Unverified', state text not null default 'OPEN' check (state in ('OPEN','CLOSED')),
  description text not null, source text default 'Operasional', category text, subcategory text,
  consequence text, current_mitigation text,
  prob int check (prob between 1 and 5), sev text check (sev in ('A','B','C','D','E')),
  risk_index text generated always as (prob::text || sev) stored,
  tolerability text generated always as (public.icao_tol(prob, sev)) stored,
  barrier_prev text, barrier_prot text,
  rprob int check (rprob between 1 and 5), rsev text check (rsev in ('A','B','C','D','E')),
  rrisk_index text generated always as (rprob::text || rsev) stored,
  rtolerability text generated always as (public.icao_tol(rprob, rsev)) stored,
  accountability text, recommendation text, last_update text, quarter text, target_date date, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.sag_meetings (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  number text, date date not null, year int, quarter int, place text, mode text default 'Hybrid',
  chair text default 'General Manager', participants text, srb_ref text, ba_number text,
  status text not null default 'RENCANA' check (status in ('RENCANA','SELESAI','DISETUJUI')), summary text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.sag_issues (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  meeting_id uuid not null references public.sag_meetings(id) on delete cascade,
  origin_issue_id uuid, hazard_id uuid references public.hazards(id) on delete set null,
  finding_id uuid references public.findings(id) on delete set null,
  issue text not null, mitigation text, pic text, target text,
  status text not null default 'DITINDAKLANJUTI' check (status in ('DITINDAKLANJUTI','TERPENUHI')), note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.safety_recommendations (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  period text, event text not null, event_date date, category text, ans_contribution boolean default false,
  recommendation text not null, follow_up text, target_date date, pic text,
  status text not null default 'OPEN' check (status in ('OPEN','IN PROGRESS','CLOSED')), note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.rsa_items (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  year int not null, pq text not null, component text, element text, indicator text,
  previous text, current_val text, how text, justification text, evidence_url text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

-- ---------- KEAMANAN ----------
create table if not exists public.sec_program_slots (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  year int not null, kind text not null check (kind in ('AUDIT','INSPEKSI','TEST','SURVEY','DST','TABLE TOP','AWARENESS')),
  month int not null check (month between 1 and 12), week int check (week between 1 and 4),
  title text, status text not null default 'RENCANA' check (status in ('RENCANA','TERLAKSANA','BATAL')), note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.sec_activities (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  slot_id uuid references public.sec_program_slots(id) on delete set null,
  kind text not null, date date not null default current_date, objects text, scenario text, method text,
  result text, findings_count int default 0, recommendation text, ba_number text, inspectors text, participants text, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create or replace function public.sec_activity_slot() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.slot_id is not null then update public.sec_program_slots set status = 'TERLAKSANA' where id = new.slot_id; end if;
  return null;
end $$;
drop trigger if exists trg_sec_activity_slot on public.sec_activities;
create trigger trg_sec_activity_slot after insert or update on public.sec_activities for each row execute function public.sec_activity_slot();

create table if not exists public.sec_logbook (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  post text not null default 'Gedung Tower', at timestamptz not null default now(), shift text,
  entry text not null, officer text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.prohibited_items (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  date date not null default current_date, time_in time, time_out time, person text not null, activity text,
  item_in text, qty_in int, item_out text, qty_out int, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.sec_facilities (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  kind text not null, brand_type text, serial text, year_acq int, qty int default 1,
  cert_from date, cert_until date, condition text default 'Baik', location text, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.hhmd_checks (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  facility_id uuid not null references public.sec_facilities(id) on delete cascade,
  date date not null default current_date, kind text not null default 'HARIAN', items jsonb not null default '{}',
  conclusion text, officer text, shift text, note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.sec_incidents (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  date date not null default current_date, location text, service text, kind text not null,
  chronology text, risk_code text, follow_up text, reporter text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

create table if not exists public.sec_risk_assessments (
  id uuid primary key default gen_random_uuid(), unit_id text not null references public.units(id),
  year int not null, code text, scenario_group text, scenario text not null, area text,
  current_measures text, vulnerability_now text,
  threat int check (threat between 1 and 10), vulnerability int check (vulnerability between 1 and 10),
  consequence int check (consequence between 1 and 10),
  total int generated always as (threat + vulnerability + consequence) stored,
  level text generated always as (public.sec_level(threat + vulnerability + consequence)) stored,
  acceptance text generated always as (public.sec_accept(threat + vulnerability + consequence)) stored,
  extra_measures text, owner text, review_date date, treatments jsonb not null default '[]', note text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(), updated_at timestamptz not null default now());

-- ---------- RLS, updated_at & log seragam ----------
do $$
declare r record;
begin
  for r in select * from (values
    ('areas','MASTER'),('personnel','PERSONEL'),('certificates','PERSONEL'),
    ('apar','APAR'),('apar_inspections','APAR'),('apar_services','APAR'),
    ('p3k_boxes','P3K'),('p3k_checks','P3K'),('patrol_schedules','PATROL'),('patrol_results','PATROL'),
    ('work_permits','JSAWP'),('env_measurements','LINGKUNGAN'),('hiradc','LINGKUNGAN'),('smk3_evaluations','SMK3'),
    ('activities','KEGIATAN'),('rab','SMK3'),
    ('oversight_events','TEMUAN'),('findings','TEMUAN'),('finding_updates','TEMUAN'),('work_programs','PROKER'),
    ('traffic_monthly','TRAFFIC'),('occurrences','OCCURRENCE'),('availability_monthly','AVAILABILITY'),
    ('hazards','HAZARD'),('sag_meetings','SAG'),('sag_issues','SAG'),('safety_recommendations','SAFREC'),('rsa_items','RSA'),
    ('sec_program_slots','SECPROG'),('sec_activities','SECPROG'),('sec_logbook','SECLOG'),('prohibited_items','SECLOG'),
    ('sec_facilities','SECFAC'),('hhmd_checks','SECFAC'),('sec_incidents','SECINC'),('sec_risk_assessments','SECRISK')
  ) as v(t, m) loop
    execute format('alter table public.%I enable row level security', r.t);
    execute format('drop policy if exists kks_sel on public.%I', r.t);
    execute format('drop policy if exists kks_ins on public.%I', r.t);
    execute format('drop policy if exists kks_upd on public.%I', r.t);
    execute format('drop policy if exists kks_del on public.%I', r.t);
    execute format('create policy kks_sel on public.%I for select to authenticated using (public.can(%L,''R'',unit_id))', r.t, r.m);
    execute format('create policy kks_ins on public.%I for insert to authenticated with check (public.can(%L,''C'',unit_id))', r.t, r.m);
    execute format('create policy kks_upd on public.%I for update to authenticated using (public.can(%L,''U'',unit_id) or public.can(%L,''A'',unit_id)) with check (public.can(%L,''U'',unit_id) or public.can(%L,''A'',unit_id))', r.t, r.m, r.m, r.m, r.m);
    execute format('create policy kks_del on public.%I for delete to authenticated using (public.can(%L,''D'',unit_id))', r.t, r.m);
    execute format('drop trigger if exists trg_updated_at on public.%I', r.t);
    execute format('create trigger trg_updated_at before update on public.%I for each row execute function public.set_updated_at()', r.t);
    execute format('drop trigger if exists trg_log on public.%I', r.t);
    execute format('create trigger trg_log after insert or update or delete on public.%I for each row execute function public.log_activity()', r.t);
    execute format('create index if not exists %I on public.%I (unit_id)', r.t || '_unit_idx', r.t);
  end loop;
end $$;

-- Log juga untuk inventaris lama
drop trigger if exists trg_log on public.items;
create trigger trg_log after insert or update or delete on public.items for each row execute function public.log_activity();
drop trigger if exists trg_log on public.transactions;
create trigger trg_log after insert or update or delete on public.transactions for each row execute function public.log_activity();
