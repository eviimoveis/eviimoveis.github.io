-- =====================================================================
-- CRM EVI Imóveis - estrutura do banco (Supabase)  ·  versão 2
-- Como usar: Supabase > SQL Editor > + (nova aba) > cole tudo > Run.
-- Pode rodar mais de uma vez sem problema.
-- =====================================================================

-- Só na primeira vez: remove as tabelas da versão 1 (que só tinham testes).
-- Depois da atualização este bloco não faz mais nada.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'leads' and column_name = 'interesse') then
    drop table if exists public.interacoes, public.tarefas, public.leads, public.corretores cascade;
  end if;
end $$;

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
  imobiliaria text check (char_length(imobiliaria) <= 120),
  site text check (char_length(site) <= 200),
  creci text check (char_length(creci) <= 40),
  categoria text not null default 'Ambos' check (categoria in ('Residencial', 'Comercial', 'Ambos')),
  operacao text not null default 'Ambos' check (operacao in ('Locação', 'Venda', 'Ambos')),
  faixas_locacao text[] not null default '{}',
  faixas_venda text[] not null default '{}',
  bairro1 text check (char_length(bairro1) <= 80),
  bairro2 text check (char_length(bairro2) <= 80),
  bairro3 text check (char_length(bairro3) <= 80),
  observacoes text check (char_length(observacoes) <= 2000),
  status text not null default 'Ativo' check (status in ('Ativo', 'Pausado', 'Inativo')),
  origem text not null default 'Formulário' check (char_length(origem) <= 60)
);

-- ---------- Leads (clientes) ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  nome text not null check (char_length(nome) between 2 and 120),
  telefone text not null check (char_length(telefone) between 8 and 20),
  operacao text not null default 'Locação' check (operacao in ('Locação', 'Compra', 'Compra ou locação')),
  valor_locacao numeric check (valor_locacao is null or valor_locacao >= 0),
  valor_compra numeric check (valor_compra is null or valor_compra >= 0),
  categoria text not null default 'Residencial' check (categoria in ('Residencial', 'Comercial')),
  tipo text check (char_length(tipo) <= 60),
  dormitorios text check (char_length(dormitorios) <= 20),
  metragem text check (char_length(metragem) <= 60),
  vagas text check (char_length(vagas) <= 20),
  atividade text check (char_length(atividade) <= 200),
  bairro1 text check (char_length(bairro1) <= 80),
  bairro2 text check (char_length(bairro2) <= 80),
  prazo text check (char_length(prazo) <= 60),
  essencial text check (char_length(essencial) <= 2000),
  diferencial text check (char_length(diferencial) <= 2000),
  origem text not null default 'Formulário' check (char_length(origem) <= 60),
  etapa text not null default 'Novo'
    check (etapa in ('Novo', 'Qualificado', 'Buscando imóveis', 'Visita', 'Proposta', 'Fechado', 'Pausado', 'Perdido')),
  observacao_interna text check (char_length(observacao_interna) <= 2000)
);

-- ---------- Envios (lead encaminhado a um corretor) ----------
create table if not exists public.envios (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  corretor_id uuid not null references public.corretores (id) on delete cascade,
  status text not null default 'Aguardando'
    check (status in ('Aguardando', 'Tem imóvel', 'Não tem imóvel', 'Sem resposta', 'Fechou')),
  retorno text check (char_length(retorno) <= 1000),
  proxima_cobranca date,
  cobrado_em date,
  observacoes text check (char_length(observacoes) <= 1000)
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

create index if not exists envios_lead_idx on public.envios (lead_id);
create index if not exists envios_corretor_idx on public.envios (corretor_id);
create index if not exists tarefas_lead_idx on public.tarefas (lead_id);
create index if not exists interacoes_lead_idx on public.interacoes (lead_id);

-- ---------- Segurança (RLS) ----------
alter table public.corretores enable row level security;
alter table public.leads enable row level security;
alter table public.envios enable row level security;
alter table public.tarefas enable row level security;
alter table public.interacoes enable row level security;

grant insert on public.corretores, public.leads to anon;
grant select, insert, update, delete
  on public.corretores, public.leads, public.envios, public.tarefas, public.interacoes to authenticated;

-- Visitante do link público: só pode ENVIAR um cadastro. Não lê, não altera, não apaga.
drop policy if exists "publico cadastra corretor" on public.corretores;
create policy "publico cadastra corretor" on public.corretores
  for insert to anon, authenticated
  with check (status = 'Ativo' and bairro3 is null);

drop policy if exists "publico cadastra lead" on public.leads;
create policy "publico cadastra lead" on public.leads
  for insert to anon, authenticated
  with check (etapa = 'Novo' and observacao_interna is null);

-- Painel: só quem está na tabela crm_admins vê e altera tudo.
drop policy if exists "admin corretores" on public.corretores;
create policy "admin corretores" on public.corretores
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());

