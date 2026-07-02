create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb,
  weekly_plan jsonb,
  exercise_completion jsonb default '{}'::jsonb,
  exercise_selection jsonb default '{}'::jsonb,
  check_in jsonb default '{}'::jsonb,
  nutrition_plan jsonb,
  water_intake jsonb default '{}'::jsonb,
  protein_intake jsonb default '{}'::jsonb,
  weight_log jsonb default '[]'::jsonb,
  workout_logs jsonb default '{}'::jsonb,
  adapted_plan text default '',
  plan_profile_signature text default '',
  current_week integer default 1,
  updated_at timestamptz default now()
);

alter table public.user_app_state
add column if not exists nutrition_plan jsonb;

alter table public.user_app_state
add column if not exists water_intake jsonb default '{}'::jsonb;

alter table public.user_app_state
add column if not exists protein_intake jsonb default '{}'::jsonb;

alter table public.user_app_state
add column if not exists weight_log jsonb default '[]'::jsonb;

alter table public.user_app_state
add column if not exists workout_logs jsonb default '{}'::jsonb;

alter table public.user_app_state enable row level security;

drop policy if exists "Users can read own app state" on public.user_app_state;
create policy "Users can read own app state"
on public.user_app_state
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own app state" on public.user_app_state;
create policy "Users can insert own app state"
on public.user_app_state
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own app state" on public.user_app_state;
create policy "Users can update own app state"
on public.user_app_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
