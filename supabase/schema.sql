-- Run once in your Supabase project's SQL editor.
-- Every row belongs to its authenticated owner. Never disable RLS.
create table if not exists public.user_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.user_backups enable row level security;
revoke all on table public.user_backups from anon;
grant select, insert, update, delete on public.user_backups to authenticated;
create policy "Read own backup" on public.user_backups for select to authenticated using (auth.uid() = user_id);
create policy "Insert own backup" on public.user_backups for insert to authenticated with check (auth.uid() = user_id);
create policy "Update own backup" on public.user_backups for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Delete own backup" on public.user_backups for delete to authenticated using (auth.uid() = user_id);
