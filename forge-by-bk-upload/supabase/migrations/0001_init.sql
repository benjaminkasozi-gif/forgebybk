-- FORGE schema. Each entity is a versioned JSON document owned by one user.
-- The client is offline-first: it writes locally, then upserts here; conflicts resolve last-write-wins on updated_at.

create table if not exists public.athlete_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists public.programs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create table if not exists public.workout_logs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index if not exists programs_user_updated on public.programs (user_id, updated_at);
create index if not exists workout_logs_user_updated on public.workout_logs (user_id, updated_at);
create index if not exists workout_logs_started on public.workout_logs (user_id, ((data ->> 'startedAt')));

alter table public.athlete_profiles enable row level security;
alter table public.programs enable row level security;
alter table public.workout_logs enable row level security;

do $$
declare t text;
begin
  foreach t in array array['athlete_profiles', 'programs', 'workout_logs'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;
