-- ============================================================
-- CRM EVI Imóveis - Notificações no celular (aba Tarefas)
-- Cole tudo no Supabase > SQL Editor > Run. Pode rodar mais de uma vez.
-- Avisos: resumo da manhã (8h), tarefa esquecida (2+ dias atrasada),
-- tarefa nova criada pela outra pessoa e tarefa com horário marcado.
-- ============================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Quem criou a tarefa (para não avisar a própria pessoa).
alter table public.tarefas add column if not exists criado_por uuid default auth.uid();

-- Chaves do envio (uma linha só). Ninguém lê pela internet.
create table if not exists public.push_config (
  id boolean primary key default true check (id),
  vapid_publica text not null,
  vapid_privada jsonb not null,
  segredo text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  funcao_url text not null,
  apikey text not null,
  criado_em timestamptz not null default now()
);
-- Aparelhos que ativaram as notificações.
create table if not exists public.push_inscricoes (
  endpoint text primary key check (char_length(endpoint) between 20 and 2000),
  user_id uuid not null,
  ativo boolean not null default true,
  ultimo_visto timestamptz not null default now(),
  criado_em timestamptz not null default now()
);
-- Avisos a entregar.
create table if not exists public.push_fila (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  titulo text not null,
  corpo text not null default '',
  tag text not null default 'crm',
  enviado boolean not null default false,
  criado_em timestamptz not null default now()
);
-- Controle para não repetir o mesmo aviso.
create table if not exists public.push_log (
  chave text primary key,
  criado_em timestamptz not null default now()
);
alter table public.push_config enable row level security;
alter table public.push_inscricoes enable row level security;
alter table public.push_fila enable row level security;
alter table public.push_log enable row level security;
revoke all on public.push_config, public.push_inscricoes, public.push_fila, public.push_log from anon, authenticated;

-- Só aceitamos endereços dos serviços oficiais de notificação (Google, Apple, Mozilla, Microsoft).
create or replace function public.push_host_ok(p_endpoint text)
returns boolean language sql immutable
as $$ select p_endpoint ~ '^https://(fcm\.googleapis\.com|[a-z0-9.-]+\.push\.apple\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com)/' $$;

create or replace function public.push_enfileirar(p_user uuid, p_titulo text, p_corpo text, p_tag text, p_chave text default null)
returns boolean language plpgsql security definer set search_path = public
as $$
declare v_n int;
begin
  if p_chave is not null then
    insert into push_log (chave) values (p_chave) on conflict do nothing;
    get diagnostics v_n = row_count;
    if v_n = 0 then return false; end if;
  end if;
  insert into push_fila (user_id, titulo, corpo, tag) values (p_user, left(p_titulo, 120), left(coalesce(p_corpo, ''), 300), left(p_tag, 60));
  return true;
end $$;

-- Monta os avisos do momento (horário de São Paulo).
create or replace function public.push_preparar(p_agora timestamptz default now())
returns int language plpgsql security definer set search_path = public
as $$
declare
  v_local timestamp := p_agora at time zone 'America/Sao_Paulo';
  v_hoje date := v_local::date;
  v_hora time := v_local::time;
  u record; t record;
  v_atras int; v_dia int; v_n int; v_desc text; v_desde date; v_total int := 0;
