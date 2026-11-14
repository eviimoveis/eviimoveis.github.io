/* ===== CRM EVI Imóveis - aba Tarefas =====
   Carregado antes do painel.js; usa D, sb, gravar, abrirJanela, fecharJanela, aviso etc.
   Usa a mesma tabela dos lembretes dos leads ("tarefas"): os lembretes de clientes aparecem aqui também. */

const LISTAS_PADRAO = ["Geral", "Ligações", "Visitas", "Pessoal"];
let listaAtual = "";            // "" = todas
let toastTimer = null;

const listasSalvas = () => { try { return JSON.parse(localStorage.getItem("crm-listas") || "[]"); } catch { return []; } };
const salvarListas = (l) => { try { localStorage.setItem("crm-listas", JSON.stringify(l)); } catch { /* sem armazenamento */ } };
/* Listas: as padrão, as criadas neste navegador e qualquer uma que já tenha tarefa. */
function todasListas() {
  const usadas = D.tarefas.map((t) => t.lista).filter(Boolean);
  const extras = [...new Set([...listasSalvas(), ...usadas])].filter((l) => !LISTAS_PADRAO.includes(l)).sort((a, b) => a.localeCompare(b, "pt-BR"));
  return [...LISTAS_PADRAO, ...extras];
}
const listaDe = (t) => t.lista || "Geral";
const amanhaISO = () => daquiADias(1);
function grupoDe(t) {
  if (!t.vence_em) return "sem";
  const h = hojeISO();
  if (t.vence_em < h) return "atrasadas";
  if (t.vence_em === h) return "hoje";
  if (t.vence_em === amanhaISO()) return "amanha";
  return "proximos";
}
const GRUPOS = [["atrasadas", "Atrasadas"], ["hoje", "Hoje"], ["amanha", "Amanhã"], ["proximos", "Próximos dias"], ["sem", "Sem data"]];
const tarefasPendentesHoje = () => D.tarefas.filter((t) => !t.concluida && t.vence_em && t.vence_em <= hojeISO()).length;

function erroBancoTarefas(error) {
  if (/lead_id|lista|vence_em|notas|hora|concluida_em|column/i.test(error?.message || ""))
    aviso("Para usar a aba Tarefas, rode no Supabase o SQL das tarefas (passo a passo no README).", true);
}
async function gravarTarefa(consulta) {
  const { error } = await consulta;
  if (error) { console.error(error); erroBancoTarefas(error); if (!/column|lead_id|vence_em/i.test(error.message || "")) aviso("Erro ao salvar: " + error.message, true); return false; }
  return true;
}

/* ---------- Aba ---------- */
function abaTarefas() {
  $("conteudo").innerHTML = `
    <form class="crm-nova-tarefa" data-form-nova-tarefa autocomplete="off">
      <span class="crm-nova-tarefa__mais" aria-hidden="true">+</span>
      <input name="descricao" placeholder="Adicionar tarefa…" maxlength="500" required aria-label="Nova tarefa">
      <div class="crm-nova-tarefa__opcoes">
        <select name="quando" aria-label="Quando">
          <option value="hoje">Hoje</option><option value="amanha">Amanhã</option><option value="data">Escolher data</option><option value="sem">Sem data</option>
        </select>
        <input type="date" name="data" aria-label="Data" hidden>
        <input type="time" name="hora" aria-label="Horário (opcional)">
        <select name="lista" aria-label="Lista">${todasListas().map((l) => `<option${l === (listaAtual || "Geral") ? " selected" : ""}>${escapar(l)}</option>`).join("")}</select>
        <button class="botao botao--zap">Adicionar</button>
      </div>
    </form>
    <div class="crm-listas" id="tar-listas"></div>
    <div id="tar-corpo"></div>`;
  listaTarefas();
  $("conteudo").querySelector("[name=descricao]").focus();
}

