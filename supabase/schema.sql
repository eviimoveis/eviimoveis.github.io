-- =====================================================================
-- CRM EVI Imóveis - estrutura do banco (Supabase)
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Pode rodar mais de uma vez sem problema.
-- =====================================================================

-- ---------- Quem pode entrar no painel ----------
create table if not exists public.crm_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.crm_admins enable row level security; -- sem políticas: ninguém lê pela internet

create or replace function public.is_crm_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.crm_admins where user_id = auth.uid()) $$;

revoke all on function public.is_crm_admin() from public;
grant execute on function public.is_crm_admin() to anon, authenticated;

-- ---------- Corretores parceiros ----------
create table if not exists public.corretores (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  nome text not null check (char_length(nome) between 2 and 120),
  telefone text not null check (char_length(telefone) between 8 and 20),
  email text check (char_length(email) <= 160),
  creci text check (char_length(creci) <= 40),
  imobiliaria text check (char_length(imobiliaria) <= 120),
  regioes text[] not null default '{}',
  tipos text[] not null default '{}',
  negocios text[] not null default '{}',
  observacoes text check (char_length(observacoes) <= 2000),
  ativo boolean not null default true
);

-- ---------- Leads (clientes) ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  nome text not null check (char_length(nome) between 2 and 120),
  telefone text not null check (char_length(telefone) between 8 and 20),
  email text check (char_length(email) <= 160),
  interesse text not null default 'compra' check (interesse in ('compra', 'aluguel')),
  tipo text check (char_length(tipo) <= 60),
  regiao text check (char_length(regiao) <= 60),
  bairros text check (char_length(bairros) <= 300),
  valor_max numeric check (valor_max is null or valor_max >= 0),
  observacoes text check (char_length(observacoes) <= 2000),
  origem text not null default 'Link de cadastro' check (char_length(origem) <= 60),
  etapa text not null default 'novo'
    check (etapa in ('novo', 'em_atendimento', 'visita', 'proposta', 'fechado', 'perdido')),
  corretor_id uuid references public.corretores (id) on delete set null
);

-- ---------- Follow-ups ----------
create table if not exists public.tarefas (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  descricao text not null check (char_length(descricao) between 1 and 500),
  vence_em date not null,
  concluida boolean not null default false
);

-- ---------- Histórico de interações ----------
create table if not exists public.interacoes (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 2000),
  autor text check (char_length(autor) <= 160)
);

create index if not exists leads_corretor_idx on public.leads (corretor_id);
create index if not exists tarefas_lead_idx on public.tarefas (lead_id);
create index if not exists interacoes_lead_idx on public.interacoes (lead_id);

-- ---------- Segurança (RLS) ----------
alter table public.corretores enable row level security;
alter table public.leads enable row level security;
alter table public.tarefas enable row level security;
alter table public.interacoes enable row level security;

grant insert on public.corretores, public.leads to anon;
grant select, insert, update, delete
  on public.corretores, public.leads, public.tarefas, public.interacoes to authenticated;

-- Visitante do link público: só pode ENVIAR um cadastro. Não lê, não altera, não apaga.
drop policy if exists "publico cadastra corretor" on public.corretores;
create policy "publico cadastra corretor" on public.corretores
  for insert to anon, authenticated
  with check (ativo = true);

drop policy if exists "publico cadastra lead" on public.leads;
create policy "publico cadastra lead" on public.leads
  for insert to anon, authenticated
  with check (etapa = 'novo' and corretor_id is null);

-- Painel: só quem está na tabela crm_admins vê e altera tudo.
drop policy if exists "admin corretores" on public.corretores;
create policy "admin corretores" on public.corretores
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());

drop policy if exists "admin leads" on public.leads;
create policy "admin leads" on public.leads
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());

drop policy if exists "admin tarefas" on public.tarefas;
create policy "admin tarefas" on public.tarefas
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());

drop policy if exists "admin interacoes" on public.interacoes;
create policy "admin interacoes" on public.interacoes
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());

-- =====================================================================
-- DEPOIS de criar os 2 usuários em Authentication > Users, rode SÓ isto
-- (troque pelos dois e-mails reais):
--
--   insert into public.crm_admins (user_id)
--   select id from auth.users
--   where email in ('voce@exemplo.com', 'socio@exemplo.com')
--   on conflict do nothing;
-- =====================================================================
