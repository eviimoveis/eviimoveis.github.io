/* ===== CRM EVI Imóveis - aba Imobiliárias =====
   Carregado antes do painel.js; usa D, sb, gravar, carregar, abrirJanela etc. na hora de desenhar.

   As imobiliárias saem do campo "Imobiliária" dos corretores. Nomes parecidos
   ("samuel carvalho", "Samuel Carvalho Imóveis") viram uma só. A tabela "imobiliarias"
   guarda só o que você completa à mão: contatos, tipos de imóvel, faixas e observações. */

let imobAtivo = false; // false enquanto o banco não tiver a tabela "imobiliarias"
const filtrosImob = { busca: "", zona: "", faixa: "", operacao: "", categoria: "", tipo: "", especialidade: "", contato: "", ordem: "corretores" };
const TIPOS_IMOVEL_IMOB = ["Casa", "Apartamento", "Cobertura", "Terreno", "Galpão", "Loja/Sala", "Studio", "Prédio comercial"];
const ESPECIALIDADE_PARA_TIPO = { "Terrenos": "Terreno", "Galpões": "Galpão", "Lojas e salas": "Loja/Sala", "Studios": "Studio" };
const ESPECIALIDADES_IMOB = ["Alto padrão", "Lançamentos", "Econômico / MCMV"];

/* ---------- Nome da imobiliária: comparação tolerante ---------- */
const PALAVRAS_GENERICAS = new Set(["imoveis", "imovel", "imobiliaria", "imobiliarias", "negocios", "imobiliarios", "ltda", "me",
  "eireli", "epp", "sp", "servicos", "empresariais", "assessoria", "consultoria", "corretora", "de", "do", "da", "dos", "das", "e", "grupo"]);
function chaveImob(nome) {
  const palavras = semAcento(nome).replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
  const uteis = palavras.filter((p) => !PALAVRAS_GENERICAS.has(p));
  return (uteis.length ? uteis : palavras).join("");
}
const ehAutonomo = (t) => /autonom/.test(semAcento(t));
/* "Corretor autônomo / BCI Imóveis" -> ["BCI Imóveis"]; aceita "/" e vírgula para mais de uma. */
const imobiliariasDoTexto = (texto) => String(texto || "").split(/[\/,;]+/).map((x) => x.trim()).filter((x) => x.length >= 2 && !ehAutonomo(x));

