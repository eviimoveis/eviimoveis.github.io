# EVI Imóveis — site

Site informativo com os imóveis da EVI Imóveis, separados por região, com filtros e botão de WhatsApp.

## Como abrir
Dê dois cliques no arquivo `index.html`.

## Como colocar as FOTOS (passo a passo)
1. Cada imóvel no site mostra o **código** no canto da foto (ex.: `Cód. CA0002`).
2. Salve a foto do imóvel dentro da pasta **`fotos/`**.
3. Renomeie o arquivo com o **código exato** do imóvel. Exemplo: `CA0002.jpg`. Também aceita `.jpeg`, `.png` e `.webp`.
4. Fotos extras (aparecem ao clicar em "Ver detalhes"): `CA0002-2.jpg`, `CA0002-3.jpg`, ... até `CA0002-40.jpg`.
5. Recarregue o site. A foto aparece sozinha.

> Atenção: maiúsculas e minúsculas importam. `CA0002.jpg` ≠ `ca0002.jpg`.

### Lista de imóveis e nome de cada foto

| Código | Nome do arquivo da foto | Imóvel | Bairro | Negócio |
|---|---|---|---|---|
| 12DBSNT | `fotos/12DBSNT.jpg` | Comercial, 52 m² | Perdizes (São Paulo) | Aluguel |
| 745SNT | `fotos/745SNT.jpg` | Casa, 250 m² | Perdizes (São Paulo) | Aluguel |
| AF7SNT | `fotos/AF7SNT.jpg` | Comercial, 510 m² | Perdizes (São Paulo) | Aluguel |
| 1O8TSNT | `fotos/1O8TSNT.jpg` | Comercial, 64 m² | Pinheiros (São Paulo) | Aluguel |
| 2OG383 | `fotos/2OG383.jpg` | Terreno, 250 m² | Sumarezinho (São Paulo) | Venda |
| CA0001 | `fotos/CA0001.jpg` | Casa, 180 m² | Sumarezinho (São Paulo) | Venda |
| R66383 | `fotos/R66383.jpg` | Comercial, 192 m² | Sumarezinho (São Paulo) | Aluguel/Venda |
| N8BSNT | `fotos/N8BSNT.jpg` | Apartamento, 45 m² | Sumaré (São Paulo) | Venda |
| 6OFSNT | `fotos/6OFSNT.jpg` | Casa, 490 m² | Vila Ida (São Paulo) | Venda |
| 1E0Q383 | `fotos/1E0Q383.jpg` | Comercial, 3000 m² | Vila Pompéia (São Paulo) | Aluguel |
| 1K4FSNT | `fotos/1K4FSNT.jpg` | Comercial, 250 m² | Vila Pompéia (São Paulo) | Aluguel/Venda |
| 1K5TSNT | `fotos/1K5TSNT.jpg` | Comercial, 373 m² | Vila Pompéia (São Paulo) | Aluguel/Venda |
| 2TFSNT | `fotos/2TFSNT.jpg` | Comercial, 1218 m² | Vila Pompéia (São Paulo) | Aluguel/Venda |
| 72Q383 | `fotos/72Q383.jpg` | Casa, 180 m² | Vila Pompéia (São Paulo) | Aluguel |
| LO003 | `fotos/LO003.jpg` | Comercial, 125 m² | Vila Pompéia (São Paulo) | Aluguel |
| LO006 | `fotos/LO006.jpg` | Comercial, 125 m² | Vila Pompéia (São Paulo) | Aluguel |
| K6O383 | `fotos/K6O383.jpg` | Casa, 284 m² | Cerqueira César (São Paulo) | Aluguel |
| 1MM6383 | `fotos/1MM6383.jpg` | Comercial, 100 m² | Consolação (São Paulo) | Aluguel |
| IC1SNT | `fotos/IC1SNT.jpg` | Comercial, 200 m² | Consolação (São Paulo) | Aluguel |
| 8N0383 | `fotos/8N0383.jpg` | Apartamento, 95 m² | Jardim Paulista (São Paulo) | Aluguel |
| CA0002 | `fotos/CA0002.jpg` | Casa, 456 m² | Pacaembu (São Paulo) | Aluguel/Venda |
| SI0001 | `fotos/SI0001.jpg` | Sítio / Terreno, 150000 m² | Alto Da Serra (Mailasqui) (São Roque) | Venda |
| 1KMDSNT | `fotos/1KMDSNT.jpg` | Casa, 244 m² | Condominio Parque das Vertentes (Serra Negra) | Aluguel/Venda |

