/* ===== CRM EVI Imóveis - extrair dados de um anúncio, sem IA =====
   Recebe o que a Edge Function devolveu ({ titulo, meta, jsonld, texto }) ou só um texto colado,
   e devolve os campos do formulário. Ordem de confiança: JSON-LD > meta tags (og:) > texto. */

const DESTAQUES_CONHECIDOS = [
  ["Varanda gourmet", /varanda gourmet/], ["Varanda", /varanda|sacada|terraço|terraco/], ["Piscina", /piscina/],
  ["Academia", /academia|fitness/], ["Churrasqueira", /churrasqueira/], ["Salão de festas", /salão de festas|salao de festas/],
  ["Playground", /playground|brinquedoteca/], ["Portaria 24h", /portaria 24|segurança 24|seguranca 24/], ["Elevador", /elevador/],
  ["Mobiliado", /mobiliad[oa]|semimobiliad/], ["Armários embutidos", /armários embutidos|armarios embutidos|planejad[oa]s?/],
  ["Ar-condicionado", /ar[- ]condicionado/], ["Aceita pet", /aceita (pet|animais|cachorro)|pet friendly/], ["Área de serviço", /área de serviço|area de servico/],
  ["Closet", /closet/], ["Lareira", /lareira/], ["Jardim", /jardim/], ["Quintal", /quintal/], ["Depósito", /depósito privativo|deposito privativo/],
  ["Aquecimento a gás", /aquecimento a gás|aquecimento a gas|aquecedor a gás/], ["Vista livre", /vista (livre|panorâmica|panoramica)/],
  ["Bem iluminado", /iluminad[oa]|ensolarad[oa]/], ["Perto do metrô", /metrô|metro\b/], ["Lavanderia", /lavanderia/],
];
const TIPOS_ANUNCIO = [["Cobertura", /cobertura/], ["Studio", /studio|stúdio|kitnet|kitinete/], ["Apartamento", /apartamento|\bapto\b|\bap\b/],
  ["Sobrado", /sobrado/], ["Casa", /\bcasa\b/], ["Terreno", /terreno|lote/], ["Galpão", /galpão|galpao/], ["Loja", /\bloja\b|ponto comercial/],
  ["Sala comercial", /sala comercial|conjunto comercial|\bsala\b/], ["Prédio", /prédio|predio/]];

/* "12.500,00" / "12500" / "12,5 mil" -> 12500 */
function numeroBR(t) {
  const s = String(t || "").trim().toLowerCase();
  if (!s) return null;
  const m = s.match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/);
  if (!m) return null;
  let n = Number(m[1].replace(/\./g, "") + (m[2] ? "." + m[2] : ""));
  if (/\bmil\b/.test(s) && n < 1000) n *= 1000;
  if (/milh/.test(s) && n < 1000) n *= 1000000;
  return Number.isFinite(n) ? n : null;
}
const inteiro = (t) => { const n = parseInt(String(t ?? "").replace(/\D/g, ""), 10); return Number.isFinite(n) ? n : null; };

/* Percorre o JSON-LD (inclusive @graph e listas) e junta o que interessa. */
function lerJsonLd(blocos) {
  const r = {};
  const visitar = (o, prof = 0) => {
    if (!o || typeof o !== "object" || prof > 6) return;
    if (Array.isArray(o)) { o.forEach((x) => visitar(x, prof + 1)); return; }
    const tipo = [].concat(o["@type"] || []).join(" ").toLowerCase();
    if (o.name && !r.titulo && !/organization|website|breadcrumb|person|webpage/.test(tipo)) r.titulo = String(o.name);
    if (o.description && !r.descricao && !/organization|website/.test(tipo)) r.descricao = String(o.description);
    const oferta = [].concat(o.offers || [])[0];
    if (oferta && r.valor == null) r.valor = numeroBR(oferta.price ?? oferta.priceSpecification?.price);
    if (o.floorSize && r.area == null) r.area = numeroBR(o.floorSize.value ?? o.floorSize);
    if (r.dormitorios == null && (o.numberOfBedrooms ?? o.numberOfRooms) != null) r.dormitorios = inteiro(o.numberOfBedrooms ?? o.numberOfRooms);
    if (r.banheiros == null && (o.numberOfBathroomsTotal ?? o.numberOfFullBathrooms) != null) r.banheiros = inteiro(o.numberOfBathroomsTotal ?? o.numberOfFullBathrooms);
    const end = o.address;
    if (end && typeof end === "object") {
      r.cidade ||= end.addressLocality; r.endereco ||= [end.streetAddress, end.addressLocality].filter(Boolean).join(", ");
      r.bairroTexto ||= end.neighborhood || end.addressRegion;
    }
    for (const v of Object.values(o)) if (v && typeof v === "object") visitar(v, prof + 1);
  };
  for (const b of blocos || []) { try { visitar(typeof b === "string" ? JSON.parse(b) : b); } catch { /* bloco inválido: ignora */ } }
  return r;
}

/* Procura "rótulo ... R$ 1.234" no texto. */
function valorPerto(texto, rotulo) {
  const re = new RegExp(`(?:${rotulo})[^\\dR\\n]{0,40}R\\$\\s*([\\d.]+(?:,\\d{1,2})?)`, "i");
  const m = texto.match(re);
  return m ? numeroBR(m[1]) : null;
}
const contarNoTexto = (texto, re) => { const m = texto.match(re); return m ? inteiro(m[1]) : null; };