begin
  for u in select distinct user_id from push_inscricoes where ativo loop
    -- 1. Resumo da manhã
    if v_hora >= time '08:00' and v_hora < time '12:00' then
      select count(*) filter (where vence_em < v_hoje), count(*) filter (where vence_em = v_hoje)
        into v_atras, v_dia from tarefas where not concluida and vence_em <= v_hoje;
      if v_atras + v_dia > 0 and push_enfileirar(u.user_id, 'Bom dia! Suas tarefas',
           concat_ws(' e ',
             case when v_dia > 0 then v_dia || case when v_dia = 1 then ' tarefa para hoje' else ' tarefas para hoje' end end,
             case when v_atras > 0 then v_atras || case when v_atras = 1 then ' atrasada' else ' atrasadas' end end) || '.',
           'resumo', 'resumo:' || v_hoje || ':' || u.user_id) then
        v_total := v_total + 1;
      end if;
    end if;
    -- 2. Tarefa esquecida (2 dias ou mais de atraso), um lembrete por dia
    if v_hora >= time '14:00' and v_hora < time '20:00' then
      select count(*), min(vence_em) into v_n, v_desde from tarefas where not concluida and vence_em <= v_hoje - 2;
      if v_n > 0 then
        select descricao into v_desc from tarefas where not concluida and vence_em <= v_hoje - 2 order by vence_em, criado_em limit 1;
        if push_enfileirar(u.user_id,
             case when v_n = 1 then 'Tarefa esquecida' else v_n || ' tarefas esquecidas' end,
             '"' || left(v_desc, 80) || '" está atrasada há ' || (v_hoje - v_desde) || ' dias' ||
               case when v_n > 1 then ' (e mais ' || (v_n - 1) || ')' else '' end || '.',
             'esquecida', 'esquecida:' || v_hoje || ':' || u.user_id) then
          v_total := v_total + 1;
        end if;
      end if;
    end if;
    -- 4. Tarefa com horário marcado (avisa até 15 min antes)
    for t in select id, descricao, vence_em, hora from tarefas
              where not concluida and vence_em is not null and hora is not null
                and (vence_em + hora) >= v_local - interval '10 minutes'
                and (vence_em + hora) < v_local + interval '15 minutes' loop
      if push_enfileirar(u.user_id, 'Tarefa às ' || to_char(t.hora, 'HH24:MI'), left(t.descricao, 200),
           'hora-' || t.id, 'hora:' || t.id || ':' || t.vence_em || ':' || t.hora || ':' || u.user_id) then
        v_total := v_total + 1;
      end if;
    end loop;
  end loop;
  return v_total;
end $$;

