/* ===== CRM EVI Imóveis - aba Anúncios =====
   Carregado antes do painel.js; usa D, sb, gravar, carregar, abrirJanela, fecharJanela, aviso etc.
   Cria a página pública anuncio.html?id=... a partir dos dados salvos na tabela "anuncios". */

let anunciosAtivo = false;           // false enquanto o banco não tiver a tabela "anuncios"
let limpezaFeita = false;            // limpeza de fotos de anúncios vencidos: uma vez por sessão
let ed = null;                       // anúncio aberto no editor
const WHATS_PADRAO_ANUNCIO = "5511911297820";
const LIMITE_STORAGE = 1024 * 1024 * 1024;   // 1 GB do plano grátis
const FOTO_GRANDE = 1600, FOTO_MINI = 480;
const DIAS_PARA_APAGAR_FOTOS = 30;
const MAX_FOTOS = 60;
const JSZIP = { src: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js", sri: "sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG" };

const urlPublicaFoto = (caminho) => `${CRM_CONFIG.SUPABASE_URL}/storage/v1/object/public/anuncios/${String(caminho).split("/").map(encodeURIComponent).join("/")}`;
const linkAnuncio = (id) => new URL(`anuncio.html?id=${id}`, location.href).href;
const anuncioPorId = (id) => (D.anuncios || []).find((a) => a.id === id);
const bytesTexto = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const diasAte = (iso) => Math.round((new Date(iso + "T12:00:00") - new Date(hojeISO() + "T12:00:00")) / 864e5);
function somarPeriodo(isoBase, periodo) {
  const d = new Date(isoBase + "T12:00:00");
  if (periodo === "7d") d.setDate(d.getDate() + 7);
  if (periodo === "1m") d.setMonth(d.getMonth() + 1);
  if (periodo === "3m") d.setMonth(d.getMonth() + 3);
  return isoLocal(d);
}
function situacao(a) {
  if (a.status === "Pausado") return { texto: "Pausado", classe: "pausado" };
  const d = diasAte(a.expira_em);
  if (d < 0) return { texto: "Vencido", classe: "perdido" };
  return { texto: d === 0 ? "Vence hoje" : d <= 7 ? `Vence em ${d} dia(s)` : "Ativo", classe: d <= 7 ? "novo" : "ativo" };
}

/* ---------- Aba ---------- */
function abaAnuncios() {
  if (!anunciosAtivo) {
    $("conteudo").innerHTML = `<p class="crm-aviso-banco">Para usar os anúncios, rode no Supabase o SQL da tabela <code>anuncios</code> e do bucket de fotos (passo a passo no README).</p>`;
    return;
  }
  const usado = (D.anuncios || []).reduce((s, a) => s + (a.fotos || []).reduce((t, f) => t + (Number(f.b) || 0), 0), 0);
  const pct = Math.min(100, (usado / LIMITE_STORAGE) * 100);
  $("conteudo").innerHTML = `
    <div class="crm-barra">
      <div class="crm-espaco" title="Espaço das fotos no plano grátis do Supabase">
        <span>Fotos: <b>${bytesTexto(usado)}</b> de 1 GB</span>
        <div class="crm-espaco__trilho"><div style="width:${pct.toFixed(1)}%" class="${pct > 80 ? "alerta" : ""}"></div></div>
      </div>
      <button class="botao botao--zap" data-acao="an-novo">+ Criar anúncio</button>
    </div>
    <div id="lista"></div>`;
  listaAnuncios();
  if (!limpezaFeita) { limpezaFeita = true; limparFotosVencidas(); }
}

function listaAnuncios() {
  const itens = (D.anuncios || []).slice().sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1));
  if (!itens.length) { $("lista").innerHTML = '<p class="vazio">Nenhum anúncio ainda. Clique em “+ Criar anúncio”.</p>'; return; }
  $("lista").innerHTML = `<div class="crm-tabela-wrap"><table class="crm-tabela">
    <thead><tr><th>Anúncio</th><th>Valor</th><th>Validade</th><th>Fotos</th><th class="crm-col-mais"><span class="crm-so-leitor">Ações</span></th></tr></thead>
    <tbody>${itens.map((a) => {
      const s = situacao(a);
      const capa = (a.fotos || [])[0];
      return `<tr data-acao="an-editar" data-id="${a.id}" tabindex="0">
        <td><div class="crm-an-linha">${capa ? `<img src="${escapar(urlPublicaFoto(capa.t || capa.f))}" alt="" loading="lazy">` : '<span class="crm-an-semfoto"></span>'}
          <div><strong>${escapar(a.titulo)}</strong><small>${escapar([a.tipo, a.bairro].filter(Boolean).join(" · "))}</small></div></div></td>
        <td>${a.valor ? escapar(reais(a.valor)) : "—"}<small>${escapar(a.operacao)}</small></td>
        <td>${selo(s.texto).replace(/crm-selo--[\w-]+/, "crm-selo--" + s.classe)}<small>até ${dataBR(a.expira_em)}</small></td>
        <td>${(a.fotos || []).length}</td>
        <td class="crm-col-mais"><button type="button" class="crm-mais" data-acao="an-menu" data-id="${a.id}" aria-haspopup="menu" aria-label="Mais opções para ${escapar(a.titulo)}">⋮</button></td>
      </tr>`;
    }).join("")}</tbody></table></div>`;
}