drop policy if exists "admin leads" on public.leads;
create policy "admin leads" on public.leads
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());

drop policy if exists "admin envios" on public.envios;
create policy "admin envios" on public.envios
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());

drop policy if exists "admin tarefas" on public.tarefas;
create policy "admin tarefas" on public.tarefas
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());

drop policy if exists "admin interacoes" on public.interacoes;
create policy "admin interacoes" on public.interacoes
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());

-- =====================================================================
-- Para autorizar alguém no painel: crie o usuário em Authentication > Users
-- e rode (trocando o e-mail):
--
--   insert into public.crm_admins (user_id)
--   select id from auth.users where email = 'pessoa@exemplo.com'
--   on conflict do nothing;
-- =====================================================================

-- =====================================================================
-- Pagamentos Digo  ·  versão 3  (pode rodar mais de uma vez)
-- =====================================================================
alter table public.leads add column if not exists captado_digo boolean not null default false;
alter table public.leads add column if not exists captado_digo_em timestamptz;

-- Marco da contagem automática: só corretores cadastrados DEPOIS disto contam.
create table if not exists public.digo_config (
  id int primary key default 1 check (id = 1),
  criado_em timestamptz not null default now()
);

create table if not exists public.digo_lancamentos (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  data date not null default current_date,
  tipo text not null check (tipo in ('Corretor', 'Anúncio', 'Cliente', 'Visita', 'Comissão', 'Ajuste')),
  descricao text check (char_length(descricao) <= 300),
  qtd int not null default 1,
  valor numeric not null,
  autor text check (char_length(autor) <= 160)
);

create table if not exists public.digo_pagamentos (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  data date not null default current_date,
  valor numeric not null check (valor > 0),
  observacao text check (char_length(observacao) <= 300),
  autor text check (char_length(autor) <= 160)
);

alter table public.digo_config enable row level security;
alter table public.digo_lancamentos enable row level security;
alter table public.digo_pagamentos enable row level security;
grant select, insert, update, delete on public.digo_config, public.digo_lancamentos, public.digo_pagamentos to authenticated;

drop policy if exists "admin digo_config" on public.digo_config;
create policy "admin digo_config" on public.digo_config
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());
drop policy if exists "admin digo_lancamentos" on public.digo_lancamentos;
create policy "admin digo_lancamentos" on public.digo_lancamentos
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());
drop policy if exists "admin digo_pagamentos" on public.digo_pagamentos;
create policy "admin digo_pagamentos" on public.digo_pagamentos
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());

-- O cadastro público não pode marcar "Captado pelo Digo".
drop policy if exists "publico cadastra lead" on public.leads;
create policy "publico cadastra lead" on public.leads
  for insert to anon, authenticated
  with check (etapa = 'Novo' and observacao_interna is null and captado_digo = false);

-- Histórico da planilha (entra uma vez só, junto com o marco da contagem)
do $$
begin
  if not exists (select 1 from public.digo_config) then
    insert into public.digo_config (id) values (1);
    insert into public.digo_lancamentos (criado_em, data, tipo, descricao, qtd, valor, autor) values
      ('2026-11-02 12:00-03', '2026-11-02', 'Corretor', 'Corretores captados antes de 03/11 (planilha)', 15, 75, 'importado'),
      (now(), '2026-11-11', 'Corretor', 'Corretores novos de 03/11 a 11/11 (planilha)', 21, 105, 'importado'),
      (now(), '2026-11-11', 'Corretor', 'Corretores cadastrados direto pelo site (planilha)', 6, 30, 'importado'),
      (now(), '2026-11-11', 'Anúncio', 'Anúncios publicados (planilha)', 7, 140, 'importado');
    insert into public.digo_pagamentos (criado_em, data, valor, observacao, autor) values
      ('2026-11-03 18:00-03', '2026-11-03', 75, '15 corretores antes de 03/11 (planilha)', 'importado');
  end if;
end $$;