function listaTarefas() {
  if (!$("tar-corpo")) return;
  const pend = D.tarefas.filter((t) => !t.concluida);
  const conta = (l) => pend.filter((t) => !l || listaDe(t) === l).length;
  $("tar-listas").innerHTML = [["", "Todas"], ...todasListas().map((l) => [l, l])].map(([v, nome]) =>
    `<button type="button" class="crm-lista${listaAtual === v ? " ativa" : ""}" data-acao="tar-lista" data-lista="${escapar(v)}">${escapar(nome)} <span>${conta(v)}</span></button>`).join("") +
    `<button type="button" class="crm-lista crm-lista--nova" data-acao="tar-nova-lista">+ Nova lista</button>` +
    (listaAtual && listaAtual !== "Geral" ? `<span class="crm-lista__acoes">
      <button type="button" class="crm-link-texto" data-acao="tar-renomear-lista">Renomear</button>
      <button type="button" class="crm-link-texto crm-perigo-texto" data-acao="tar-excluir-lista">Excluir lista</button></span>` : "");

  const daLista = (t) => !listaAtual || listaDe(t) === listaAtual;
  const ordenar = (a, b) => (a.vence_em || "9999").localeCompare(b.vence_em || "9999") || (a.hora || "99").localeCompare(b.hora || "99") || (a.criado_em < b.criado_em ? -1 : 1);
  const abertas = pend.filter(daLista).sort(ordenar);
  const feitas = D.tarefas.filter((t) => t.concluida && daLista(t)).sort((a, b) => ((a.concluida_em || a.criado_em) < (b.concluida_em || b.criado_em) ? 1 : -1));
  const grupos = GRUPOS.map(([id, nome]) => [id, nome, abertas.filter((t) => grupoDe(t) === id)]).filter(([, , l]) => l.length);
  $("tar-corpo").innerHTML = (grupos.length ? grupos.map(([id, nome, lista]) => `
      <section class="crm-tar-grupo crm-tar-grupo--${id}">
        <h3>${nome} <span>${lista.length}</span></h3>
        <ul class="crm-tar-lista">${lista.map(itemTarefaAba).join("")}</ul>
      </section>`).join("")
    : `<p class="vazio">${D.tarefas.length ? "Nada pendente aqui. 🎉" : "Nenhuma tarefa ainda. Escreva a primeira no campo acima e aperte Enter."}</p>`) +
    (feitas.length ? `<details class="crm-tar-feitas">
        <summary>Concluídas (${feitas.length})</summary>
        <button type="button" class="botao crm-perigo" data-acao="tar-limpar">Excluir todas as concluídas</button>
        <ul class="crm-tar-lista">${feitas.map(itemTarefaAba).join("")}</ul>
      </details>` : "");
}

function itemTarefaAba(t) {
  const l = t.lead_id ? leadPorId(t.lead_id) : null;
  const g = grupoDe(t);
  const quando = !t.vence_em ? "" : g === "hoje" ? "Hoje" : g === "amanha" ? "Amanhã" : dataBR(t.vence_em);
  const meta = [
    !t.concluida && g !== "hoje" && quando && `<span class="${g === "atrasadas" ? "crm-tar-atraso" : ""}">${escapar(quando)}</span>`,
    t.hora && `<span>🕑 ${escapar(String(t.hora).slice(0, 5))}</span>`,
    !listaAtual && `<span class="crm-tar-etiqueta">${escapar(listaDe(t))}</span>`,
    l && `<button type="button" class="crm-link-texto" data-acao="abrir-lead" data-id="${l.id}">👤 ${escapar(l.nome)}</button>`,
  ].filter(Boolean).join("");
  return `<li class="crm-tar${t.concluida ? " feita" : ""}">
    <button type="button" class="crm-tar__check" data-acao="tar-check" data-id="${t.id}" aria-label="${t.concluida ? "Desmarcar" : "Concluir"}: ${escapar(t.descricao)}"></button>
    <div class="crm-tar__texto" data-acao="tar-editar" data-id="${t.id}" role="button" tabindex="0">
      <strong>${escapar(t.descricao)}</strong>
      ${t.notas ? `<small class="crm-tar__notas">${escapar(t.notas)}</small>` : ""}
      ${meta ? `<div class="crm-tar__meta">${meta}</div>` : ""}
    </div>
    <button type="button" class="crm-x" data-acao="tar-excluir" data-id="${t.id}" aria-label="Excluir tarefa">×</button>
  </li>`;
}