## Como adicionar ou editar um imóvel
Abra o arquivo `imoveis.js`. Cada imóvel é um bloco `{ ... }` com um comentário em cima (`// ===== CÓDIGO - tipo - bairro =====`).
- Para **editar**: troque os valores entre aspas ou os números.
- Para **adicionar**: copie um bloco inteiro (do `{` até o `},`), cole abaixo e troque os dados.
- Para **remover**: apague o bloco inteiro.
- `negocio`: use `"venda"`, `"aluguel"` ou `"ambos"` (Aluguel/Venda).
- `regiao`: `"Zona Oeste"`, `"Centro / Jardins"`, `"Zona Sul"`, `"Zona Norte"`, `"Zona Leste"` ou `"Interior de SP"`.
- Valores sem pontos ou vírgulas: `1850000` = R$ 1.850.000. Use `0` quando não houver.

## WhatsApp
O número fica no início do arquivo `script.js` (`WHATSAPP = "5511911297820"`).

---

# CRM (corretores parceiros + leads)

Duas páginas novas, que não mudam o site de imóveis:

| Página | Quem usa | O que faz |
|---|---|---|
| `cadastro.html` | Qualquer pessoa com o link | Escolhe **"Quero encontrar um imóvel"** ou **"Sou corretor"** e preenche o cadastro. |
| `painel.html` | Só os 2 usuários autorizados (login) | Leads, corretores, sugestão de corretor para cada lead, mensagem pronta de WhatsApp, follow-ups e relatórios. |

Links úteis para divulgar:
- `cadastro.html?perfil=corretor` abre direto o cadastro de corretor.
- `cadastro.html?perfil=cliente` abre direto o cadastro de cliente.
- `cadastro.html?origem=Instagram` marca de onde o lead veio (aparece nos relatórios).

## Como ligar o CRM (uma vez só)

1. Crie uma conta gratuita em **supabase.com** e um projeto novo (região: São Paulo).
2. No projeto, abra **SQL Editor > New query**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Em **Authentication > Sign In / Providers**, desligue **"Allow new users to sign up"** (assim ninguém cria conta sozinho).
4. Em **Authentication > Users > Add user**, crie os 2 usuários (e-mail e senha), marcando **Auto Confirm User**.
5. Volte ao **SQL Editor** e rode, trocando pelos dois e-mails:
   ```sql
   insert into public.crm_admins (user_id)
   select id from auth.users
   where email in ('voce@exemplo.com', 'socio@exemplo.com')
   on conflict do nothing;
   ```
6. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public** e cole em `crm/config.js`.
   Nunca use a chave `service_role` no site.
7. Publique o site como já faz hoje. O CRM funciona em qualquer hospedagem de site estático.

## Segurança
- O visitante do link público só consegue **enviar** um cadastro. Ele não lê, não altera e não apaga nada.
- Só quem está na tabela `crm_admins` vê os dados no painel. Outra conta, mesmo logada, é barrada.
- A chave `anon public` pode ficar no código: quem protege os dados são as regras do `schema.sql`.

## WhatsApp
No painel, abra um lead e clique em **WhatsApp** ao lado do corretor sugerido. O texto vem pronto e pode ser editado;
ao confirmar, o WhatsApp (ou WhatsApp Business) do aparelho abre com a mensagem para o corretor, o lead é atribuído
a ele e o envio fica no histórico. Não usa a API paga da Meta.

## Como o CRM sugere corretores
Para cada lead, os corretores ativos são ordenados por: atua na **região** pedida (3 pontos), atende o **tipo de imóvel**
(2 pontos), trabalha com **venda/aluguel** conforme o interesse (1 ponto). No empate, vem primeiro quem tem menos leads em aberto.

Para mudar regiões, tipos de imóvel ou etapas do funil, edite o início de `crm/comum.js` (as etapas também ficam em `supabase/schema.sql`).
