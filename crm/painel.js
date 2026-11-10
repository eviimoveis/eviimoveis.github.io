/* ===== CRM EVI Imóveis - painel interno (só usuários autorizados) ===== */

const $ = (id) => document.getElementById(id);
const sb = criarCliente();
const D = { leads: [], corretores: [], tarefas: [], interacoes: [] };
const filtros = { etapa: "", buscaLead: "", buscaCorretor: "" };
let aba = "leads";
let usuario = null;
let aberto = null; // { tipo: "lead" | "corretor", id }

/* Campos extras que só existem no painel */
const CAMPOS_LEAD_PAINEL = [
  ...CAMPOS_LEAD.map((c) => (c.id === "observacoes" ? { ...c, rotulo: "Observações" } : c)),
  { id: "origem", rotulo: "Origem", tipo: "text", max: 60, dica: "Ex.: Instagram, indicação" },
  { id: "etapa", rotulo: "Etapa", tipo: "select", opcoes: ETAPAS },
];
const CAMPOS_CORRETOR_PAINEL = [
  ...CAMPOS_CORRETOR,
  { id: "ativo", rotulo: "Situação", tipo: "select", opcoes: [["sim", "Ativo (recebe leads)"], ["nao", "Inativo"]] },
];

/* ---------- Utilidades ---------- */
const ETAPAS_ABERTAS = ["novo", "em_atendimento", "visita", "proposta"];
const corretorPorId = (id) => D.corretores.find((c) => c.id === id);
const leadPorId = (id) => D.leads.find((l) => l.id === id);
const leadsDoCorretor = (id) => D.leads.filter((l) => l.corretor_id === id);
const semAcento = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const primeiroNome = (n) => String(n || "").trim().split(/\s+/)[0] || "";

function mostrarTela(id) {
  ["v-config", "v-login", "v-app"].forEach((v) => $(v).classList.toggle("oculto", v !== id));
  $("menu-app").classList.toggle("oculto", id !== "v-app");
}

let temporizadorAviso;
function aviso(msg, erro = false) {
  const a = $("aviso");
  a.textContent = msg;
  a.classList.toggle("crm-toast--erro", erro);
  a.classList.add("visivel");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => a.classList.remove("visivel"), erro ? 6000 : 3000);
}

/* Executa uma gravação no banco; avisa se der erro. Devolve true se deu certo. */
async function gravar(consulta) {
  const { error } = await consulta;
  if (error) { console.error(error); aviso("Erro ao salvar: " + error.message, true); return false; }
  return true;
}

function resumoLead(l) {
  const partes = [NOME_INTERESSE[l.interesse] || l.interesse];
  if (l.tipo) partes.push(l.tipo);
  return partes.join(" · ");
}
const seloEtapa = (e) => `<span class="crm-selo crm-selo--${e}">${escapar(NOME_ETAPA[e] || e)}</span>`;

/* ---------- Login ---------- */
async function iniciar() {
  if (!sb) { mostrarTela("v-config"); return; }
  const { data } = await sb.auth.getSession();
  if (data.session) await entrar(data.session.user);
  else mostrarTela("v-login");
}

async function entrar(user) {
  const { data: autorizado, error } = await sb.rpc("is_crm_admin");
  if (error || !autorizado) {
    await sb.auth.signOut();
    mostrarTela("v-login");
    erroLogin(error ? "Não foi possível verificar seu acesso. Tente de novo." : "Esta conta não tem acesso ao painel.");
    return;
  }
  usuario = user;
  mostrarTela("v-app");
  await carregar();
}

function erroLogin(msg) {
  $("erro-login").textContent = msg;
  $("erro-login").classList.remove("oculto");
}

$("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("erro-login").classList.add("oculto");
  const f = e.target;
  const botao = f.querySelector("button");
  botao.disabled = true;
  const { data, error } = await sb.auth.signInWithPassword({ email: f.elements.email.value.trim(), password: f.elements.senha.value });
  botao.disabled = false;
  if (error) { erroLogin("E-mail ou senha incorretos."); return; }
  f.reset();
  await entrar(data.user);
});