/* ---------- Aviso com "Desfazer" ---------- */
function toastDesfazer(texto, desfazer) {
  let el = $("tar-toast");
  if (!el) { el = document.createElement("div"); el.id = "tar-toast"; el.className = "crm-toast crm-toast--acao"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.innerHTML = `<span></span><button type="button">Desfazer</button>`;
  el.querySelector("span").textContent = texto;
  el.querySelector("button").onclick = () => { el.classList.remove("visivel"); desfazer(); };
  el.classList.add("visivel");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visivel"), 6000);
}

/* ---------- Editar ---------- */
function janelaEditarTarefa(id) {
  const t = D.tarefas.find((x) => x.id === id);
  if (!t) return;
  const leads = D.leads.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  abrirJanela(`<div class="crm-janela__corpo">
    <h2>Editar tarefa</h2>
    <form class="crm-form" data-form-editar-tarefa="${t.id}">
      <div class="crm-grade-campos">
        <label class="crm-campo crm-campo--largo"><span>Tarefa</span><input name="descricao" required maxlength="500" value="${escapar(t.descricao)}"></label>
        <label class="crm-campo crm-campo--largo"><span>Observação</span><textarea name="notas" rows="3" maxlength="2000">${escapar(t.notas || "")}</textarea></label>
        <label class="crm-campo"><span>Data</span><input type="date" name="vence_em" value="${escapar(t.vence_em || "")}"></label>
        <label class="crm-campo"><span>Horário</span><input type="time" name="hora" value="${escapar(t.hora ? String(t.hora).slice(0, 5) : "")}"></label>
        <label class="crm-campo"><span>Lista</span><select name="lista">${todasListas().map((l) => `<option${l === listaDe(t) ? " selected" : ""}>${escapar(l)}</option>`).join("")}</select></label>
        <label class="crm-campo"><span>Cliente (opcional)</span><select name="lead_id"><option value="">Nenhum</option>${leads.map((l) => `<option value="${l.id}"${l.id === t.lead_id ? " selected" : ""}>${escapar(l.nome)}</option>`).join("")}</select></label>
      </div>
      <div class="crm-acoes">
        <button class="botao botao--zap">Salvar</button>
        <button type="button" class="botao botao--detalhes" data-acao="fechar">Cancelar</button>
        <button type="button" class="botao crm-perigo" data-acao="tar-excluir" data-id="${t.id}">Excluir</button>
      </div>
    </form></div>`);
}

/* ---------- Ações ---------- */
async function concluir(t, feita) {
  const mudanca = { concluida: feita, concluida_em: feita ? new Date().toISOString() : null };
  if (!(await gravarTarefa(sb.from("tarefas").update(mudanca).eq("id", t.id)))) return false;
  Object.assign(t, mudanca);
  desenharDepoisDeTarefa();
  return true;
}
function desenharDepoisDeTarefa() {
  if (aba === "tarefas") listaTarefas(); else desenhar();
  atualizarContadorTarefas();
  if (aberto?.tipo === "lead") reabrirJanela();
}
function atualizarContadorTarefas() {
  const n = tarefasPendentesHoje();
  const el = $("n-tarefas");
  if (el) { el.textContent = n || ""; el.classList.toggle("crm-aba__n--alerta", D.tarefas.some((t) => !t.concluida && t.vence_em && t.vence_em < hojeISO())); }
}

const TAREFA_ACOES = {
  "tar-check": async (b) => {
    const t = D.tarefas.find((x) => x.id === b.dataset.id);
    if (!t) return;
    const feita = !t.concluida;
    if (await concluir(t, feita) && feita) toastDesfazer("Tarefa concluída.", () => concluir(t, false));
  },
  "tar-editar": (b) => janelaEditarTarefa(b.dataset.id),
  "tar-excluir": async (b) => {
    const t = D.tarefas.find((x) => x.id === b.dataset.id);
    if (!t) return;
    if (!(await gravarTarefa(sb.from("tarefas").delete().eq("id", t.id)))) return;
    D.tarefas = D.tarefas.filter((x) => x.id !== t.id);
    if ($("janela").open && document.querySelector("[data-form-editar-tarefa]")) fecharJanela();
    desenharDepoisDeTarefa();
    toastDesfazer("Tarefa excluída.", async () => {
      const { concluida_em, ...resto } = t;
      if (await gravarTarefa(sb.from("tarefas").insert({ ...resto, concluida_em }))) { D.tarefas.push(t); desenharDepoisDeTarefa(); }
    });
  },
  "tar-limpar": async () => {
    const feitas = D.tarefas.filter((t) => t.concluida && (!listaAtual || listaDe(t) === listaAtual));
    if (!feitas.length || !confirm(`Excluir ${feitas.length} tarefa(s) concluída(s)${listaAtual ? ` da lista "${listaAtual}"` : ""}? Não dá para desfazer.`)) return;
    if (!(await gravarTarefa(sb.from("tarefas").delete().in("id", feitas.map((t) => t.id))))) return;
    const ids = new Set(feitas.map((t) => t.id));
    D.tarefas = D.tarefas.filter((t) => !ids.has(t.id));
    aviso(`${feitas.length} tarefa(s) concluída(s) excluída(s).`);
    desenharDepoisDeTarefa();
  },
  "tar-lista": (b) => {
    listaAtual = b.dataset.lista;
    listaTarefas();
    const sel = document.querySelector("[data-form-nova-tarefa] [name=lista]");
    if (sel) sel.value = listaAtual || "Geral";
  },
  "tar-nova-lista": () => {
    const nome = (prompt("Nome da nova lista:") || "").trim().slice(0, 40);
    if (!nome) return;
    if (!todasListas().some((l) => semAcento(l) === semAcento(nome))) salvarListas([...listasSalvas(), nome]);
    listaAtual = todasListas().find((l) => semAcento(l) === semAcento(nome)) || nome;
    abaTarefas();
  },
  "tar-renomear-lista": async () => {
    const antigo = listaAtual;
    const novo = (prompt(`Novo nome para a lista "${antigo}":`, antigo) || "").trim().slice(0, 40);
    if (!novo || novo === antigo) return;
    const ids = D.tarefas.filter((t) => listaDe(t) === antigo).map((t) => t.id);
    if (ids.length && !(await gravarTarefa(sb.from("tarefas").update({ lista: novo }).in("id", ids)))) return;
    D.tarefas.forEach((t) => { if (listaDe(t) === antigo) t.lista = novo; });
    salvarListas([...listasSalvas().filter((l) => l !== antigo), ...(LISTAS_PADRAO.includes(novo) ? [] : [novo])]);
    listaAtual = novo;
    abaTarefas();
  },
  "tar-excluir-lista": async () => {
    const nome = listaAtual;
    const ids = D.tarefas.filter((t) => listaDe(t) === nome).map((t) => t.id);
    if (!confirm(`Excluir a lista "${nome}"?${ids.length ? ` As ${ids.length} tarefa(s) dela vão para "Geral".` : ""}`)) return;
    if (ids.length && !(await gravarTarefa(sb.from("tarefas").update({ lista: "Geral" }).in("id", ids)))) return;
    D.tarefas.forEach((t) => { if (listaDe(t) === nome) t.lista = "Geral"; });
    salvarListas(listasSalvas().filter((l) => l !== nome));
    listaAtual = "";
    abaTarefas();
  },
};

document.addEventListener("submit", async (e) => {
  const f = e.target;
  if (f.matches?.("[data-form-nova-tarefa]")) {
    e.preventDefault();
    const descricao = f.elements.descricao.value.trim();
    if (!descricao) return;
    const quando = f.elements.quando.value;
    const vence = quando === "hoje" ? hojeISO() : quando === "amanha" ? amanhaISO() : quando === "data" ? (f.elements.data.value || null) : null;
    const nova = { id: crypto.randomUUID(), criado_em: new Date().toISOString(), descricao, vence_em: vence, hora: f.elements.hora.value || null,
      lista: f.elements.lista.value || "Geral", concluida: false, lead_id: null, notas: null, concluida_em: null };
    const { criado_em, ...paraBanco } = nova;
    if (!(await gravarTarefa(sb.from("tarefas").insert(paraBanco)))) return;
    D.tarefas.push(nova);
    f.elements.descricao.value = ""; f.elements.hora.value = "";
    listaTarefas(); atualizarContadorTarefas();
    f.elements.descricao.focus();
    return;
  }
  if (f.dataset?.formEditarTarefa) {
    e.preventDefault();
    const t = D.tarefas.find((x) => x.id === f.dataset.formEditarTarefa);
    const dados = {
      descricao: f.elements.descricao.value.trim().slice(0, 500), notas: f.elements.notas.value.trim().slice(0, 2000) || null,
      vence_em: f.elements.vence_em.value || null, hora: f.elements.hora.value || null,
      lista: f.elements.lista.value || "Geral", lead_id: f.elements.lead_id.value || null,
    };
    if (!dados.descricao) return;
    if (!(await gravarTarefa(sb.from("tarefas").update(dados).eq("id", t.id)))) return;
    Object.assign(t, dados);
    fecharJanela(); aviso("Tarefa salva.");
    desenharDepoisDeTarefa();
  }
});
document.addEventListener("change", (e) => {
  const f = e.target.closest?.("[data-form-nova-tarefa]");
  if (f && e.target.name === "quando") { f.elements.data.hidden = e.target.value !== "data"; if (e.target.value === "data") { f.elements.data.value ||= amanhaISO(); f.elements.data.focus(); } }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.matches?.(".crm-tar__texto")) { e.preventDefault(); e.target.click(); }
});
