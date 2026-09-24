create table if not exists public.packwell_state (
  id int primary key,
  data jsonb not null
);

alter table public.packwell_state enable row level security;

drop policy if exists "office app can manage inventory" on public.packwell_state;
create policy "office app can manage inventory"
  on public.packwell_state
  for all
  to anon, authenticated
  using (true)
  with check (true);
