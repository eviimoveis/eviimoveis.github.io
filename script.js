/* ===== EVI Imóveis - funcionamento do site ===== */

const WHATSAPP = "5511911297820"; // (11) 91129-7820
const PASTA_FOTOS = "fotos/";
const EXTENSOES = ["jpg", "jpeg", "png", "webp"];
const FOTOS_EXTRAS = 8; // procura até CODIGO-2 ... CODIGO-9

const ORDEM_REGIOES = ["Zona Oeste", "Centro / Jardins", "Zona Sul", "Zona Norte", "Zona Leste", "Interior de SP", "Outras regiões"];
const NOME_NEGOCIO = { venda: "Venda", aluguel: "Aluguel", ambos: "Aluguel/Venda" };

let negocioAtual = "todos";
const $ = (id) => document.getElementById(id);

/* ---------- Utilidades ---------- */
const reais = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const m2 = (v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " m²";
const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const idRegiao = (r) => "regiao-" + r.normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase();

function linkWhats(imovel) {
  let msg = "Olá! Vim pelo site da EVI Imóveis e gostaria de mais informações";
  if (imovel) msg += ` sobre o imóvel ${imovel.codigo} (${imovel.tipo} em ${imovel.bairro}).`;
  else msg += ".";
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

/* Ícones da imagem padrão (aparece enquanto o imóvel não tem foto) */
const ICONES = {
  Casa: '<path d="M8 30 32 10l24 20v24H40V40H24v14H8z"/>',
  Apartamento: '<path d="M14 8h36v48H14zM22 16h6v6h-6zm14 0h6v6h-6zM22 28h6v6h-6zm14 0h6v6h-6zM28 44h8v12h-8z"/>',
  Comercial: '<path d="M8 12h48l4 14H4zM10 30h44v26H10zM18 36h12v20H18zm18 0h12v10H36z"/>',
  Terreno: '<path d="M4 50 22 24l10 14 8-10 20 22zM46 10a6 6 0 1 1 0 12 6 6 0 0 1 0-12z"/>',
  Galpão: '<path d="M4 26 32 10l28 16v30H4zM16 34h32v22H16z"/>',
};
function fotoPadrao(tipo) {
  const ic = ICONES[tipo] || (tipo.includes("Terreno") ? ICONES.Terreno : ICONES.Casa);
  return `<div class="foto__padrao"><svg viewBox="0 0 64 64" fill="currentColor">${ic}</svg>Foto em breve</div>`;
}

/* Tenta carregar fotos/CODIGO.jpg (ou .jpeg/.png/.webp). Se não existir, fica a imagem padrão. */
function carregarFoto(img, nomeBase, aoFalhar) {
  let i = 0;
  const tentar = () => {
    if (i >= EXTENSOES.length) { img.remove(); if (aoFalhar) aoFalhar(); return; }
    img.src = `${PASTA_FOTOS}${nomeBase}.${EXTENSOES[i++]}`;
  };
  img.onerror = tentar;
  tentar();
}

/* ---------- Filtros ---------- */
function preencherSelect(id, valores) {
  const sel = $(id);
  const atual = sel.value;
  sel.length = 1;
  valores.forEach((v) => sel.add(new Option(v, v)));
  if (valores.includes(atual)) sel.value = atual;
}

function montarFiltros() {
  const regioes = [...new Set(IMOVEIS.map((i) => i.regiao))].sort((a, b) => ORDEM_REGIOES.indexOf(a) - ORDEM_REGIOES.indexOf(b));
  preencherSelect("f-regiao", regioes);
  preencherSelect("f-tipo", [...new Set(IMOVEIS.map((i) => i.tipo))].sort());
  atualizarBairros();
}

function atualizarBairros() {
  const r = $("f-regiao").value;
  const bairros = [...new Set(IMOVEIS.filter((i) => !r || i.regiao === r).map((i) => i.bairro))].sort();
  preencherSelect("f-bairro", bairros);
}

/* Qual preço usar no filtro/ordenação */
function precoDe(imovel) {
  let campo = negocioAtual === "venda" ? "venda" : negocioAtual === "aluguel" ? "aluguel" : $("f-valor-de").value;
  return imovel[campo] || 0;
}

function filtrar() {
  const f = {
    regiao: $("f-regiao").value, bairro: $("f-bairro").value, tipo: $("f-tipo").value,
    pMin: +$("f-preco-min").value || 0, pMax: +$("f-preco-max").value || Infinity,
    aMin: +$("f-area-min").value || 0, aMax: +$("f-area-max").value || Infinity,
  };
  const usaPreco = f.pMin > 0 || f.pMax < Infinity;
  let lista = IMOVEIS.filter((i) =>
    (negocioAtual === "todos" || i.negocio === negocioAtual) &&
    (!f.regiao || i.regiao === f.regiao) &&
    (!f.bairro || i.bairro === f.bairro) &&
    (!f.tipo || i.tipo === f.tipo) &&
    i.area >= f.aMin && i.area <= f.aMax &&
    (!usaPreco || (precoDe(i) > 0 && precoDe(i) >= f.pMin && precoDe(i) <= f.pMax))
  );
  const ordem = $("f-ordem").value;
  if (ordem === "menor") lista.sort((a, b) => (precoDe(a) || Infinity) - (precoDe(b) || Infinity));
  if (ordem === "maior") lista.sort((a, b) => precoDe(b) - precoDe(a));
  if (ordem === "area") lista.sort((a, b) => b.area - a.area);
  return lista;
}

/* ---------- Cards ---------- */
function htmlPrecos(i) {
  let h = "";
  if (i.venda) h += `<div class="preco">${reais(i.venda)} <small>venda</small></div>`;
  if (i.aluguel) h += `<div class="preco">${reais(i.aluguel)} <small>/mês aluguel</small></div>`;
  const taxas = [];
  if (i.condominio) taxas.push("Condomínio " + reais(i.condominio));
  if (i.iptu) taxas.push("IPTU " + reais(i.iptu));
  if (taxas.length) h += `<div class="taxas">${taxas.join(" · ")}</div>`;
  return h;
}

function htmlInfos(i) {
  const p = [`📐 ${m2(i.area)}`];
  if (i.quartos) p.push(`🛏️ ${i.quartos} quarto${i.quartos > 1 ? "s" : ""}${i.suites ? ` (${i.suites} suíte${i.suites > 1 ? "s" : ""})` : ""}`);
  if (i.banheiros) p.push(`🚿 ${i.banheiros} banheiro${i.banheiros > 1 ? "s" : ""}`);
  if (i.vagas) p.push(`🚗 ${i.vagas} vaga${i.vagas > 1 ? "s" : ""}`);
  return p.map((x) => `<span>${x}</span>`).join("");
}

function criarFoto(i, nomeBase, comSelos) {
  const div = document.createElement("div");
  div.className = "foto";
  div.innerHTML = fotoPadrao(i.tipo) + (comSelos
    ? `<span class="selo selo--${i.negocio}">${NOME_NEGOCIO[i.negocio]}</span><span class="codigo">Cód. ${escapar(i.codigo)}</span>`
    : "");
  const img = document.createElement("img");
  img.alt = `${i.tipo} em ${i.bairro}`;
  img.loading = "lazy";
  div.prepend(img);
  return { div, img, nomeBase };
}

function criarCard(i) {
  const card = document.createElement("article");
  card.className = "card";
  const foto = criarFoto(i, i.codigo, true);
  carregarFoto(foto.img, i.codigo);
  foto.div.onclick = () => abrirDetalhe(i);
  card.append(foto.div);

  const corpo = document.createElement("div");
  corpo.className = "card__corpo";
  corpo.innerHTML = `
    <div class="card__local">${escapar(i.tipo)} · ${escapar(i.bairro)}, ${escapar(i.cidade)}</div>
    <h3 class="card__titulo">${escapar(i.titulo)}</h3>
    <div class="precos">${htmlPrecos(i)}</div>
    <div class="infos">${htmlInfos(i)}</div>
    <div class="card__acoes">
      <button class="botao botao--detalhes">Ver detalhes</button>
      <a class="botao botao--whats" href="${linkWhats(i)}" target="_blank" rel="noopener">Tenho interesse</a>
    </div>`;
  corpo.querySelector(".botao--detalhes").onclick = () => abrirDetalhe(i);
  card.append(corpo);
  return card;
}

/* ---------- Lista separada por região e bairro ---------- */
function renderizar() {
  const lista = filtrar();
  const area = $("lista");
  area.innerHTML = "";

  // contadores das abas
  document.querySelectorAll(".aba").forEach((b) => {
    const n = b.dataset.negocio === "todos" ? IMOVEIS.length : IMOVEIS.filter((i) => i.negocio === b.dataset.negocio).length;
    b.querySelector(".contador").textContent = `(${n})`;
  });

  $("resultado").textContent = `${lista.length} imóve${lista.length === 1 ? "l encontrado" : "is encontrados"}`;

  const porRegiao = {};
  lista.forEach((i) => ((porRegiao[i.regiao] ||= {})[i.bairro] ||= []).push(i));
  const regioes = Object.keys(porRegiao).sort((a, b) => ORDEM_REGIOES.indexOf(a) - ORDEM_REGIOES.indexOf(b));

  $("atalhos").innerHTML = regioes.length > 1
    ? regioes.map((r) => `<a href="#${idRegiao(r)}">${escapar(r)}</a>`).join("")
    : "";

  if (!lista.length) {
    area.innerHTML = `<div class="vazio"><p>Nenhum imóvel encontrado com esses filtros.</p>
      <p>Fale com a gente no WhatsApp que buscamos para você!</p></div>`;
  }

  regioes.forEach((r) => {
    const sec = document.createElement("section");
    sec.className = "regiao";
    sec.id = idRegiao(r);
    const total = Object.values(porRegiao[r]).flat().length;
    sec.innerHTML = `<h2 class="regiao__titulo">📍 ${escapar(r)} <small>${total} imóve${total === 1 ? "l" : "is"}</small></h2>`;
    Object.keys(porRegiao[r]).sort().forEach((b) => {
      const h = document.createElement("h3");
      h.className = "bairro__titulo";
      h.textContent = `${b} — ${porRegiao[r][b][0].cidade}`;
      const grade = document.createElement("div");
      grade.className = "grade";
      porRegiao[r][b].forEach((i) => grade.append(criarCard(i)));
      sec.append(h, grade);
    });
    area.append(sec);
  });

  // Em Venda ou Aluguel, avisa que há imóveis que servem para os dois
  if (negocioAtual === "venda" || negocioAtual === "aluguel") {
    const n = IMOVEIS.filter((i) => i.negocio === "ambos").length;
    if (n) {
      const p = document.createElement("p");
      p.className = "veja-tambem";
      p.innerHTML = `Veja também <button>${n} imóveis disponíveis para Aluguel/Venda</button>`;
      p.querySelector("button").onclick = () => trocarAba("ambos");
      area.append(p);
    }
  }
}

/* ---------- Janela de detalhes ---------- */
function abrirDetalhe(i) {
  const c = $("detalhe-conteudo");
  c.innerHTML = "";
  const galeria = document.createElement("div");
  galeria.className = "galeria";
  const principal = criarFoto(i, i.codigo, true);
  carregarFoto(principal.img, i.codigo);
  galeria.append(principal.div);
  for (let n = 2; n <= FOTOS_EXTRAS + 1; n++) {
    const extra = criarFoto(i, `${i.codigo}-${n}`, false);
    extra.div.classList.add("oculto");
    extra.img.onload = () => extra.div.classList.remove("oculto");
    carregarFoto(extra.img, `${i.codigo}-${n}`, () => extra.div.remove());
    galeria.append(extra.div);
  }
  c.append(galeria);

  const corpo = document.createElement("div");
  corpo.className = "detalhe__corpo";
  corpo.innerHTML = `
    <div class="card__local">${escapar(i.tipo)} · ${escapar(i.bairro)}, ${escapar(i.cidade)} · Cód. ${escapar(i.codigo)}</div>
    <h2>${escapar(i.titulo)}</h2>
    <div class="precos">${htmlPrecos(i)}</div>
    <div class="infos">${htmlInfos(i)}</div>
    <a class="botao botao--whats" href="${linkWhats(i)}" target="_blank" rel="noopener">Tenho interesse – chamar no WhatsApp</a>
    <h3>Descrição</h3>
    <p class="descricao">${escapar(i.descricao)}</p>
    ${i.beneficios.length ? `<h3>Características</h3><ul class="beneficios">${i.beneficios.map((b) => `<li>${escapar(b)}</li>`).join("")}</ul>` : ""}`;
  c.append(corpo);
  $("detalhe").showModal();
  $("detalhe").scrollTop = 0;
}
$("detalhe").addEventListener("click", (e) => { if (e.target.id === "detalhe") e.target.close(); });

/* ---------- Abas ---------- */
function trocarAba(negocio) {
  negocioAtual = negocio;
  document.querySelectorAll(".aba").forEach((b) => b.classList.toggle("ativa", b.dataset.negocio === negocio));
  $("campo-valor-de").classList.toggle("oculto", negocio === "venda" || negocio === "aluguel");
  renderizar();
  $("imoveis").scrollIntoView({ behavior: "smooth" });
}
document.querySelectorAll(".aba").forEach((b) => (b.onclick = () => trocarAba(b.dataset.negocio)));

/* ---------- Eventos ---------- */
$("f-regiao").addEventListener("change", () => { atualizarBairros(); renderizar(); });
["f-bairro", "f-tipo", "f-valor-de", "f-ordem"].forEach((id) => $(id).addEventListener("change", renderizar));
["f-preco-min", "f-preco-max", "f-area-min", "f-area-max"].forEach((id) => $(id).addEventListener("input", renderizar));
$("limpar").onclick = () => { $("filtros").reset(); atualizarBairros(); renderizar(); };

document.querySelectorAll("[data-whats]").forEach((a) => { a.href = linkWhats(); a.target = "_blank"; a.rel = "noopener"; });
$("ano").textContent = new Date().getFullYear();

montarFiltros();
$("campo-valor-de").classList.remove("oculto");
renderizar();