/* Fotos de anúncios vencidos há mais de 30 dias saem do Storage (o anúncio continua na lista). */
async function limparFotosVencidas() {
  const velhos = (D.anuncios || []).filter((a) => (a.fotos || []).length && diasAte(a.expira_em) < -DIAS_PARA_APAGAR_FOTOS);
  let total = 0;
  for (const a of velhos) {
    const caminhos = a.fotos.flatMap((f) => [f.f, f.t]).filter(Boolean);
    const { error } = await sb.storage.from("anuncios").remove(caminhos);
    if (error) { console.error(error); continue; }
    if (await gravar(sb.from("anuncios").update({ fotos: [] }).eq("id", a.id))) total += caminhos.length;
  }
  if (total) { aviso(`Fotos de ${velhos.length} anúncio(s) vencido(s) há mais de ${DIAS_PARA_APAGAR_FOTOS} dias foram apagadas para liberar espaço.`); await carregar(); }
}

/* ---------- Menu ⋮ ---------- */
function abrirMenuAnuncio(botao) {
  const m = $("menu-linha");
  const id = botao.dataset.id;
  if (!m.hidden && m.dataset.id === id) { m.hidden = true; return; }
  const a = anuncioPorId(id);
  const dados = `data-id="${id}" role="menuitem"`;
  m.dataset.id = id;
  m.innerHTML = `
    <button ${dados} data-acao="an-copiar">Copiar link</button>
    <button ${dados} data-acao="an-abrir-pagina">Abrir a página</button>
    <button ${dados} data-acao="an-editar">Editar</button>
    <button ${dados} data-acao="an-prorrogar">Prorrogar validade</button>
    <button ${dados} data-acao="an-pausar">${a?.status === "Pausado" ? "Reativar" : "Pausar"}</button>
    <button ${dados} data-acao="an-excluir" class="crm-menu-linha__perigo">Excluir</button>`;
  m.hidden = false;
  const r = botao.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(r.right - m.offsetWidth, innerWidth - m.offsetWidth - 8)) + "px";
  m.style.top = (r.bottom + m.offsetHeight + 8 < innerHeight ? r.bottom + 4 : Math.max(8, r.top - m.offsetHeight - 4)) + "px";
  m.querySelector("button").focus();
}

async function copiarTexto(texto, msg) {
  try { await navigator.clipboard.writeText(texto); aviso(msg); }
  catch { prompt("Copie o link:", texto); }
}

function janelaProrrogar(id) {
  const a = anuncioPorId(id);
  if (!a) return;
  const base = a.expira_em > hojeISO() ? a.expira_em : hojeISO();
  abrirJanela(`<div class="crm-janela__corpo">
    <h2>Prorrogar validade</h2>
    <p class="crm-sub">${escapar(a.titulo)} · hoje vale até <b>${dataBR(a.expira_em)}</b>.</p>
    <form data-form-prorrogar="${id}" class="crm-form">
      <div class="crm-validade">${[["7d", "+1 semana"], ["1m", "+1 mês"], ["3m", "+3 meses"]].map(([v, t], i) =>
        `<label class="crm-chip"><input type="radio" name="periodo" value="${v}"${i === 1 ? " checked" : ""}><span>${t} <small>(até ${dataBR(somarPeriodo(base, v))})</small></span></label>`).join("")}
        <label class="crm-chip"><input type="radio" name="periodo" value="data"><span>Outra data</span></label>
        <input type="date" name="data" min="${hojeISO()}" aria-label="Nova data de validade">
      </div>
      <div class="crm-acoes"><button class="botao botao--zap">Salvar</button><button type="button" class="botao botao--detalhes" data-acao="fechar">Cancelar</button></div>
    </form></div>`);
}

