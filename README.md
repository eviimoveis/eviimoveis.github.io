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

Duas páginas, que não mudam o site de imóveis. Seguem os mesmos formulários e as mesmas regras da planilha "Sistema de Match Lead-Corretor".

| Página | Quem usa | O que faz |
|---|---|---|
| `cadastro.html` | Qualquer pessoa com o link | Escolhe **"Quero encontrar um imóvel"** ou **"Sou corretor"** e preenche o cadastro. |
| `painel.html` | Só os usuários autorizados (login) | Leads, corretores, top 5 corretores de cada lead, envio pelo WhatsApp, cobranças e relatórios. |

Links úteis para divulgar:
- `cadastro.html?perfil=corretor` abre direto o cadastro de corretor.
- `cadastro.html?perfil=cliente` abre direto o cadastro de cliente.
- `cadastro.html?origem=Instagram` marca de onde o lead veio (aparece nos relatórios).

## Como funciona no dia a dia
1. O lead ou o corretor se cadastra pelo link (ou você cadastra em **+ Novo lead** / **+ Novo corretor**).
2. No painel, abra o lead. Aparecem a **mensagem pronta** e o **top 5 corretores**.
3. Clique em **📲 Enviar** ao lado de cada corretor. O WhatsApp abre com a mensagem escrita; é só enviar.
   O contato do cliente não vai na mensagem.
4. O envio fica registrado, com cobrança marcada para 2 dias depois. Na aba **Envios** você anota o retorno
   do corretor, muda o status e clica em **Cobrar** quando vencer.

## Como o match pontua (igual à planilha)
- Bairro principal do lead: 50 pontos se for o 1º bairro do corretor, 40 se for o 2º, 30 se for o 3º; 5 se só a zona bater.
- 2ª opção de bairro do lead: 25, 20 ou 15 pontos; 3 se só a zona bater.
- Faixa de valor: +15 se o orçamento cabe numa faixa do corretor, -15 se não cabe, 0 se ele não informou.
- Só entram corretores **ativos**, da mesma **categoria** (residencial/comercial) e **operação** (locação/venda) do lead.
- 50 pontos ou mais de região = Excelente; 30 ou mais = Boa; abaixo disso = Possível.

Para mudar bairros e zonas, faixas de valor ou etapas, edite o início de `crm/comum.js`
(etapas e status também ficam em `supabase/schema.sql`). A quantidade de corretores sugeridos e o prazo
de cobrança ficam no início de `crm/painel.js` (`TOP` e `DIAS_COBRANCA`).

## Como ligar o CRM (uma vez só)
1. Crie uma conta gratuita em **supabase.com** e um projeto novo (região: São Paulo).
2. No projeto, abra **SQL Editor**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Em **Authentication > Sign In / Providers**, desligue **"Allow new users to sign up"**.
4. Em **Authentication > Users > Add user**, crie os usuários do painel (e-mail e senha).
5. No **SQL Editor**, autorize cada um (o comando está no fim do `schema.sql`).
6. Em **Settings > API Keys**, copie a chave **Publishable** (ou **anon public**) e cole em `crm/config.js`,
   junto com o endereço do projeto. Nunca use a chave `secret` / `service_role` no site.
7. Publique o site como já faz hoje. O CRM funciona em qualquer hospedagem de site estático.

## Segurança
- O visitante do link público só consegue **enviar** um cadastro. Ele não lê, não altera e não apaga nada.
- Só quem está na tabela `crm_admins` vê os dados no painel. Outra conta, mesmo logada, é barrada.
- A chave pública pode ficar no código: quem protege os dados são as regras do `schema.sql`.

## WhatsApp
Os botões **📲 Enviar** e **Cobrar** abrem o WhatsApp (ou WhatsApp Business) do aparelho com a mensagem pronta,
igual ao link "Enviar" da planilha. Não usa a API paga da Meta, então o envio não é automático: você confirma no WhatsApp.

# Anúncios (página pública por imóvel)

Aba **Anúncios** no painel: cria uma página `anuncio.html?id=...` para cada imóvel, com o mesmo visual da `/camargo-prime/`.

1. **+ Criar anúncio** → cole o link do anúncio e clique em **Extrair** (ou cole o texto do anúncio). Os dados preenchem o formulário; confira e ajuste.
2. Envie as fotos (várias imagens ou um `.zip`). Elas são reduzidas no navegador (1600 px + miniatura de 480 px) antes de ir para o Storage. A primeira é a principal; dá para trocar, reordenar e pôr legenda.
3. Escolha a validade (1 semana, 1 mês, 3 meses ou uma data) e clique em **Gerar página**.
4. Na lista: copiar link, abrir, editar, prorrogar, pausar e excluir.

Depois da validade (ou pausado), a página mostra "Este imóvel não está mais disponível". Fotos de anúncios vencidos há mais de 30 dias são apagadas sozinhas quando o painel abre a aba Anúncios. A página tem `noindex` (fora do Google).

## Ligar no Supabase (uma vez)
1. **SQL Editor:** rode o bloco "Anúncios" de `supabase/schema.sql` (tabela `anuncios`, função `anuncio_publico` e bucket `anuncios`).
2. **Edge Functions → Deploy a new function → Via Editor**, nome `extrair-anuncio`, cole `supabase/functions/extrair-anuncio/index.ts` e publique (precisa de papel Owner, Administrator ou Developer no projeto). Sem ela, o "Extrair" pelo link não funciona, mas colar o texto funciona.

Muitos portais grandes bloqueiam robôs; nesses, use a caixa de colar o texto.