function distancia(a, b) { // quantas letras mudam de uma para outra (para erros de digitação)
  if (Math.abs(a.length - b.length) > 1) return 2;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const chavesParecidas = (a, b) => a === b || (a.length >= 6 && b.length >= 6 && distancia(a, b) <= 1);

/* Nome para mostrar: prefere grafia com maiúsculas e minúsculas e iniciais maiúsculas; no empate, a mais curta. */
function melhorGrafia(grafias) {
  const nota = (g) => (g !== g.toUpperCase() && g !== g.toLowerCase() ? 2 : 0) +
    (g.split(/\s+/).filter((p) => p.length > 2).every((p) => p[0] === p[0].toUpperCase()) ? 1 : 0);
  return [...grafias].sort((a, b) => nota(b) - nota(a) || a.length - b.length)[0];
}

/* ---------- Monta os grupos (uma entrada por imobiliária) ---------- */
function gruposImob() {
  const grupos = [];
  const achar = (chave) => grupos.find((g) => g.chaves.some((k) => chavesParecidas(k, chave)));
  for (const r of D.imobiliarias || []) {
    const chaves = [r.nome, ...(r.apelidos || [])].map(chaveImob).filter(Boolean);
    const existente = chaves.map(achar).find(Boolean);
    if (existente && !existente.row) { existente.row = r; existente.chaves.push(...chaves); }
    else grupos.push({ row: r, chaves, grafias: new Set(), corretores: [] });
  }
  for (const c of D.corretores) {
    for (const nome of imobiliariasDoTexto(c.imobiliaria)) {
      const chave = chaveImob(nome);
      if (!chave) continue;
      let g = achar(chave);
      if (!g) { g = { row: null, chaves: [chave], grafias: new Set(), corretores: [] }; grupos.push(g); }
      else if (!g.chaves.includes(chave)) g.chaves.push(chave);
      g.grafias.add(nome);
      if (!g.corretores.includes(c)) g.corretores.push(c);
    }
  }
  return grupos.map(resumirImob);
}

function resumirImob(g) {
  const r = g.row || {};
  const cs = g.corretores;
  const uniao = (lista) => [...new Set(lista.flat().filter(Boolean))];
  const bairros = uniao([...cs.map((c) => todosBairros(c)), r.bairros || []]);
  const zonas = uniao([...bairros.map(zonaDe), ...cs.map((c) => extrasDe(c).zonas)]);
  const expandir = (v, ambos) => (v === "Ambos" ? ambos : [v]);
  const categorias = uniao([...cs.map((c) => expandir(c.categoria, ["Residencial", "Comercial"])), r.categoria ? expandir(r.categoria, ["Residencial", "Comercial"]) : []]);
  const operacoes = uniao([...cs.map((c) => expandir(c.operacao, ["Venda", "Locação"])), r.operacao ? expandir(r.operacao, ["Venda", "Locação"]) : []]);
  const especialidades = uniao(cs.map((c) => c.especialidades || []));
  const tipos = uniao([r.tipos || [], especialidades.map((e) => ESPECIALIDADE_PARA_TIPO[e])]);
  // Faixas: se você preencheu na ficha, valem as suas; senão, as que os corretores marcaram.
  const faixasVenda = (r.faixas_venda || []).length ? r.faixas_venda : uniao(cs.map((c) => c.faixas_venda || []));
  const faixasLocacao = (r.faixas_locacao || []).length ? r.faixas_locacao : uniao(cs.map((c) => c.faixas_locacao || []));
  const ids = new Set(cs.map((c) => c.id));
  const envios = D.envios.filter((e) => ids.has(e.corretor_id));
  return {
    id: r.id || "auto:" + g.chaves[0],
    row: g.row,
    nome: r.nome || melhorGrafia(g.grafias),
    grafias: [...g.grafias],
    chaves: g.chaves,
    corretores: cs.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    bairros, zonas, categorias, operacoes, especialidades, tipos, faixasVenda, faixasLocacao,
    leadsEnviados: new Set(envios.map((e) => e.lead_id)).size,
    fechados: envios.filter((e) => e.status === "Fechou").length,
    temContato: Boolean(r.telefone || r.email || r.site),
  };
}

/* "Venda: R$ 500 mil a 5 milhões" */
function textoValor(v) {
  if (v === Infinity) return "";
  if (v >= 1e6) { const n = (v / 1e6).toLocaleString("pt-BR"); return `${n} ${v === 1e6 ? "milhão" : "milhões"}`; }
  return `${(v / 1e3).toLocaleString("pt-BR")} mil`;
}
function resumoFaixas(faixas) {
  const lim = faixas.map((f) => LIMITES_FAIXA[f]).filter(Boolean);
  if (!lim.length) return "";
  const min = Math.min(...lim.map((l) => l[0])), max = Math.max(...lim.map((l) => l[1]));
  if (max === Infinity) return `acima de R$ ${textoValor(min)}`;
  const a = textoValor(min), b = textoValor(max);
  // "R$ 10 a 20 mil" e "R$ 1 a 5 milhões" em vez de repetir a unidade
  const unidade = (t) => t.replace(/^[\d.,]+ /, "");
  if (unidade(a) === unidade(b) || (unidade(a) === "milhão" && unidade(b) === "milhões")) return `R$ ${a.split(" ")[0]} a ${b}`;
  return `R$ ${a} a ${b}`;
}
function linhaFaixas(i) {
  return [i.faixasVenda.length && "Venda: " + resumoFaixas(i.faixasVenda), i.faixasLocacao.length && "Aluguel: " + resumoFaixas(i.faixasLocacao)].filter(Boolean);
}

/* ---------- Aba ---------- */
function abaImobiliarias() {
  const sel = (id, rotulo, opcoes, valor) =>
    `<select id="${id}" aria-label="${escapar(rotulo)}">${opcoes.map(([v, t]) => `<option value="${escapar(v)}"${valor === v ? " selected" : ""}>${escapar(t)}</option>`).join("")}</select>`;
  const faixaOpts = [["", "Faixa de valor: todas"], ...FAIXAS_VENDA.map((f) => ["V|" + f, "Venda · " + f]), ...FAIXAS_LOCACAO.map((f) => ["L|" + f, "Aluguel · " + f])];
  const aviso = imobAtivo ? "" : `<p class="crm-aviso-banco">Contatos e ajustes das imobiliárias ficam disponíveis depois de rodar o SQL da tabela <code>imobiliarias</code> no Supabase. A lista abaixo já funciona.</p>`;
  $("conteudo").innerHTML = `
    ${aviso}
    <div class="crm-barra">
      <input type="search" id="im-busca" placeholder="Buscar por imobiliária, bairro ou corretor..." value="${escapar(filtrosImob.busca)}">
    </div>
    <div class="crm-filtros-imob">
      ${sel("im-zona", "Zona", [["", "Zona: todas"], ...Object.entries(NOME_ZONA)], filtrosImob.zona)}
      ${sel("im-faixa", "Faixa de valor", faixaOpts, filtrosImob.faixa)}
      ${sel("im-operacao", "Operação", [["", "Operação: todas"], ["Venda", "Trabalha com venda"], ["Locação", "Trabalha com locação"]], filtrosImob.operacao)}
      ${sel("im-categoria", "Categoria", [["", "Categoria: todas"], ["so-res", "Só residencial"], ["so-com", "Só comercial"], ["ambas", "Residencial e comercial"]], filtrosImob.categoria)}
      ${sel("im-tipo", "Tipo de imóvel", [["", "Tipo de imóvel: todos"], ...TIPOS_IMOVEL_IMOB.map((t) => [t, t])], filtrosImob.tipo)}
      ${sel("im-especialidade", "Especialidade", [["", "Especialidade: todas"], ...ESPECIALIDADES_IMOB.map((t) => [t, t])], filtrosImob.especialidade)}
      ${sel("im-contato", "Contato", [["", "Contato: todos"], ["com", "Com contato"], ["sem", "Sem contato"]], filtrosImob.contato)}
      ${sel("im-ordem", "Ordenar", [["corretores", "Ordenar: mais corretores"], ["leads", "Ordenar: mais leads enviados"], ["fechados", "Ordenar: mais negócios fechados"], ["nome", "Ordenar: nome"]], filtrosImob.ordem)}
      <button type="button" class="crm-link-texto" data-acao="im-limpar">Limpar filtros</button>
    </div>
    <div id="lista"></div>`;
  listaImobiliarias();
}

function filtrarImob(lista) {
  const f = filtrosImob;
  const termo = semAcento(f.busca);
  return lista.filter((i) => {
    if (termo && !semAcento([i.nome, ...i.grafias, ...i.bairros, ...i.corretores.map((c) => c.nome)].join(" ")).includes(termo)) return false;
    if (f.zona && !i.zonas.includes(f.zona)) return false;
    if (f.faixa) {
      const [tipo, faixa] = f.faixa.split("|");
      if (!(tipo === "V" ? i.faixasVenda : i.faixasLocacao).includes(faixa)) return false;
    }
    if (f.operacao && !i.operacoes.includes(f.operacao)) return false;
    if (f.categoria) {
      const res = i.categorias.includes("Residencial"), com = i.categorias.includes("Comercial");
      if (f.categoria === "so-res" && !(res && !com)) return false;
      if (f.categoria === "so-com" && !(com && !res)) return false;
      if (f.categoria === "ambas" && !(res && com)) return false;
    }
    if (f.tipo && !i.tipos.includes(f.tipo)) return false;
    if (f.especialidade && !i.especialidades.includes(f.especialidade)) return false;
    if (f.contato === "com" && !i.temContato) return false;
    if (f.contato === "sem" && i.temContato) return false;
    return true;
  }).sort((a, b) => {
    const porNome = a.nome.localeCompare(b.nome, "pt-BR");
    if (f.ordem === "nome") return porNome;
    const campo = { corretores: (x) => x.corretores.length, leads: (x) => x.leadsEnviados, fechados: (x) => x.fechados }[f.ordem];
    return campo(b) - campo(a) || porNome;
  });
}

function listaImobiliarias() {
  const todas = gruposImob();
  const itens = filtrarImob(todas);
  const ativos = Object.entries(filtrosImob).some(([k, v]) => k !== "ordem" && v);
  if (!itens.length) {
    $("lista").innerHTML = `<p class="vazio">${todas.length ? "Nenhuma imobiliária com esses filtros." : "Nenhuma imobiliária ainda. Elas aparecem aqui quando os corretores informam onde trabalham."}</p>`;
    return;
  }
  $("lista").innerHTML = `<p class="resultado">${itens.length} imobiliária(s)${ativos ? ` de ${todas.length}` : ""}.</p>
    <div class="crm-tabela-wrap"><table class="crm-tabela">
    <thead><tr><th>Imobiliária</th><th>Corretores</th><th>Zonas</th><th>Faixas de valor</th><th>Atende</th><th>Leads enviados</th><th class="crm-col-mais"><span class="crm-so-leitor">Ações</span></th></tr></thead>
    <tbody>${itens.map((i) => `<tr data-acao="abrir-imob" data-id="${escapar(i.id)}" tabindex="0">
        <td><strong>${escapar(i.nome)}</strong><small>${escapar(i.row ? [formatarTelefone(i.row.telefone), i.row.contato].filter(Boolean).join(" · ") : "")}</small></td>
        <td>${i.corretores.length}<small>${escapar(i.corretores.slice(0, 3).map((c) => primeiroNome(c.nome)).join(", "))}${i.corretores.length > 3 ? "…" : ""}</small></td>
        <td>${escapar(i.zonas.map((z) => NOME_ZONA[z]).join(", ") || "—")}</td>
        <td>${linhaFaixas(i).map((t) => `<small>${escapar(t)}</small>`).join("") || "—"}</td>
        <td>${escapar(i.categorias.join(" e ") || "—")}<small>${escapar(i.operacoes.join(" e "))}</small></td>
        <td>${i.leadsEnviados}${i.fechados ? `<small>${i.fechados} fechado(s)</small>` : ""}</td>
        <td class="crm-col-mais"><button type="button" class="crm-mais" data-acao="im-menu" data-id="${escapar(i.id)}" aria-haspopup="menu" aria-label="Mais opções para ${escapar(i.nome)}">⋮</button></td>
      </tr>`).join("")}</tbody></table></div>`;
}

/* ---------- Ficha ---------- */
const imobPorId = (id) => gruposImob().find((i) => i.id === id);
/* Imobiliária de um corretor, para o link na ficha dele. */
const imobDoCorretor = (c) => gruposImob().filter((i) => i.corretores.includes(c));

function linkSite(site) {
  const s = String(site || "").trim();
  if (!s) return "";
  const url = /^https?:\/\//i.test(s) ? s : /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(s) ? "https://" + s : "";
  return url ? `<a href="${escapar(url)}" target="_blank" rel="noopener noreferrer">${escapar(s)}</a>` : escapar(s);
}

function janelaImob(id) {
  const i = imobPorId(id);
  if (!i) { fecharJanela(); return; }
  aberto = { tipo: "imobiliaria", id };
  const r = i.row || {};
  const enviosDe = (c) => enviosDoCorretor(c.id).length;
  abrirJanela(`<div class="crm-janela__corpo">
    <header class="crm-janela__topo">
      <div><h2>${escapar(i.nome)}</h2><p>${i.corretores.length} corretor(es) · ${i.leadsEnviados} lead(s) enviado(s)${i.fechados ? ` · ${i.fechados} fechado(s)` : ""}</p></div>
    </header>
    <dl class="crm-info">
      ${info("Telefone", r.telefone ? `<a href="${linkWhatsApp(r.telefone)}" target="_blank" rel="noopener">${escapar(formatarTelefone(r.telefone) || r.telefone)}</a>` : "")}
      ${info("E-mail", escapar(r.email))}
      ${info("Site", linkSite(r.site))}
      ${info("Contato principal", escapar(r.contato))}
      ${info("Atende", escapar([i.categorias.join(" e "), i.operacoes.join(" e ")].filter(Boolean).join(" · ")))}
      ${info("Zonas", escapar(i.zonas.map((z) => NOME_ZONA[z]).join(", ")))}
      ${info("Faixas de valor", escapar(linhaFaixas(i).join(" · ")) + ((r.faixas_venda || []).length || (r.faixas_locacao || []).length ? " <small>(definidas por você)</small>" : ""))}
      ${info("Tipos de imóvel", escapar(i.tipos.join(", ")))}
      ${info("Especialidades", escapar(i.especialidades.join(", ")))}
      ${info("Bairros", escapar(i.bairros.join(", ")))}
      ${info("Como os corretores escreveram", i.grafias.length > 1 ? escapar(i.grafias.join(" · ")) : "")}
      ${info("Observações", escapar(r.observacoes))}
    </dl>
    ${i.row || i.corretores.length ? `<div class="crm-acoes">
      <button class="botao botao--detalhes" data-acao="im-editar" data-id="${escapar(i.id)}">${i.row ? "Editar dados" : "Completar dados"}</button>
      ${i.row ? `<button class="botao crm-perigo" data-acao="im-excluir" data-id="${escapar(i.id)}">Excluir cadastro</button>` : ""}
    </div>` : ""}
    <h3>Corretores desta imobiliária (${i.corretores.length})</h3>
    ${i.corretores.length ? `<ul class="crm-sugestoes">${i.corretores.map((c) => `<li class="crm-sugestao">
        <div><strong>${escapar(c.nome)}</strong> ${selo(c.status)}
          <small>${escapar([formatarTelefone(c.telefone), [c.bairro1, c.bairro2].filter(Boolean).join(" / ")].filter(Boolean).join(" · "))}</small>
          <small>${escapar([c.categoria, c.operacao, resumoFaixas(c.faixas_venda || []) && "Venda " + resumoFaixas(c.faixas_venda), resumoFaixas(c.faixas_locacao || []) && "Aluguel " + resumoFaixas(c.faixas_locacao)].filter(Boolean).join(" · "))} · recebeu ${enviosDe(c)} lead(s)</small></div>
        <div class="crm-sugestao__acoes"><button class="botao botao--detalhes" data-acao="abrir-corretor" data-id="${c.id}">Abrir</button></div>
      </li>`).join("")}</ul>` : '<p class="crm-sem-dados">Nenhum corretor cadastrado com esta imobiliária ainda.</p>'}
  </div>`);
}

const CAMPOS_IMOB = [
  { id: "nome", rotulo: "Nome da imobiliária", tipo: "text", obrig: true, max: 120 },
  { id: "telefone", rotulo: "Telefone / WhatsApp", tipo: "text", max: 20, dica: "(11) 3077-2277" },
  { id: "email", rotulo: "E-mail", tipo: "email", max: 160 },
  { id: "site", rotulo: "Site", tipo: "text", max: 200 },
  { id: "contato", rotulo: "Contato principal", tipo: "text", max: 120 },
  { id: "tipos", rotulo: "Tipos de imóvel com que trabalha", tipo: "multi", opcoes: TIPOS_IMOVEL_IMOB, ajuda: "Marque o que souber. Terreno, galpão, loja/sala e studio também vêm das especialidades dos corretores." },
  { id: "faixas_venda", rotulo: "Faixas de venda (deixe em branco para usar as dos corretores)", tipo: "multi", opcoes: FAIXAS_VENDA },
  { id: "faixas_locacao", rotulo: "Faixas de aluguel (deixe em branco para usar as dos corretores)", tipo: "multi", opcoes: FAIXAS_LOCACAO },
  { id: "observacoes", rotulo: "Observações", tipo: "textarea", max: 2000 },
];

function janelaFormImob(id) {
  if (!imobAtivo) { aviso("Rode o SQL da tabela de imobiliárias no Supabase para poder salvar contatos.", true); return; }
  const i = imobPorId(id);
  if (!i) return;
  aberto = { tipo: "imobiliaria", id };
  const valores = i.row ? { ...i.row } : { nome: i.nome };
  abrirJanela(`<div class="crm-janela__corpo">
    <h2>${i.row ? "Editar" : "Completar"} imobiliária</h2>
    <form class="crm-form" data-form-imob="${escapar(i.id)}" novalidate>
      <div class="crm-grade-campos">${montarCampos(CAMPOS_IMOB, valores)}</div>
      <p class="crm-erro oculto" role="alert"></p>
      <div class="crm-acoes">
        <button type="submit" class="botao botao--zap">Salvar</button>
        <button type="button" class="botao botao--detalhes" data-acao="abrir-imob" data-id="${escapar(i.id)}">Cancelar</button>
      </div>
    </form></div>`);
  ativarForm($("janela-conteudo").querySelector("form"), CAMPOS_IMOB);
}

document.addEventListener("submit", async (e) => {
  const f = e.target;
  if (!f.dataset || !f.dataset.formImob) return;
  e.preventDefault();
  const i = imobPorId(f.dataset.formImob);
  const caixaErro = f.querySelector(".crm-erro");
  caixaErro.classList.add("oculto");
  if (!f.checkValidity()) { f.reportValidity(); return; }
  const { dados, erro } = lerCampos(f, CAMPOS_IMOB);
  if (erro) { caixaErro.textContent = erro; caixaErro.classList.remove("oculto"); return; }
  // Guarda como os corretores escreveram, para continuar reconhecendo mesmo se você renomear.
  dados.apelidos = [...new Set([...(i?.row?.apelidos || []), ...(i?.grafias || [])])].filter((g) => g !== dados.nome).slice(0, 50);
  const ok = await gravar(i?.row ? sb.from("imobiliarias").update(dados).eq("id", i.row.id) : sb.from("imobiliarias").insert(dados));
  if (!ok) return;
  aviso("Salvo.");
  await carregar();
  const novo = gruposImob().find((x) => x.chaves.includes(chaveImob(dados.nome)));
  if (novo) janelaImob(novo.id); else fecharJanela();
});

/* ---------- Menu ⋮ ---------- */
function abrirMenuImob(botao) {
  const m = $("menu-linha");
  const id = botao.dataset.id;
  if (!m.hidden && m.dataset.id === id) { m.hidden = true; return; }
  const i = imobPorId(id);
  const dados = `data-id="${escapar(id)}" role="menuitem"`;
  m.dataset.id = id;
  m.innerHTML = `
    <button ${dados} data-acao="abrir-imob">Abrir</button>
    <button ${dados} data-acao="im-editar">${i?.row ? "Editar" : "Completar dados"}</button>
    ${i?.row ? `<button ${dados} data-acao="im-excluir" class="crm-menu-linha__perigo">Excluir cadastro</button>` : ""}`;
  m.hidden = false;
  const r = botao.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(r.right - m.offsetWidth, innerWidth - m.offsetWidth - 8)) + "px";
  m.style.top = (r.bottom + m.offsetHeight + 8 < innerHeight ? r.bottom + 4 : Math.max(8, r.top - m.offsetHeight - 4)) + "px";
  m.querySelector("button").focus();
}

