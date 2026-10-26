-- SPEVION: tabela para guardar o plano de cada pessoa na própria conta.
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
create table if not exists public.planos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dados jsonb not null check (octet_length(dados::text) < 20000),
  atualizado_em timestamptz not null default now()
);

alter table public.planos enable row level security;

create policy "ler o proprio plano" on public.planos
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "criar o proprio plano" on public.planos
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "atualizar o proprio plano" on public.planos
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "apagar o proprio plano" on public.planos
  for delete to authenticated using ((select auth.uid()) = user_id);