/* ---------- Dados ---------- */
async function carregar() {
  const tabelas = ["leads", "corretores", "tarefas", "interacoes"];
  const respostas = await Promise.all(tabelas.map((t) => sb.from(t).select("*").order("criado_em", { ascending: false })));
  const falha = respostas.find((r) => r.error);
  if (falha) { console.error(falha.error); aviso("Erro ao carregar dados: " + falha.error.message, true); return; }
  tabelas.forEach((t, i) => { D[t] = respostas[i].data || []; });
  desenhar();
  if (aberto) reabrirJanela();
}

/* ---------- Abas ---------- */
function desenhar() {
  const hoje = hojeISO();
  $("n-leads").textContent = `(${D.leads.filter((l) => l.etapa === "novo").length} novos)`;
  $("n-corretores").textContent = `(${D.corretores.filter((c) => c.ativo).length})`;
  const pend = D.tarefas.filter((t) => !t.concluida && t.vence_em <= hoje).length;
  $("n-tarefas").textContent = pend ? `(${pend})` : "";
  document.querySelectorAll(".crm-aba").forEach((b) => b.classList.toggle("ativa", b.dataset.aba === aba));
  ({ leads: abaLeads, corretores: abaCorretores, tarefas: abaTarefas, relatorios: abaRelatorios })[aba]();
}

/* ----- Leads ----- */
function abaLeads() {
  const opcoes = ETAPAS.map(([id, nome]) => `<option value="${id}"${filtros.etapa === id ? " selected" : ""}>${nome}</option>`).join("");
  $("conteudo").innerHTML = `
    <div class="crm-barra">
      <input type="search" id="busca-lead" placeholder="Buscar por nome, telefone, bairro..." value="${escapar(filtros.buscaLead)}">
      <select id="filtro-etapa"><option value="">Todas as etapas</option>${opcoes}</select>
      <button class="botao botao--zap" data-acao="novo-lead">+ Novo lead</button>
    </div>
    <div id="lista"></div>`;
  listaLeads();
}

function listaLeads() {
  const termo = semAcento(filtros.buscaLead);
  const itens = D.leads.filter((l) =>
    (!filtros.etapa || l.etapa === filtros.etapa) &&
    (!termo || semAcento([l.nome, l.telefone, l.email, l.bairros, l.regiao, l.tipo].join(" ")).includes(termo)));
  if (!itens.length) {
    $("lista").innerHTML = `<p class="vazio">${D.leads.length ? "Nenhum lead com esses filtros." : "Nenhum lead ainda. Envie o link de cadastro ou clique em “+ Novo lead”."}</p>`;
    return;
  }
  $("lista").innerHTML = `<div class="crm-tabela-wrap"><table class="crm-tabela">
    <thead><tr><th>Cliente</th><th>Procura</th><th>Região</th><th>Valor máx.</th><th>Etapa</th><th>Corretor</th><th>Entrada</th></tr></thead>
    <tbody>${itens.map((l) => {
      const c = corretorPorId(l.corretor_id);
      return `<tr data-acao="abrir-lead" data-id="${l.id}" tabindex="0">
        <td><strong>${escapar(l.nome)}</strong><small>${escapar(formatarTelefone(l.telefone))}</small></td>
        <td>${escapar(resumoLead(l))}</td>
        <td>${escapar(l.regiao || "—")}<small>${escapar(l.bairros || "")}</small></td>
        <td>${l.valor_max ? reais(l.valor_max) : "—"}</td>
        <td>${seloEtapa(l.etapa)}</td>
        <td>${c ? escapar(c.nome) : '<span class="crm-pendente">Sem corretor</span>'}</td>
        <td>${dataBR(l.criado_em)}<small>${escapar(l.origem || "")}</small></td>
      </tr>`;
    }).join("")}</tbody></table></div>`;
}

/* ----- Corretores ----- */
function abaCorretores() {
  $("conteudo").innerHTML = `
    <div class="crm-barra">
      <input type="search" id="busca-corretor" placeholder="Buscar por nome, região, imobiliária..." value="${escapar(filtros.buscaCorretor)}">
      <button class="botao botao--zap" data-acao="novo-corretor">+ Novo corretor</button>
    </div>
    <div id="lista"></div>`;
  listaCorretores();
}