const IMOB_ACOES = {
  "abrir-imob": (b) => janelaImob(b.dataset.id),
  "im-menu": (b) => abrirMenuImob(b),
  "im-editar": (b) => janelaFormImob(b.dataset.id),
  "im-excluir": async (b) => {
    const i = imobPorId(b.dataset.id);
    if (!i?.row) return;
    const resto = i.corretores.length ? `\n\nOs ${i.corretores.length} corretor(es) continuam cadastrados e a imobiliária continua aparecendo na lista por causa deles; só os contatos e ajustes são apagados.` : "";
    if (!confirm(`Excluir o cadastro da imobiliária "${i.nome}"?${resto}`)) return;
    if (await gravar(sb.from("imobiliarias").delete().eq("id", i.row.id))) { fecharJanela(); aviso("Cadastro excluído."); await carregar(); }
  },
  "im-limpar": () => { Object.keys(filtrosImob).forEach((k) => { filtrosImob[k] = k === "ordem" ? "corretores" : ""; }); abaImobiliarias(); },
};

/* Filtros: atualizam a lista sem redesenhar a aba (o campo de busca não perde o foco). */
const CAMPOS_FILTRO_IMOB = { "im-zona": "zona", "im-faixa": "faixa", "im-operacao": "operacao", "im-categoria": "categoria", "im-tipo": "tipo", "im-especialidade": "especialidade", "im-contato": "contato", "im-ordem": "ordem" };
document.addEventListener("change", (e) => {
  const chave = CAMPOS_FILTRO_IMOB[e.target.id];
  if (chave) { filtrosImob[chave] = e.target.value; listaImobiliarias(); }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "im-busca") { filtrosImob.busca = e.target.value; listaImobiliarias(); }
});