/* ---------- Editor ---------- */
const CAMPOS_NUM = ["valor", "condominio", "iptu", "outros_custos", "area", "dormitorios", "suites", "banheiros", "vagas"];

function abrirEditor(id) {
  const a = id ? anuncioPorId(id) : null;
  ed = {
    id: a ? a.id : crypto.randomUUID(),
    novo: !a,
    salvo: false,
    fotos: a ? (a.fotos || []).map((f) => ({ ...f })) : [],
    destaques: a ? [...(a.destaques || [])] : [],
    removidas: [],          // fotos já salvas que você tirou (apagadas ao salvar)
    enviadasAgora: [],      // fotos enviadas nesta edição (apagadas se você cancelar)
    linkOrigem: a?.link_origem || "",
  };
  const v = a || { operacao: "Locação", cidade: "São Paulo", whatsapp: WHATS_PADRAO_ANUNCIO, status: "Ativo" };
  const campo = (nome, rotulo, extra = "", valor = v[nome]) =>
    `<label class="crm-campo"><span>${rotulo}</span><input name="${nome}" value="${escapar(valor ?? "")}" ${extra}></label>`;
  const num = (nome, rotulo, dinheiro) => campo(nome, rotulo, `inputmode="${dinheiro ? "decimal" : "numeric"}" autocomplete="off"`,
    v[nome] == null ? "" : dinheiro ? Number(v[nome]).toLocaleString("pt-BR") : v[nome]);
  aberto = { tipo: "anuncio", id: ed.id };
  abrirJanela(`<div class="crm-janela__corpo crm-editor-anuncio">
    <h2>${a ? "Editar anúncio" : "Criar anúncio"}</h2>

    ${a ? "" : `<section class="crm-extrair">
      <h3>1. Puxar os dados de um anúncio</h3>
      <div class="crm-linha-form">
        <input type="url" id="an-url" placeholder="Cole o link do anúncio (https://...)" autocomplete="off">
        <button type="button" class="botao botao--zap" data-acao="an-extrair-link">Extrair</button>
      </div>
      <details><summary>O link não funcionou? Cole o texto do anúncio</summary>
        <textarea id="an-texto" rows="5" placeholder="Copie todo o texto da página do anúncio e cole aqui"></textarea>
        <button type="button" class="botao botao--detalhes" data-acao="an-extrair-texto">Extrair do texto</button>
      </details>
      <p class="crm-aviso-legal" id="an-status" role="status"></p>
    </section>`}

    <form data-form-anuncio novalidate class="crm-form">
      <h3>${a ? "Dados do imóvel" : "2. Confira e ajuste os dados"}</h3>
      <div class="crm-grade-campos">
        <label class="crm-campo crm-campo--largo"><span>Título <span class="crm-obrig">*</span></span><input name="titulo" required maxlength="160" value="${escapar(v.titulo || "")}"></label>
        <label class="crm-campo"><span>Operação</span><select name="operacao">${htmlOpcoes(["Locação", "Venda"], v.operacao)}</select></label>
        ${campo("tipo", "Tipo de imóvel", 'list="an-tipos" maxlength="60"')}
        ${campo("bairro", "Bairro", 'list="an-bairros" maxlength="80"')}
        ${campo("cidade", "Cidade", 'maxlength="80"')}
        ${num("valor", "Aluguel / valor (R$)", true)}
        ${num("condominio", "Condomínio (R$)", true)}
        ${num("iptu", "IPTU (R$/mês)", true)}
        ${num("outros_custos", "Outros (seguro etc.)", true)}
        <div class="crm-campo crm-total"><span>Total</span><b id="an-total">—</b></div>
        ${num("area", "Metragem (m²)")}
        ${num("dormitorios", "Dormitórios")}
        ${num("suites", "Suítes")}
        ${num("banheiros", "Banheiros")}
        ${num("vagas", "Vagas")}
        <label class="crm-campo crm-campo--largo"><span>Localização (rua, referência – opcional)</span><input name="localizacao" maxlength="300" value="${escapar(v.localizacao || "")}"></label>
        <label class="crm-campo crm-campo--largo"><span>Descrição</span><textarea name="descricao" rows="6" maxlength="6000">${escapar(v.descricao || "")}</textarea></label>
        <fieldset class="crm-campo crm-campo--largo"><legend>Destaques</legend>
          <div class="crm-etiquetas" id="an-destaques"></div>
          <input id="an-novo-destaque" placeholder="Digite um destaque e aperte Enter (ex.: Varanda gourmet)" maxlength="40">
        </fieldset>
      </div>
      <datalist id="an-bairros">${TODOS_BAIRROS.map((b) => `<option value="${escapar(b)}">`).join("")}</datalist>
      <datalist id="an-tipos">${["Apartamento", "Casa", "Sobrado", "Cobertura", "Studio", "Terreno", "Loja", "Sala comercial", "Galpão", "Prédio"].map((t) => `<option value="${t}">`).join("")}</datalist>

      <h3>${a ? "Fotos" : "3. Fotos"}</h3>
      <label class="crm-upload" id="an-upload">
        <input type="file" id="an-arquivos" accept="image/jpeg,image/png,image/webp,.zip,application/zip" multiple>
        <span><b>Escolher fotos ou um arquivo .zip</b><br><small>Ou arraste para cá. As fotos são reduzidas antes de enviar.</small></span>
      </label>
      <p class="crm-aviso-legal" id="an-progresso" role="status"></p>
      <ul class="crm-fotos" id="an-fotos"></ul>

      <h3>${a ? "Validade e contato" : "4. Validade e contato"}</h3>
      <div class="crm-validade">
        ${a ? `<label class="crm-chip"><input type="radio" name="periodo" value="manter" checked><span>Manter (até ${dataBR(a.expira_em)})</span></label>` : ""}
        ${[["7d", "1 semana"], ["1m", "1 mês"], ["3m", "3 meses"]].map(([p, t]) =>
          `<label class="crm-chip"><input type="radio" name="periodo" value="${p}"${!a && p === "1m" ? " checked" : ""}><span>${t}</span></label>`).join("")}
        <label class="crm-chip"><input type="radio" name="periodo" value="data"><span>Escolher data</span></label>
        <input type="date" name="data" min="${hojeISO()}" value="${a ? a.expira_em : ""}" aria-label="Data de validade">
      </div>
      <div class="crm-grade-campos">
        ${campo("whatsapp", "WhatsApp do botão “Entrar em contato”", 'inputmode="tel" maxlength="20"')}
        <label class="crm-campo crm-campo--largo"><span>Observação interna (não aparece na página)</span><textarea name="observacao_interna" rows="2" maxlength="2000">${escapar(v.observacao_interna || "")}</textarea></label>
      </div>
      <p class="crm-erro oculto" role="alert"></p>
      <div class="crm-acoes">
        <button type="submit" class="botao botao--zap">${a ? "Salvar alterações" : "Gerar página"}</button>
        <button type="button" class="botao botao--detalhes" data-acao="an-cancelar">Cancelar</button>
      </div>
    </form>
  </div>`);
  desenharDestaques(); desenharFotos(); atualizarTotal();
}