function listaCorretores() {
  const termo = semAcento(filtros.buscaCorretor);
  const itens = D.corretores.filter((c) =>
    !termo || semAcento([c.nome, c.telefone, c.imobiliaria, c.creci, ...(c.regioes || []), ...(c.tipos || [])].join(" ")).includes(termo));
  if (!itens.length) {
    $("lista").innerHTML = `<p class="vazio">${D.corretores.length ? "Nenhum corretor encontrado." : "Nenhum corretor ainda. Envie o link de cadastro ou clique em “+ Novo corretor”."}</p>`;
    return;
  }
  $("lista").innerHTML = `<div class="crm-tabela-wrap"><table class="crm-tabela">
    <thead><tr><th>Corretor</th><th>Regiões</th><th>Atende</th><th>Leads em aberto</th><th>Fechados</th><th>Situação</th></tr></thead>
    <tbody>${itens.map((c) => {
      const meus = leadsDoCorretor(c.id);
      return `<tr data-acao="abrir-corretor" data-id="${c.id}" tabindex="0">
        <td><strong>${escapar(c.nome)}</strong><small>${escapar([formatarTelefone(c.telefone), c.imobiliaria].filter(Boolean).join(" · "))}</small></td>
        <td>${escapar((c.regioes || []).join(", ") || "—")}</td>
        <td>${escapar((c.tipos || []).join(", ") || "—")}</td>
        <td>${meus.filter((l) => ETAPAS_ABERTAS.includes(l.etapa)).length}</td>
        <td>${meus.filter((l) => l.etapa === "fechado").length}</td>
        <td>${c.ativo ? '<span class="crm-selo crm-selo--fechado">Ativo</span>' : '<span class="crm-selo crm-selo--perdido">Inativo</span>'}</td>
      </tr>`;
    }).join("")}</tbody></table></div>`;
}

/* ----- Follow-ups ----- */
function itemTarefa(t, comLead = true) {
  const l = leadPorId(t.lead_id);
  const c = l && corretorPorId(l.corretor_id);
  const hoje = hojeISO();
  const classe = t.concluida ? "feita" : t.vence_em < hoje ? "atrasada" : t.vence_em === hoje ? "hoje" : "";
  const rotulo = t.concluida ? "" : t.vence_em < hoje ? " · atrasado" : t.vence_em === hoje ? " · hoje" : "";
  return `<li class="crm-tarefa ${classe}">
    <input type="checkbox" data-acao="concluir-tarefa" data-id="${t.id}"${t.concluida ? " checked" : ""} aria-label="Concluir">
    <div>
      <strong>${escapar(t.descricao)}</strong>
      <small>${dataBR(t.vence_em)}${rotulo}${comLead && l ? ` · <button class="crm-link-texto" data-acao="abrir-lead" data-id="${l.id}">${escapar(l.nome)}</button>` : ""}${comLead && c ? ` · corretor ${escapar(c.nome)}` : ""}</small>
    </div>
    <button class="crm-x" data-acao="excluir-tarefa" data-id="${t.id}" aria-label="Excluir follow-up">×</button>
  </li>`;
}

function abaTarefas() {
  const abertas = D.tarefas.filter((t) => !t.concluida).sort((a, b) => a.vence_em.localeCompare(b.vence_em));
  const feitas = D.tarefas.filter((t) => t.concluida).slice(0, 10);
  $("conteudo").innerHTML = `
    <h2 class="crm-titulo">Follow-ups pendentes</h2>
    ${abertas.length ? `<ul class="crm-tarefas">${abertas.map((t) => itemTarefa(t)).join("")}</ul>`
      : '<p class="vazio">Nenhum follow-up pendente. Para criar um, abra um lead.</p>'}
    ${feitas.length ? `<h2 class="crm-titulo">Concluídos recentemente</h2><ul class="crm-tarefas">${feitas.map((t) => itemTarefa(t)).join("")}</ul>` : ""}`;
}

/* ----- Relatórios ----- */
function barras(titulo, pares) {
  const max = Math.max(1, ...pares.map(([, n]) => n));
  const linhas = pares.length
    ? pares.map(([nome, n]) => `<div class="crm-barra-linha"><span>${escapar(nome)}</span>
        <div class="crm-barra-trilho"><div style="width:${(n / max) * 100}%"></div></div><b>${n}</b></div>`).join("")
    : '<p class="crm-sem-dados">Sem dados ainda.</p>';
  return `<section class="crm-cartao"><h3>${escapar(titulo)}</h3>${linhas}</section>`;
}

