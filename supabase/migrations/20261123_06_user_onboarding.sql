-- Migrasi 06: status panduan (onboarding/product tour) per pengguna — tersinkron antar perangkat
create table if not exists public.user_onboarding (
  user_id    uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  seen       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_onboarding enable row level security;
drop policy if exists onboarding_own on public.user_onboarding;
create policy onboarding_own on public.user_onboarding for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