function extrairAnuncio({ titulo = "", meta = {}, jsonld = [], texto = "" } = {}) {
  const j = lerJsonLd(jsonld);
  const t = String(texto || "").replace(/ /g, " ");
  const tl = semAcento(t + " " + (meta["og:description"] || meta.description || "") + " " + titulo + " " + (j.descricao || ""));
  const og = (k) => meta[k] || meta["og:" + k] || meta["twitter:" + k] || "";
  const r = {};

  r.titulo = (j.titulo || og("title") || titulo || "").replace(/\s*[|–-]\s*[^|–-]{2,40}$/, "").trim().slice(0, 160);
  r.descricao = (j.descricao || og("description") || meta.description || "").trim();
  if (!r.descricao && t.length < 6000) r.descricao = t.trim();
  // Texto colado sem título: usa a primeira linha, se for curta
  if (!r.titulo) { const l = t.trim().split(/\n/)[0].trim(); if (l.length >= 10 && l.length <= 120) r.titulo = l.replace(/\s*[-–|]\s*$/, ""); }
  r.descricao = r.descricao.slice(0, 6000);

  // Operação
  const aluguel = valorPerto(t, "aluguel|locação|locacao|valor do aluguel");
  const venda = valorPerto(t, "venda|valor de venda|preço de venda|preco de venda");
  if (aluguel) { r.operacao = "Locação"; r.valor = aluguel; }
  else if (venda) { r.operacao = "Venda"; r.valor = venda; }
  else {
    r.operacao = /aluguel|alugar|loca[cç][aã]o|\/m[eê]s/i.test(t + " " + r.titulo) ? "Locação" : (/venda|vender|à venda/i.test(t + " " + r.titulo) ? "Venda" : "");
    r.valor = j.valor ?? valorPerto(t, "valor|preço|preco") ?? numeroBR((t.match(/R\$\s*[\d.]+(?:,\d{1,2})?/) || [])[0]);
  }
  r.condominio = valorPerto(t, "condomínio|condominio|cond\\.");
  r.iptu = valorPerto(t, "iptu");
  r.outros_custos = valorPerto(t, "seguro incêndio|seguro incendio|seguro|taxa de serviço");

  // Números
  const areaRotulada = t.match(/(\d{2,5}(?:[.,]\d+)?)\s?m(?:²|2)\s*(?:de\s*)?(?:área|area)\s*(?:útil|util|privativa)/i) ||
    t.match(/(?:área|area)\s*(?:útil|util|privativa|construída|construida|total)?[^\d\n]{0,15}(\d{2,5}(?:[.,]\d+)?)\s?m(?:²|2)/i);
  const areaQualquer = t.match(/(\d{2,5}(?:[.,]\d+)?)\s?m(?:²|2)(?![a-z0-9])/i);
  r.area = j.area ?? (areaRotulada ? numeroBR(areaRotulada[1]) : areaQualquer ? numeroBR(areaQualquer[1]) : null);
  r.dormitorios = j.dormitorios ?? contarNoTexto(t, /(\d{1,2})\s*(?:quartos?|dormit[óo]rios?|dorms?\b)/i);
  r.suites = contarNoTexto(t, /(\d{1,2})\s*su[íi]tes?/i);
  r.banheiros = j.banheiros ?? contarNoTexto(t, /(\d{1,2})\s*(?:banheiros?|wc\b)/i);
  r.vagas = contarNoTexto(t, /(\d{1,2})\s*vagas?/i);
  if (r.vagas == null && /sem vaga|não possui vaga|nao possui vaga/i.test(t)) r.vagas = 0;

  // Tipo, bairro, cidade
  const base = semAcento(r.titulo + " " + t.slice(0, 1500));
  r.tipo = (TIPOS_ANUNCIO.find(([, re]) => re.test(base)) || [""])[0];
  const procurarBairro = (s) => bairrosCitados(s)[0] || "";
  r.bairro = procurarBairro(r.titulo) || procurarBairro(j.bairroTexto || "") || procurarBairro(t.slice(0, 3000)) || "";
  r.cidade = j.cidade || (/s[aã]o paulo/i.test(t + r.titulo) || r.bairro ? "São Paulo" : "");
  r.localizacao = (j.endereco || "").slice(0, 300);
  if (!r.titulo && (r.tipo || r.bairro)) r.titulo = `${r.tipo || "Imóvel"}${r.dormitorios ? ` com ${r.dormitorios} dormitório${r.dormitorios > 1 ? "s" : ""}` : ""}${r.bairro ? ` em ${r.bairro}` : ""}`;

  // Destaques
  r.destaques = DESTAQUES_CONHECIDOS.filter(([, re]) => re.test(tl)).map(([nome]) => nome);
  if (r.destaques.includes("Varanda gourmet")) r.destaques = r.destaques.filter((d) => d !== "Varanda");

  // Limpa o que veio estranho (ex.: um "R$ 1" de outro trecho)
  if (r.valor != null && (r.valor < 50 || r.valor > 1e9)) r.valor = null;
  for (const k of ["condominio", "iptu", "outros_custos"]) if (r[k] != null && (r[k] < 10 || r[k] > 1e7)) r[k] = null;
  if (r.area != null && (r.area < 8 || r.area > 100000)) r.area = null;
  return r;
}