const formAnuncio = () => document.querySelector("[data-form-anuncio]");
function atualizarTotal() {
  const f = formAnuncio(); if (!f) return;
  const n = (k) => numeroBR(f.elements[k].value) || 0;
  const venda = f.elements.operacao.value === "Venda";
  const mensal = (venda ? 0 : n("valor")) + n("condominio") + n("iptu") + n("outros_custos");
  $("an-total").textContent = mensal ? `${reais(mensal)}${venda ? " /mês em taxas" : " /mês"}` : "—";
}
function desenharDestaques() {
  $("an-destaques").innerHTML = ed.destaques.map((d, i) =>
    `<span class="crm-etiqueta">${escapar(d)}<button type="button" data-acao="an-tirar-destaque" data-i="${i}" aria-label="Remover ${escapar(d)}">×</button></span>`).join("");
}
function desenharFotos() {
  $("an-fotos").innerHTML = ed.fotos.map((f, i) => `<li class="crm-foto" draggable="true" data-i="${i}">
      <img src="${escapar(f.previa || urlPublicaFoto(f.t || f.f))}" alt="">
      ${i === 0 ? '<span class="crm-foto__capa">★ Principal</span>' : `<button type="button" class="crm-foto__principal" data-acao="an-principal" data-i="${i}" title="Usar como foto principal">☆</button>`}
      <input data-legenda="${i}" placeholder="Legenda (ex.: Sala)" maxlength="60" value="${escapar(f.legenda || "")}">
      <div class="crm-foto__acoes">
        <button type="button" data-acao="an-mover" data-i="${i}" data-d="-1" aria-label="Mover para a esquerda"${i === 0 ? " disabled" : ""}>←</button>
        <button type="button" data-acao="an-mover" data-i="${i}" data-d="1" aria-label="Mover para a direita"${i === ed.fotos.length - 1 ? " disabled" : ""}>→</button>
        <button type="button" data-acao="an-tirar-foto" data-i="${i}" aria-label="Remover foto" class="crm-foto__x">×</button>
      </div></li>`).join("");
}