function contar(lista, chave) {
  const m = new Map();
  lista.forEach((x) => { const k = chave(x); if (k) m.set(k, (m.get(k) || 0) + 1); });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function abaRelatorios() {
  const total = D.leads.length;
  const fechados = D.leads.filter((l) => l.etapa === "fechado").length;
  const perdidos = D.leads.filter((l) => l.etapa === "perdido").length;
  const abertos = total - fechados - perdidos;
  const semCorretor = D.leads.filter((l) => !l.corretor_id && ETAPAS_ABERTAS.includes(l.etapa)).length;
  const atrasados = D.tarefas.filter((t) => !t.concluida && t.vence_em < hojeISO()).length;
  const conversao = total ? Math.round((fechados / total) * 100) + "%" : "—";
  const numero = (rotulo, valor) => `<div class="crm-numero"><b>${valor}</b><span>${rotulo}</span></div>`;

  $("conteudo").innerHTML = `
    <div class="crm-numeros">
      ${numero("Leads no total", total)}
      ${numero("Em andamento", abertos)}
      ${numero("Sem corretor", semCorretor)}
      ${numero("Fechados", fechados)}
      ${numero("Conversão", conversao)}
      ${numero("Corretores ativos", D.corretores.filter((c) => c.ativo).length)}
      ${numero("Follow-ups atrasados", atrasados)}
    </div>
    <div class="crm-grade-cartoes">
      ${barras("Leads por etapa", ETAPAS.map(([id, nome]) => [nome, D.leads.filter((l) => l.etapa === id).length]))}
      ${barras("Leads por origem", contar(D.leads, (l) => l.origem))}
      ${barras("Leads por região", contar(D.leads, (l) => l.regiao || "Não informada"))}
      ${barras("Leads por corretor", contar(D.leads.filter((l) => l.corretor_id), (l) => corretorPorId(l.corretor_id)?.nome))}
      ${barras("Negócios fechados por corretor", contar(D.leads.filter((l) => l.corretor_id && l.etapa === "fechado"), (l) => corretorPorId(l.corretor_id)?.nome))}
    </div>`;
}

/* ---------- Conexão lead x corretor ---------- */
function sugerirCorretores(lead) {
  const negocio = lead.interesse === "compra" ? "venda" : "aluguel";
  return D.corretores.filter((c) => c.ativo).map((c) => {
    let pontos = 0;
    const motivos = [];
    if (lead.regiao && (c.regioes || []).includes(lead.regiao)) { pontos += 3; motivos.push("atua em " + lead.regiao); }
    if (lead.tipo && (c.tipos || []).includes(lead.tipo)) { pontos += 2; motivos.push("atende " + lead.tipo.toLowerCase()); }
    if ((c.negocios || []).includes(negocio)) { pontos += 1; motivos.push("trabalha com " + negocio); }
    const carga = leadsDoCorretor(c.id).filter((l) => ETAPAS_ABERTAS.includes(l.etapa)).length;
    return { c, pontos, motivos, carga };
  }).sort((a, b) => b.pontos - a.pontos || a.carga - b.carga);
}

function mensagemParaCorretor(lead, corretor, comContato) {
  const linhas = [
    `Olá, ${primeiroNome(corretor.nome)}! Aqui é da ${CRM_CONFIG.EMPRESA}.`,
    "Tenho um cliente que combina com o seu perfil:",
    "",
    `• Procura: ${lead.interesse === "compra" ? "comprar" : "alugar"}${lead.tipo ? " " + lead.tipo.toLowerCase() : " imóvel"}`,
  ];
  if (lead.regiao || lead.bairros) linhas.push(`• Região: ${[lead.regiao, lead.bairros].filter(Boolean).join(" – ")}`);
  if (lead.valor_max) linhas.push(`• Valor até: ${reais(lead.valor_max)}`);
  if (lead.observacoes) linhas.push(`• Observações: ${lead.observacoes}`);
  if (comContato) linhas.push(`• Cliente: ${lead.nome} – ${formatarTelefone(lead.telefone)}`);
  linhas.push("", "Consegue atender? Me avise por aqui.");
  return linhas.join("\n");
}

/* ---------- Janela (detalhes e formulários) ---------- */
function abrirJanela(html) {
  $("janela-conteudo").innerHTML = html;
  if (!$("janela").open) $("janela").showModal();
  $("janela").scrollTop = 0;
}
function fecharJanela() { aberto = null; if ($("janela").open) $("janela").close(); }
function reabrirJanela() {
  if (!aberto || !$("janela").open) return;
  const topo = $("janela").scrollTop;
  if (aberto.tipo === "lead") janelaLead(aberto.id); else janelaCorretor(aberto.id);
  $("janela").scrollTop = topo;
}

function janelaLead(id) {
  const l = leadPorId(id);
  if (!l) { fecharJanela(); return; }
  aberto = { tipo: "lead", id };
  const atual = corretorPorId(l.corretor_id);
  const sugestoes = sugerirCorretores(l).filter((s) => s.c.id !== l.corretor_id);
  const tarefas = D.tarefas.filter((t) => t.lead_id === id).sort((a, b) => a.concluida - b.concluida || a.vence_em.localeCompare(b.vence_em));
  const historico = D.interacoes.filter((i) => i.lead_id === id);
  const etapas = ETAPAS.map(([e, nome]) => `<option value="${e}"${l.etapa === e ? " selected" : ""}>${nome}</option>`).join("");
  const info = (rotulo, valor) => (valor ? `<div><dt>${rotulo}</dt><dd>${valor}</dd></div>` : "");

  const cartaoCorretor = (s, atribuido) => `<li class="crm-sugestao${atribuido ? " crm-sugestao--atual" : ""}">
      <div>
        <strong>${escapar(s.c.nome)}</strong>
        <small>${escapar([s.c.imobiliaria, formatarTelefone(s.c.telefone)].filter(Boolean).join(" · "))}</small>
        <small>${s.motivos.length ? "✓ " + escapar(s.motivos.join(" · ")) : "Sem pontos em comum com o pedido"} · ${s.carga} lead(s) em aberto</small>
      </div>
      <div class="crm-sugestao__acoes">
        <button class="botao botao--whats" data-acao="msg" data-corretor="${s.c.id}">WhatsApp</button>
        ${atribuido ? `<button class="botao botao--detalhes" data-acao="desatribuir">Remover</button>`
          : `<button class="botao botao--detalhes" data-acao="atribuir" data-corretor="${s.c.id}">Atribuir</button>`}
      </div></li>`;

  const atualHtml = atual
    ? `<ul class="crm-sugestoes">${cartaoCorretor(sugerirCorretores(l).find((s) => s.c.id === atual.id)
        || { c: atual, motivos: [], carga: leadsDoCorretor(atual.id).filter((x) => ETAPAS_ABERTAS.includes(x.etapa)).length }, true)}</ul>`
    : '<p class="crm-sem-dados">Nenhum corretor atribuído ainda.</p>';

  abrirJanela(`<div class="crm-janela__corpo">
    <header class="crm-janela__topo">
      <div><h2>${escapar(l.nome)}</h2><p>${escapar(resumoLead(l))} · entrou em ${dataBR(l.criado_em)}</p></div>
      <label class="crm-campo crm-campo--etapa">Etapa<select data-acao="mudar-etapa">${etapas}</select></label>
    </header>

    <dl class="crm-info">
      ${info("WhatsApp", `<a href="${linkWhatsApp(l.telefone)}" target="_blank" rel="noopener">${escapar(formatarTelefone(l.telefone))}</a>`)}
      ${info("E-mail", escapar(l.email))}
      ${info("Região", escapar([l.regiao, l.bairros].filter(Boolean).join(" – ")))}
      ${info("Valor máximo", l.valor_max ? reais(l.valor_max) : "")}
      ${info("Origem", escapar(l.origem))}
      ${info("Observações", escapar(l.observacoes))}
    </dl>
    <div class="crm-acoes">
      <button class="botao botao--detalhes" data-acao="editar-lead">Editar dados</button>
      <button class="botao crm-perigo" data-acao="excluir-lead">Excluir lead</button>
    </div>

    <h3>Corretor responsável</h3>
    ${atualHtml}

    <h3>${atual ? "Outros corretores possíveis" : "Corretores sugeridos"}</h3>
    ${sugestoes.length ? `<ul class="crm-sugestoes">${sugestoes.map((s) => cartaoCorretor(s, false)).join("")}</ul>`
      : '<p class="crm-sem-dados">Nenhum outro corretor ativo cadastrado.</p>'}

    <h3>Follow-ups</h3>
    ${tarefas.length ? `<ul class="crm-tarefas">${tarefas.map((t) => itemTarefa(t, false)).join("")}</ul>` : ""}
    <form class="crm-linha-form" data-form="tarefa">
      <input type="text" name="descricao" placeholder="Ex.: ligar para confirmar visita" maxlength="500" required>
      <input type="date" name="vence_em" value="${hojeISO()}" required>
      <button class="botao botao--zap">Adicionar</button>
    </form>

    <h3>Histórico</h3>
    <form class="crm-linha-form" data-form="nota">
      <input type="text" name="texto" placeholder="Anotar um contato ou observação" maxlength="2000" required>
      <button class="botao botao--zap">Anotar</button>
    </form>
    ${historico.length ? `<ul class="crm-historico">${historico.map((i) =>
      `<li><small>${new Date(i.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}${i.autor ? " · " + escapar(i.autor) : ""}</small>${escapar(i.texto)}</li>`).join("")}</ul>`
      : '<p class="crm-sem-dados">Nada anotado ainda.</p>'}
  </div>`);
}

function janelaCorretor(id) {
  const c = corretorPorId(id);
  if (!c) { fecharJanela(); return; }
  aberto = { tipo: "corretor", id };
  const meus = leadsDoCorretor(id);
  const info = (rotulo, valor) => (valor ? `<div><dt>${rotulo}</dt><dd>${valor}</dd></div>` : "");
  abrirJanela(`<div class="crm-janela__corpo">
    <header class="crm-janela__topo">
      <div><h2>${escapar(c.nome)}</h2><p>${c.ativo ? "Corretor ativo" : "Corretor inativo"} · cadastrado em ${dataBR(c.criado_em)}</p></div>
    </header>
    <dl class="crm-info">
      ${info("WhatsApp", `<a href="${linkWhatsApp(c.telefone)}" target="_blank" rel="noopener">${escapar(formatarTelefone(c.telefone))}</a>`)}
      ${info("E-mail", escapar(c.email))}
      ${info("CRECI", escapar(c.creci))}
      ${info("Imobiliária", escapar(c.imobiliaria))}
      ${info("Regiões", escapar((c.regioes || []).join(", ")))}
      ${info("Tipos de imóvel", escapar((c.tipos || []).join(", ")))}
      ${info("Trabalha com", escapar((c.negocios || []).map((n) => (n === "venda" ? "Venda" : "Aluguel")).join(", ")))}
      ${info("Observações", escapar(c.observacoes))}
    </dl>
    <div class="crm-acoes">
      <button class="botao botao--detalhes" data-acao="editar-corretor">Editar dados</button>
      <button class="botao crm-perigo" data-acao="excluir-corretor">Excluir corretor</button>
    </div>
    <h3>Leads deste corretor (${meus.length})</h3>
    ${meus.length ? `<ul class="crm-sugestoes">${meus.map((l) => `<li class="crm-sugestao">
        <div><strong>${escapar(l.nome)}</strong><small>${escapar(resumoLead(l))}${l.regiao ? " · " + escapar(l.regiao) : ""}</small></div>
        <div class="crm-sugestao__acoes">${seloEtapa(l.etapa)}<button class="botao botao--detalhes" data-acao="abrir-lead" data-id="${l.id}">Abrir</button></div>
      </li>`).join("")}</ul>` : '<p class="crm-sem-dados">Nenhum lead atribuído ainda.</p>'}
  </div>`);
}

function janelaForm(tipo, registro) {
  const ehLead = tipo === "lead";
  const campos = ehLead ? CAMPOS_LEAD_PAINEL : CAMPOS_CORRETOR_PAINEL;
  const valores = registro
    ? (ehLead ? registro : { ...registro, ativo: registro.ativo ? "sim" : "nao" })
    : (ehLead ? { origem: "Cadastro manual", etapa: "novo" } : { ativo: "sim" });
  abrirJanela(`<div class="crm-janela__corpo">
    <h2>${registro ? "Editar" : "Novo"} ${ehLead ? "lead" : "corretor"}</h2>
    <form class="crm-form" data-form="${tipo}" data-id="${registro ? registro.id : ""}" novalidate>
      <div class="crm-grade-campos">${montarCampos(campos, valores)}</div>
      <p class="crm-erro oculto" role="alert"></p>
      <div class="crm-acoes">
        <button type="submit" class="botao botao--zap">Salvar</button>
        <button type="button" class="botao botao--detalhes" data-acao="cancelar-form">Cancelar</button>
      </div>
    </form></div>`);
}

function janelaMensagem(leadId, corretorId) {
  const l = leadPorId(leadId);
  const c = corretorPorId(corretorId);
  if (!l || !c) return;
  abrirJanela(`<div class="crm-janela__corpo">
    <button type="button" class="crm-voltar" data-acao="voltar-lead">← Voltar para o lead</button>
    <h2>Mensagem para ${escapar(c.nome)}</h2>
    <p class="crm-sub">Revise o texto. Ao clicar, o WhatsApp abre com a mensagem pronta para ${escapar(formatarTelefone(c.telefone))}; é só enviar.</p>
    <label class="crm-check"><input type="checkbox" id="msg-contato" checked> Incluir nome e telefone do cliente</label>
    <textarea id="msg-texto" rows="11" data-lead="${l.id}" data-corretor="${c.id}">${escapar(mensagemParaCorretor(l, c, true))}</textarea>
    <div class="crm-acoes">
      <a class="botao botao--whats" id="msg-enviar" href="${linkWhatsApp(c.telefone)}" target="_blank" rel="noopener" data-acao="enviar-msg">Abrir WhatsApp e enviar</a>
      <button type="button" class="botao botao--detalhes" data-acao="copiar-msg">Copiar texto</button>
    </div>
    <p class="crm-aviso-legal">Ao abrir o WhatsApp, o lead é atribuído a este corretor e o envio fica registrado no histórico.</p>
  </div>`);
}

/* ---------- Ações ---------- */
async function atribuir(leadId, corretorId, nota) {
  const l = leadPorId(leadId);
  const c = corretorPorId(corretorId);
  if (!l || !c) return;
  const mudanca = { corretor_id: corretorId };
  if (l.etapa === "novo") mudanca.etapa = "em_atendimento";
  if (!(await gravar(sb.from("leads").update(mudanca).eq("id", leadId)))) return;
  await gravar(sb.from("interacoes").insert({ lead_id: leadId, texto: nota || `Lead atribuído a ${c.nome}.`, autor: usuario?.email }));
  await carregar();
}

const ACOES = {
  "sair": async () => { await sb.auth.signOut(); usuario = null; fecharJanela(); mostrarTela("v-login"); },
  "copiar-link": async () => {
    const link = new URL("cadastro.html", location.href).href;
    try { await navigator.clipboard.writeText(link); aviso("Link copiado: " + link); }
    catch { prompt("Copie o link de cadastro:", link); }
  },
  "fechar": () => fecharJanela(),
  "abrir-lead": (b) => janelaLead(b.dataset.id),
  "abrir-corretor": (b) => janelaCorretor(b.dataset.id),
  "novo-lead": () => { aberto = null; janelaForm("lead"); },
  "novo-corretor": () => { aberto = null; janelaForm("corretor"); },
  "editar-lead": () => janelaForm("lead", leadPorId(aberto.id)),
  "editar-corretor": () => janelaForm("corretor", corretorPorId(aberto.id)),
  "cancelar-form": () => { if (aberto) reabrirJanela(); else fecharJanela(); },
  "voltar-lead": () => reabrirJanela(),
  "excluir-lead": async () => {
    const l = leadPorId(aberto.id);
    if (!confirm(`Excluir o lead "${l.nome}"? O histórico e os follow-ups dele também serão apagados.`)) return;
    if (await gravar(sb.from("leads").delete().eq("id", l.id))) { fecharJanela(); aviso("Lead excluído."); await carregar(); }
  },
  "excluir-corretor": async () => {
    const c = corretorPorId(aberto.id);
    if (!confirm(`Excluir o corretor "${c.nome}"? Os leads dele ficarão sem corretor.`)) return;
    if (await gravar(sb.from("corretores").delete().eq("id", c.id))) { fecharJanela(); aviso("Corretor excluído."); await carregar(); }
  },
  "atribuir": async (b) => { await atribuir(aberto.id, b.dataset.corretor); aviso("Corretor atribuído."); },
  "desatribuir": async () => {
    if (await gravar(sb.from("leads").update({ corretor_id: null }).eq("id", aberto.id))) {
      await gravar(sb.from("interacoes").insert({ lead_id: aberto.id, texto: "Corretor removido do lead.", autor: usuario?.email }));
      await carregar();
    }
  },
  "msg": (b) => janelaMensagem(aberto.id, b.dataset.corretor),
  "copiar-msg": async () => {
    try { await navigator.clipboard.writeText($("msg-texto").value); aviso("Texto copiado."); }
    catch { $("msg-texto").select(); aviso("Selecione e copie o texto manualmente.", true); }
  },
  "enviar-msg": async (link) => {
    // Sem preventDefault: o navegador abre o WhatsApp com o texto atual da caixa.
    const caixa = $("msg-texto");
    const c = corretorPorId(caixa.dataset.corretor);
    link.href = linkWhatsApp(c.telefone, caixa.value);
    await atribuir(caixa.dataset.lead, c.id, `Lead encaminhado para ${c.nome} pelo WhatsApp.`);
  },
  "excluir-tarefa": async (b) => {
    if (await gravar(sb.from("tarefas").delete().eq("id", b.dataset.id))) await carregar();
  },
};

document.addEventListener("click", (e) => {
  const alvo = e.target.closest("[data-acao]");
  if (!alvo || alvo.matches("select, input")) return;
  const acao = ACOES[alvo.dataset.acao];
  if (acao) acao(alvo, e);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.matches("tr[data-acao]")) e.target.click();
});

