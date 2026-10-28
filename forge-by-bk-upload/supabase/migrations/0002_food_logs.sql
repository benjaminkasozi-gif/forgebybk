-- Food diary entries (one row per logged food), same document shape as the other tables.
create table if not exists public.food_logs (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index if not exists food_logs_user_updated on public.food_logs (user_id, updated_at);
create index if not exists food_logs_day on public.food_logs (user_id, ((data ->> 'date')));

alter table public.food_logs enable row level security;

drop policy if exists "own rows" on public.food_logs;
create policy "own rows" on public.food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
