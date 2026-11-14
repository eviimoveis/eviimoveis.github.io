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

-- Bairros extras em que o corretor atua, além do 1º e do 2º (adicionado depois).
alter table public.corretores add column if not exists outros_bairros text[] not null default '{}';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'corretores_outros_bairros_limite') then
    alter table public.corretores add constraint corretores_outros_bairros_limite check (cardinality(outros_bairros) <= 100);
  end if;
end $$;

-- Especialidades do corretor (adicionado depois).
alter table public.corretores add column if not exists especialidades text[] not null default '{}';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'corretores_especialidades_limite') then
    alter table public.corretores add constraint corretores_especialidades_limite check (cardinality(especialidades) <= 20);
  end if;
end $$;

-- ---------- Imobiliárias (adicionado depois) ----------
-- A lista de imobiliárias sai do campo "Imobiliária" dos corretores; esta tabela guarda só
-- o que é completado à mão (contatos, tipos de imóvel, faixas, observações).
create table if not exists public.imobiliarias (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  nome text not null check (char_length(nome) between 2 and 120),
  apelidos text[] not null default '{}' check (cardinality(apelidos) <= 50),
  telefone text check (char_length(telefone) <= 30),
  email text check (char_length(email) <= 160),
  site text check (char_length(site) <= 200),
  contato text check (char_length(contato) <= 120),
  categoria text check (categoria in ('Residencial', 'Comercial', 'Ambos')),
  operacao text check (operacao in ('Locação', 'Venda', 'Ambos')),
  bairros text[] not null default '{}' check (cardinality(bairros) <= 50),
  tipos text[] not null default '{}' check (cardinality(tipos) <= 20),
  faixas_venda text[] not null default '{}' check (cardinality(faixas_venda) <= 10),
  faixas_locacao text[] not null default '{}' check (cardinality(faixas_locacao) <= 10),
  observacoes text check (char_length(observacoes) <= 2000)
);
alter table public.imobiliarias enable row level security;
grant select, insert, update, delete on public.imobiliarias to authenticated;
drop policy if exists "admin imobiliarias" on public.imobiliarias;
create policy "admin imobiliarias" on public.imobiliarias
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());

-- Imobiliárias da planilha que têm contato (as demais aparecem sozinhas pelos corretores).
insert into public.imobiliarias (id, nome, telefone, email, site, contato, operacao, bairros, observacoes) values ('aa4b8984-773b-52de-b8ec-a679c6011d52', 'Adbens', '11963173138', null, 'https://adbens.com.br/imobiliaria', 'Angelo e Moises', null, array['Itaim Bibi','Bela Vista','Jardins']::text[], 'Zona informada no cadastro antigo: ZO. Registrado. Região secundária antiga também incluía Moema.') on conflict (id) do nothing;
insert into public.imobiliarias (id, nome, telefone, email, site, contato, operacao, bairros, observacoes) values ('e61e4fea-16b0-52e6-ac20-b3a0e9af8103', 'Adel Gestão (ADM)', '1130772277', 'gestaovendas@adel.com.br', null, null, 'Locação', '{}', 'Zona informada no cadastro antigo: ZO. Tem vários imóveis para eu somente locar.') on conflict (id) do nothing;
insert into public.imobiliarias (id, nome, telefone, email, site, contato, operacao, bairros, observacoes) values ('90a22c33-8143-5c99-8d1c-c1b47b92a510', 'Dinâmica', '11981559070', null, 'https://www.dinamicamontepio.com.br', 'Leandro', null, array['Tucuruvi','Santana']::text[], 'Zona informada no cadastro antigo: ZL.') on conflict (id) do nothing;