document.addEventListener("change", async (e) => {
  const t = e.target;
  if (t.dataset.acao === "mudar-etapa") {
    if (await gravar(sb.from("leads").update({ etapa: t.value }).eq("id", aberto.id))) {
      await gravar(sb.from("interacoes").insert({ lead_id: aberto.id, texto: `Etapa alterada para "${NOME_ETAPA[t.value]}".`, autor: usuario?.email }));
      await carregar();
    }
  } else if (t.dataset.acao === "concluir-tarefa") {
    if (await gravar(sb.from("tarefas").update({ concluida: t.checked }).eq("id", t.dataset.id))) await carregar();
  } else if (t.id === "filtro-etapa") {
    filtros.etapa = t.value; listaLeads();
  } else if (t.id === "msg-contato") {
    const caixa = $("msg-texto");
    caixa.value = mensagemParaCorretor(leadPorId(caixa.dataset.lead), corretorPorId(caixa.dataset.corretor), t.checked);
  }
});

document.addEventListener("input", (e) => {
  if (e.target.id === "busca-lead") { filtros.buscaLead = e.target.value; listaLeads(); }
  if (e.target.id === "busca-corretor") { filtros.buscaCorretor = e.target.value; listaCorretores(); }
});

document.addEventListener("submit", async (e) => {
  const f = e.target;
  const tipo = f.dataset.form;
  if (!tipo) return;
  e.preventDefault();

  if (tipo === "tarefa") {
    const dados = { lead_id: aberto.id, descricao: f.elements.descricao.value.trim(), vence_em: f.elements.vence_em.value };
    if (dados.descricao && dados.vence_em && await gravar(sb.from("tarefas").insert(dados))) await carregar();
    return;
  }
  if (tipo === "nota") {
    const texto = f.elements.texto.value.trim();
    if (texto && await gravar(sb.from("interacoes").insert({ lead_id: aberto.id, texto, autor: usuario?.email }))) await carregar();
    return;
  }

  // Formulário de lead ou corretor (novo ou edição)
  const campos = tipo === "lead" ? CAMPOS_LEAD_PAINEL : CAMPOS_CORRETOR_PAINEL;
  const caixaErro = f.querySelector(".crm-erro");
  caixaErro.classList.add("oculto");
  if (!f.checkValidity()) { f.reportValidity(); return; }
  const { dados, erro } = lerCampos(f, campos);
  if (erro) { caixaErro.textContent = erro; caixaErro.classList.remove("oculto"); return; }
  if (tipo === "corretor") dados.ativo = dados.ativo !== "nao";
  if (tipo === "lead" && !dados.origem) dados.origem = "Cadastro manual";

  const tabela = tipo === "lead" ? "leads" : "corretores";
  const id = f.dataset.id;
  const ok = await gravar(id ? sb.from(tabela).update(dados).eq("id", id) : sb.from(tabela).insert(dados));
  if (!ok) return;
  aviso("Salvo.");
  if (!id) fecharJanela();
  await carregar();
  if (id) reabrirJanela();
});

document.querySelectorAll(".crm-aba").forEach((b) => b.addEventListener("click", () => { aba = b.dataset.aba; desenhar(); }));
$("janela").addEventListener("close", () => { aberto = null; });
$("janela").addEventListener("click", (e) => { if (e.target === $("janela")) fecharJanela(); });

iniciar();