-- Chama a função que entrega os avisos nos aparelhos.
create or replace function public.push_disparar()
returns void language plpgsql security definer set search_path = public
as $$
declare c push_config;
begin
  select * into c from push_config;
  if not found then return; end if;
  if not exists (select 1 from push_fila where not enviado) then return; end if;
  perform net.http_post(
    url := c.funcao_url,
    body := jsonb_build_object('segredo', c.segredo),
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', c.apikey, 'Authorization', 'Bearer ' || c.apikey));
exception when others then
  raise warning 'push_disparar: %', sqlerrm;
end $$;

-- Roda a cada 15 minutos.
create or replace function public.push_ciclo()
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform push_preparar();
  perform push_disparar();
  delete from push_fila where criado_em < now() - interval '3 days';
  delete from push_log where criado_em < now() - interval '30 days';
end $$;

-- 3. Tarefa nova: avisa quem não criou.
create or replace function public.tarefas_push_nova()
returns trigger language plpgsql security definer set search_path = public
as $$
declare u record;
begin
  begin
    if not coalesce(new.concluida, false) then
      for u in select distinct user_id from push_inscricoes where ativo and user_id is distinct from new.criado_por loop
        perform push_enfileirar(u.user_id, 'Nova tarefa',
          left(new.descricao, 200) || coalesce(' · ' || to_char(new.vence_em, 'DD/MM'), '') || coalesce(' às ' || to_char(new.hora, 'HH24:MI'), ''),
          'nova-' || new.id);
      end loop;
      perform push_disparar();
    end if;
  exception when others then
    raise warning 'tarefas_push_nova: %', sqlerrm; -- nunca impede de salvar a tarefa
  end;
  return new;
end $$;
drop trigger if exists tarefas_push_nova on public.tarefas;
create trigger tarefas_push_nova after insert on public.tarefas
  for each row execute function public.tarefas_push_nova();

-- ---------- Usadas pelo painel (só a equipe) ----------
create or replace function public.push_chave_publica()
returns text language plpgsql security definer set search_path = public
as $$
begin
  if not is_crm_admin() then raise exception 'sem permissão'; end if;
  return (select vapid_publica from push_config);
end $$;

create or replace function public.push_definir_chaves(p_publica text, p_privada jsonb, p_funcao_url text, p_apikey text)
returns text language plpgsql security definer set search_path = public
as $$
begin
  if not is_crm_admin() then raise exception 'sem permissão'; end if;
  if p_funcao_url !~ '^https://[a-z0-9]+\.supabase\.co/functions/v1/notificar$' then raise exception 'endereço inválido'; end if;
  if char_length(p_publica) not between 80 and 100 or p_privada->>'d' is null or char_length(p_apikey) not between 20 and 400 then raise exception 'chave inválida'; end if;
  insert into push_config (vapid_publica, vapid_privada, funcao_url, apikey)
    values (p_publica, p_privada, p_funcao_url, p_apikey) on conflict do nothing;
  return (select vapid_publica from push_config);
end $$;

create or replace function public.push_inscrever(p_endpoint text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not is_crm_admin() then raise exception 'sem permissão'; end if;
  if not push_host_ok(p_endpoint) then raise exception 'endereço de notificação não aceito'; end if;
  insert into push_inscricoes (endpoint, user_id) values (p_endpoint, auth.uid())
    on conflict (endpoint) do update set user_id = excluded.user_id, ativo = true;
end $$;

create or replace function public.push_desinscrever(p_endpoint text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not is_crm_admin() then raise exception 'sem permissão'; end if;
  delete from push_inscricoes where endpoint = p_endpoint;
end $$;

create or replace function public.push_teste()
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  if not is_crm_admin() then raise exception 'sem permissão'; end if;
  if not exists (select 1 from push_inscricoes where ativo and user_id = auth.uid()) then return false; end if;
  perform push_enfileirar(auth.uid(), 'Teste do CRM', 'As notificações estão funcionando neste aparelho. ✅', 'teste');
  perform push_disparar();
  return true;
end $$;

-- ---------- Usadas pela função de envio (precisa do segredo) ----------
create or replace function public.push_pendentes(p_segredo text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare c push_config; v_endpoints jsonb;
begin
  select * into c from push_config;
  if not found or p_segredo is null or p_segredo <> c.segredo then return null; end if;
  with alvo as (
    update push_fila set enviado = true where not enviado and criado_em > now() - interval '6 hours' returning user_id)
  select coalesce(jsonb_agg(i.endpoint), '[]'::jsonb) into v_endpoints
    from push_inscricoes i where i.ativo and i.user_id in (select user_id from alvo);
  return jsonb_build_object('publica', c.vapid_publica, 'privada', c.vapid_privada, 'endpoints', v_endpoints);
end $$;

create or replace function public.push_falhou(p_segredo text, p_endpoint text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from push_config where segredo = p_segredo) then
    update push_inscricoes set ativo = false where endpoint = p_endpoint;
  end if;
end $$;

-- ---------- Usada pelo aparelho ao receber o aviso (o endereço do aparelho é a senha) ----------
create or replace function public.push_buscar(p_endpoint text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_user uuid; v_visto timestamptz; v_itens jsonb; v_ate timestamptz;
begin
  select user_id, ultimo_visto into v_user, v_visto from push_inscricoes where endpoint = p_endpoint and ativo;
  if not found then return '[]'::jsonb; end if;
  select jsonb_agg(jsonb_build_object('titulo', titulo, 'corpo', corpo, 'tag', tag) order by id), max(criado_em)
    into v_itens, v_ate
    from push_fila where user_id = v_user and criado_em > v_visto and criado_em > now() - interval '12 hours';
  if v_ate is not null then update push_inscricoes set ultimo_visto = v_ate where endpoint = p_endpoint; end if;
  return coalesce(v_itens, '[]'::jsonb);
end $$;

-- Permissões: por padrão ninguém executa; libera só o necessário.
revoke all on function
  public.push_host_ok(text), public.push_enfileirar(uuid, text, text, text, text), public.push_preparar(timestamptz),
  public.push_disparar(), public.push_ciclo(), public.tarefas_push_nova(),
  public.push_chave_publica(), public.push_definir_chaves(text, jsonb, text, text), public.push_inscrever(text),
  public.push_desinscrever(text), public.push_teste(), public.push_pendentes(text), public.push_falhou(text, text),
  public.push_buscar(text)
  from public, anon, authenticated;
grant execute on function
  public.push_chave_publica(), public.push_definir_chaves(text, jsonb, text, text), public.push_inscrever(text),
  public.push_desinscrever(text), public.push_teste() to authenticated;
grant execute on function
  public.push_pendentes(text), public.push_falhou(text, text), public.push_buscar(text) to anon, authenticated;

-- Agenda: a cada 15 minutos.
do $$ begin perform cron.unschedule('crm-notificacoes'); exception when others then null; end $$;
select cron.schedule('crm-notificacoes', '*/15 * * * *', 'select public.push_ciclo()');