-- ===================== Anúncios (página pública por imóvel) =====================
create table if not exists public.anuncios (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  status text not null default 'Ativo' check (status in ('Ativo', 'Pausado')),
  expira_em date not null,
  -- conteúdo público
  titulo text not null check (char_length(titulo) between 3 and 160),
  operacao text not null default 'Locação' check (operacao in ('Locação', 'Venda')),
  tipo text check (char_length(tipo) <= 60),
  bairro text check (char_length(bairro) <= 80),
  cidade text check (char_length(cidade) <= 80),
  localizacao text check (char_length(localizacao) <= 300),
  valor numeric check (valor >= 0),
  condominio numeric check (condominio >= 0),
  iptu numeric check (iptu >= 0),
  outros_custos numeric check (outros_custos >= 0),
  area numeric check (area >= 0),
  dormitorios smallint check (dormitorios between 0 and 50),
  suites smallint check (suites between 0 and 50),
  banheiros smallint check (banheiros between 0 and 50),
  vagas smallint check (vagas between 0 and 50),
  descricao text check (char_length(descricao) <= 6000),
  destaques text[] not null default '{}' check (cardinality(destaques) <= 30),
  fotos jsonb not null default '[]' check (jsonb_typeof(fotos) = 'array' and jsonb_array_length(fotos) <= 60),
  whatsapp text check (char_length(whatsapp) <= 20),
  -- só para o painel (nunca vai para a página pública)
  link_origem text check (char_length(link_origem) <= 1000),
  observacao_interna text check (char_length(observacao_interna) <= 2000)
);
alter table public.anuncios enable row level security;
grant select, insert, update, delete on public.anuncios to authenticated;
drop policy if exists "admin anuncios" on public.anuncios;
create policy "admin anuncios" on public.anuncios
  for all to authenticated using (public.is_crm_admin()) with check (public.is_crm_admin());

-- Página pública: lê UM anúncio pelo id, só com os campos públicos.
-- Vencido ou pausado devolve só {"disponivel": false}. Visitante não lista nem lê a tabela.
create or replace function public.anuncio_publico(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select case
    when a.id is null then null
    when a.status <> 'Ativo' or a.expira_em < (now() at time zone 'America/Sao_Paulo')::date
      then jsonb_build_object('disponivel', false)
    else jsonb_build_object(
      'disponivel', true, 'titulo', a.titulo, 'operacao', a.operacao, 'tipo', a.tipo,
      'bairro', a.bairro, 'cidade', a.cidade, 'localizacao', a.localizacao,
      'valor', a.valor, 'condominio', a.condominio, 'iptu', a.iptu, 'outros_custos', a.outros_custos,
      'area', a.area, 'dormitorios', a.dormitorios, 'suites', a.suites, 'banheiros', a.banheiros,
      'vagas', a.vagas, 'descricao', a.descricao, 'destaques', a.destaques, 'fotos', a.fotos,
      'whatsapp', a.whatsapp, 'expira_em', a.expira_em)
  end
  from (select 1) x left join public.anuncios a on a.id = p_id
$$;
revoke all on function public.anuncio_publico(uuid) from public;
grant execute on function public.anuncio_publico(uuid) to anon, authenticated;

-- ---------- Fotos: bucket público para leitura, envio só pelo painel ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anuncios', 'anuncios', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "anuncios fotos enviar" on storage.objects;
create policy "anuncios fotos enviar" on storage.objects
  for insert to authenticated with check (bucket_id = 'anuncios' and public.is_crm_admin());
drop policy if exists "anuncios fotos alterar" on storage.objects;
create policy "anuncios fotos alterar" on storage.objects
  for update to authenticated using (bucket_id = 'anuncios' and public.is_crm_admin());
drop policy if exists "anuncios fotos apagar" on storage.objects;
create policy "anuncios fotos apagar" on storage.objects
  for delete to authenticated using (bucket_id = 'anuncios' and public.is_crm_admin());

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
      (now(), '2026-11-11', 'Anúncio', 'Anúncios publicados (planilha)', 7, 140, 'importado'),
      (now(), '2026-11-12', 'Corretor', 'Corretores no painel além da planilha (46 - 42)', 4, 20, 'importado');
    insert into public.digo_pagamentos (criado_em, data, valor, observacao, autor) values
      ('2026-11-03 18:00-03', '2026-11-03', 75, '15 corretores antes de 03/11 (planilha)', 'importado');
  end if;
end $$;
