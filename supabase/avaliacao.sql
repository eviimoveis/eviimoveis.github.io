-- CRM EVI Imóveis - Avaliação dos corretores parceiros
-- Cole no Supabase > SQL Editor > Run. Pode rodar mais de uma vez.
alter table public.corretores add column if not exists avaliacao text not null default 'Sem avaliação';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'corretores_avaliacao_valida') then
    alter table public.corretores add constraint corretores_avaliacao_valida
      check (avaliacao in ('Sem avaliação', 'Parceiro forte', 'Regular', 'Não responde'));
  end if;
end $$;

-- Quem se cadastra pelo link público entra sempre como "Sem avaliação".
drop policy if exists "publico cadastra corretor" on public.corretores;
create policy "publico cadastra corretor" on public.corretores
  for insert to anon, authenticated
  with check (status = 'Ativo' and bairro3 is null and avaliacao = 'Sem avaliação');