/* ---------- Extração ---------- */
function preencherComExtracao(r, origem) {
  const f = formAnuncio();
  let n = 0;
  for (const [k, v] of Object.entries(r)) {
    if (k === "destaques" || v == null || v === "" || !f.elements[k]) continue;
    f.elements[k].value = CAMPOS_NUM.includes(k) && ["valor", "condominio", "iptu", "outros_custos"].includes(k) ? Number(v).toLocaleString("pt-BR") : v;
    n++;
  }
  for (const d of r.destaques || []) if (!ed.destaques.includes(d)) { ed.destaques.push(d); n++; }
  desenharDestaques(); atualizarTotal();
  $("an-status").textContent = n ? `${n} informação(ões) preenchida(s) a partir do ${origem}. Confira tudo antes de gerar a página.`
    : `Não encontrei dados no ${origem}. Cole o texto do anúncio na caixa abaixo ou preencha à mão.`;
}

async function extrairDoLink() {
  const url = $("an-url").value.trim();
  if (!/^https?:\/\//i.test(url)) { $("an-status").textContent = "Cole um link que comece com https://"; return; }
  $("an-status").textContent = "Buscando o anúncio…";
  const { data, error } = await sb.functions.invoke("extrair-anuncio", { body: { url } });
  if (error) {
    let msg = "Não foi possível buscar o link.";
    try { const corpo = await error.context?.json?.(); if (corpo?.erro) msg = corpo.erro; } catch { /* sem corpo */ }
    if (/Failed to send|fetch/i.test(error.message || "") && msg === "Não foi possível buscar o link.") msg = "A função de extrair ainda não foi publicada no Supabase.";
    $("an-status").textContent = msg + " Você pode colar o texto do anúncio na caixa abaixo.";
    document.querySelector(".crm-extrair details").open = true;
    return;
  }
  ed.linkOrigem = data.url || url;
  preencherComExtracao(extrairAnuncio(data), "link");
}

/* ---------- Fotos: reduzir, zip, enviar ---------- */
function carregarJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  return new Promise((ok, falha) => {
    const s = document.createElement("script");
    s.src = JSZIP.src; s.integrity = JSZIP.sri; s.crossOrigin = "anonymous";
    s.onload = () => ok(window.JSZip); s.onerror = () => falha(new Error("Não foi possível abrir o leitor de .zip."));
    document.head.appendChild(s);
  });
}
async function imagensDoZip(arquivo) {
  const JSZip = await carregarJSZip();
  const zip = await JSZip.loadAsync(arquivo);
  const entradas = Object.values(zip.files)
    .filter((e) => !e.dir && /\.(jpe?g|png|webp)$/i.test(e.name) && !/(^|\/)(__MACOSX|\.)/.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));
  const tipo = (n) => (/\.png$/i.test(n) ? "image/png" : /\.webp$/i.test(n) ? "image/webp" : "image/jpeg");
  return Promise.all(entradas.map(async (e) => new File([await e.async("blob")], e.name.split("/").pop(), { type: tipo(e.name) })));
}
async function reduzir(arquivo, lado, qualidade) {
  let img;
  try { img = await createImageBitmap(arquivo, { imageOrientation: "from-image" }); }
  catch {
    img = await new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = falha; i.src = URL.createObjectURL(arquivo); });
  }
  const escala = Math.min(1, lado / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob(ok, "image/jpeg", qualidade));
}
async function adicionarArquivos(lista) {
  const prog = $("an-progresso");
  let arquivos = [];
  try {
    for (const a of lista) {
      if (/\.zip$/i.test(a.name) || a.type === "application/zip" || a.type === "application/x-zip-compressed") { prog.textContent = "Abrindo o .zip…"; arquivos.push(...await imagensDoZip(a)); }
      else if (/^image\/(jpeg|png|webp)$/.test(a.type)) arquivos.push(a);
    }
  } catch (e) { prog.textContent = e.message || "Não foi possível abrir o arquivo."; return; }
  const vagas = MAX_FOTOS - ed.fotos.length;
  if (arquivos.length > vagas) { aviso(`No máximo ${MAX_FOTOS} fotos por anúncio. ${arquivos.length - vagas} foto(s) ficaram de fora.`, true); arquivos = arquivos.slice(0, vagas); }
  if (!arquivos.length) { prog.textContent = "Nenhuma foto encontrada (aceita JPG, PNG, WEBP ou .zip com essas fotos)."; return; }
  let feitas = 0, falhas = 0;
  for (const arq of arquivos) {
    prog.textContent = `Enviando foto ${feitas + falhas + 1} de ${arquivos.length}…`;
    try {
      const [grande, mini] = await Promise.all([reduzir(arq, FOTO_GRANDE, 0.8), reduzir(arq, FOTO_MINI, 0.7)]);
      const nome = `${ed.id}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
      const opc = { contentType: "image/jpeg", cacheControl: "31536000", upsert: false };
      const r1 = await sb.storage.from("anuncios").upload(nome + "-f.jpg", grande, opc);
      if (r1.error) throw r1.error;
      const r2 = await sb.storage.from("anuncios").upload(nome + "-t.jpg", mini, opc);
      if (r2.error) { await sb.storage.from("anuncios").remove([nome + "-f.jpg"]); throw r2.error; }
      ed.enviadasAgora.push(nome + "-f.jpg", nome + "-t.jpg");
      ed.fotos.push({ f: nome + "-f.jpg", t: nome + "-t.jpg", legenda: "", b: grande.size + mini.size, previa: URL.createObjectURL(mini) });
      feitas++;
      desenharFotos();
    } catch (e) { console.error(e); falhas++; }
  }
  prog.textContent = `${feitas} foto(s) enviada(s)${falhas ? `, ${falhas} com erro` : ""}. Arraste para mudar a ordem; a primeira é a principal.`;
}

/* ---------- Salvar ---------- */
async function salvarAnuncio(f) {
  const caixaErro = f.querySelector(".crm-erro");
  caixaErro.classList.add("oculto");
  const erro = (m) => { caixaErro.textContent = m; caixaErro.classList.remove("oculto"); caixaErro.scrollIntoView({ block: "nearest" }); };
  const titulo = f.elements.titulo.value.trim();
  if (titulo.length < 3) return erro("Informe um título para o anúncio.");
  const a = anuncioPorId(ed.id);
  const periodo = f.elements.periodo.value;
  let expira = a?.expira_em;
  if (periodo === "data") { expira = f.elements.data.value; if (!expira || expira < hojeISO()) return erro("Escolha uma data de validade a partir de hoje."); }
  else if (periodo !== "manter") expira = somarPeriodo(hojeISO(), periodo);
  const texto = (k, max) => (f.elements[k].value.trim().slice(0, max) || null);
  const dados = {
    titulo, operacao: f.elements.operacao.value, expira_em: expira,
    tipo: texto("tipo", 60), bairro: texto("bairro", 80), cidade: texto("cidade", 80), localizacao: texto("localizacao", 300),
    descricao: texto("descricao", 6000), whatsapp: soDigitos(f.elements.whatsapp.value).slice(0, 20) || null,
    observacao_interna: texto("observacao_interna", 2000), destaques: ed.destaques.slice(0, 30),
    fotos: ed.fotos.map(({ f: g, t, legenda, b }) => ({ f: g, t, legenda: (legenda || "").slice(0, 60), b })),
    link_origem: ed.linkOrigem ? ed.linkOrigem.slice(0, 1000) : null,
    atualizado_em: new Date().toISOString(),
  };
  for (const k of CAMPOS_NUM) {
    const v = numeroBR(f.elements[k].value);
    dados[k] = v == null ? null : ["dormitorios", "suites", "banheiros", "vagas"].includes(k) ? Math.min(50, Math.round(v)) : v;
  }
  const botao = f.querySelector("button[type=submit]");
  botao.disabled = true;
  const ok = await gravar(ed.novo ? sb.from("anuncios").insert({ id: ed.id, ...dados }) : sb.from("anuncios").update(dados).eq("id", ed.id));
  botao.disabled = false;
  if (!ok) return;
  ed.salvo = true;
  if (ed.removidas.length) await sb.storage.from("anuncios").remove(ed.removidas);
  const id = ed.id, era = ed.novo;
  await carregar();
  janelaPronto(id, era);
}

function janelaPronto(id, novo) {
  const link = linkAnuncio(id);
  aberto = null;
  abrirJanela(`<div class="crm-janela__corpo crm-ok">
    <div class="crm-ok__icone">✓</div>
    <h2>${novo ? "Página criada!" : "Anúncio atualizado!"}</h2>
    <p class="crm-sub">Envie este link para o cliente:</p>
    <input class="crm-link-pronto" value="${escapar(link)}" readonly aria-label="Link do anúncio">
    <div class="crm-acoes" style="justify-content:center">
      <button class="botao botao--zap" data-acao="an-copiar" data-id="${id}">Copiar link</button>
      <a class="botao botao--detalhes" href="${escapar(link)}" target="_blank" rel="noopener">Abrir a página</a>
    </div></div>`);
}

/* Fecha o editor sem salvar: apaga as fotos enviadas nesta edição. */
function descartarEnvios() {
  if (ed && !ed.salvo && ed.enviadasAgora.length) sb.storage.from("anuncios").remove(ed.enviadasAgora);
  ed = null;
}

/* ---------- Ações e eventos ---------- */
const ANUNCIO_ACOES = {
  "an-novo": () => abrirEditor(null),
  "an-editar": (b) => abrirEditor(b.dataset.id),
  "an-menu": (b) => abrirMenuAnuncio(b),
  "an-copiar": (b) => copiarTexto(linkAnuncio(b.dataset.id), "Link copiado."),
  "an-abrir-pagina": (b) => window.open(linkAnuncio(b.dataset.id), "_blank", "noopener"),
  "an-prorrogar": (b) => janelaProrrogar(b.dataset.id),
  "an-pausar": async (b) => {
    const a = anuncioPorId(b.dataset.id);
    const status = a.status === "Pausado" ? "Ativo" : "Pausado";
    if (await gravar(sb.from("anuncios").update({ status }).eq("id", a.id))) { aviso(status === "Pausado" ? "Anúncio pausado: a página mostra “não disponível”." : "Anúncio reativado."); await carregar(); }
  },
  "an-excluir": async (b) => {
    const a = anuncioPorId(b.dataset.id);
    if (!a || !confirm(`Excluir o anúncio "${a.titulo}"? A página deixa de funcionar e as fotos são apagadas. Não dá para desfazer.`)) return;
    const caminhos = (a.fotos || []).flatMap((f) => [f.f, f.t]).filter(Boolean);
    if (!(await gravar(sb.from("anuncios").delete().eq("id", a.id)))) return;
    if (caminhos.length) await sb.storage.from("anuncios").remove(caminhos);
    fecharJanela(); aviso("Anúncio excluído."); await carregar();
  },
  "an-extrair-link": () => extrairDoLink(),
  "an-extrair-texto": () => {
    const t = $("an-texto").value.trim();
    if (t.length < 20) { $("an-status").textContent = "Cole o texto do anúncio na caixa."; return; }
    preencherComExtracao(extrairAnuncio({ texto: t }), "texto");
  },
  "an-tirar-destaque": (b) => { ed.destaques.splice(Number(b.dataset.i), 1); desenharDestaques(); },
  "an-principal": (b) => { const [f] = ed.fotos.splice(Number(b.dataset.i), 1); ed.fotos.unshift(f); desenharFotos(); },
  "an-mover": (b) => {
    const i = Number(b.dataset.i), j = i + Number(b.dataset.d);
    if (j < 0 || j >= ed.fotos.length) return;
    [ed.fotos[i], ed.fotos[j]] = [ed.fotos[j], ed.fotos[i]]; desenharFotos();
  },
  "an-tirar-foto": (b) => {
    const [f] = ed.fotos.splice(Number(b.dataset.i), 1);
    if (ed.enviadasAgora.includes(f.f)) { sb.storage.from("anuncios").remove([f.f, f.t]); ed.enviadasAgora = ed.enviadasAgora.filter((p) => p !== f.f && p !== f.t); }
    else ed.removidas.push(f.f, f.t);
    desenharFotos();
  },
  "an-cancelar": () => { descartarEnvios(); fecharJanela(); },
};

document.addEventListener("submit", async (e) => {
  const f = e.target;
  if (f.matches?.("[data-form-anuncio]")) { e.preventDefault(); await salvarAnuncio(f); return; }
  if (f.dataset?.formProrrogar) {
    e.preventDefault();
    const a = anuncioPorId(f.dataset.formProrrogar);
    const periodo = f.elements.periodo.value;
    const base = a.expira_em > hojeISO() ? a.expira_em : hojeISO();
    const nova = periodo === "data" ? f.elements.data.value : somarPeriodo(base, periodo);
    if (!nova || nova < hojeISO()) { aviso("Escolha uma data a partir de hoje.", true); return; }
    if (await gravar(sb.from("anuncios").update({ expira_em: nova, atualizado_em: new Date().toISOString() }).eq("id", a.id))) {
      fecharJanela(); aviso(`Validade prorrogada até ${dataBR(nova)}.`); await carregar();
    }
  }
});
document.addEventListener("input", (e) => {
  if (!ed) return;
  if (e.target.closest?.("[data-form-anuncio]") && ["valor", "condominio", "iptu", "outros_custos", "operacao"].includes(e.target.name)) atualizarTotal();
  if (e.target.dataset?.legenda !== undefined) ed.fotos[Number(e.target.dataset.legenda)].legenda = e.target.value;
});
document.addEventListener("change", (e) => {
  if (e.target.id === "an-arquivos" && ed) { adicionarArquivos([...e.target.files]); e.target.value = ""; }
  if (e.target.name === "operacao" && e.target.closest?.("[data-form-anuncio]")) atualizarTotal();
  if (e.target.name === "data" && e.target.closest?.(".crm-validade")) { const r = e.target.closest("form").querySelector('input[name=periodo][value="data"]'); if (r) r.checked = true; }
});
document.addEventListener("keydown", (e) => {
  if (e.target.id === "an-novo-destaque" && e.key === "Enter") {
    e.preventDefault();
    const t = e.target.value.trim().slice(0, 40);
    if (t && !ed.destaques.includes(t) && ed.destaques.length < 30) { ed.destaques.push(t); desenharDestaques(); }
    e.target.value = "";
  }
  if (e.target.id === "an-url" && e.key === "Enter") { e.preventDefault(); extrairDoLink(); }
});
document.addEventListener("focusout", (e) => {
  const f = e.target.closest?.("[data-form-anuncio]");
  if (f && ["valor", "condominio", "iptu", "outros_custos"].includes(e.target.name)) { const n = numeroBR(e.target.value); e.target.value = n == null ? "" : n.toLocaleString("pt-BR"); }
});
// Arrastar fotos para a área de envio, e arrastar para reordenar
let arrastando = null;
document.addEventListener("dragstart", (e) => { const li = e.target.closest?.(".crm-foto"); if (li) { arrastando = Number(li.dataset.i); e.dataTransfer.effectAllowed = "move"; } });
document.addEventListener("dragover", (e) => {
  if (e.target.closest?.(".crm-foto") || (e.target.closest?.("#an-upload") && e.dataTransfer?.types?.includes("Files"))) e.preventDefault();
});
document.addEventListener("drop", (e) => {
  const li = e.target.closest?.(".crm-foto");
  if (li && arrastando !== null && ed) {
    e.preventDefault();
    const destino = Number(li.dataset.i);
    const [f] = ed.fotos.splice(arrastando, 1); ed.fotos.splice(destino, 0, f); arrastando = null; desenharFotos();
    return;
  }
  if (e.target.closest?.("#an-upload") && e.dataTransfer?.files?.length && ed) { e.preventDefault(); adicionarArquivos([...e.dataTransfer.files]); }
});
document.addEventListener("dragend", () => { arrastando = null; });

// Fechar a janela (×, Esc ou clique fora) sem salvar também descarta as fotos enviadas nesta edição.
document.getElementById("janela")?.addEventListener("close", () => { if (ed && !ed.salvo) descartarEnvios(); });
