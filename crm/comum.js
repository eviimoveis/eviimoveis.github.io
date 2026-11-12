/* ===== CRM EVI Imóveis - partes usadas pelo cadastro público e pelo painel ===== */

/* Bairro -> zona. Para adicionar um bairro, inclua uma linha aqui. */
const BAIRROS = {
  "Aclimação": "ZS", "Água Branca": "ZO", "Água Rasa": "ZL", "Alto de Pinheiros": "ZO", "Anália Franco": "ZL",
  "Barra Funda": "ZO", "Bela Vista": "ZC", "Belém": "ZL", "Bom Retiro": "ZC", "Brás": "ZC", "Brasilândia": "ZN",
  "Brooklin": "ZS", "Butantã": "ZO", "Cachoeirinha": "ZN", "Cambuci": "ZC", "Campo Belo": "ZS",
  "Campos Elíseos": "ZC", "Carrão": "ZL", "Casa Verde": "ZN", "Centro": "ZC", "Chácara Klabin": "ZS",
  "Consolação": "ZC", "Freguesia do Ó": "ZN", "Higienópolis": "ZC", "Indianópolis": "ZS", "Ipiranga": "ZS",
  "Itaim Bibi": "ZS", "Itaquera": "ZL", "Jaçanã": "ZN", "Jaguaré": "ZO", "Jardim Guedala": "ZO", "Jardins": "ZC",
  "Lapa": "ZO", "Liberdade": "ZC", "Limão": "ZN", "Mandaqui": "ZN", "Moema": "ZS", "Mooca": "ZL", "Morumbi": "ZO",
  "Pacaembu": "ZO", "Paraíso": "ZS", "Paulista": "ZC", "Penha": "ZL", "Perdizes": "ZO", "Pinheiros": "ZO",
  "Pompeia": "ZO", "Real Parque": "ZO", "República": "ZC", "Santa Cecília": "ZC", "Santana": "ZN",
  "Santo Amaro": "ZS", "São Mateus": "ZL", "São Miguel Paulista": "ZL", "Saúde": "ZS", "Sé": "ZC", "Sumaré": "ZO",
  "Tatuapé": "ZL", "Tremembé": "ZN", "Tucuruvi": "ZN", "Vila Formosa": "ZL", "Vila Guilherme": "ZN",
  "Vila Leopoldina": "ZO", "Vila Madalena": "ZO", "Vila Maria": "ZN", "Vila Mariana": "ZS",
  "Vila Nova Conceição": "ZS", "Vila Olímpia": "ZS", "Vila Prudente": "ZL",
};
const LISTA_BAIRROS = Object.keys(BAIRROS).sort((a, b) => a.localeCompare(b, "pt-BR"));
const NOME_ZONA = { ZO: "Zona Oeste", ZS: "Zona Sul", ZC: "Centro", ZN: "Zona Norte", ZL: "Zona Leste" };
const BAIRROS_POR_ZONA = Object.keys(NOME_ZONA).map((z) => [NOME_ZONA[z], LISTA_BAIRROS.filter((b) => BAIRROS[b] === z)]);
/* Jeitos comuns de escrever um bairro nas observações -> nome oficial */
const APELIDOS_BAIRRO = {
  "itaim": "Itaim Bibi", "vnc": "Vila Nova Conceição", "vila nova": "Vila Nova Conceição", "madalena": "Vila Madalena",
  "jardim america": "Jardins", "jardim europa": "Jardins", "jardim paulista": "Jardins", "alto pinheiros": "Alto de Pinheiros",
  "klabin": "Chácara Klabin", "leopoldina": "Vila Leopoldina", "olimpia": "Vila Olímpia", "sta cecilia": "Santa Cecília",
  "sta. cecilia": "Santa Cecília", "vila pompeia": "Pompeia",
  "sto amaro": "Santo Amaro", "sto. amaro": "Santo Amaro",
};

/* Faixas de valor em que o corretor trabalha: texto -> [mínimo, máximo] */
const FAIXAS_LOCACAO = ["R$ 2 a 5 mil", "R$ 5 a 10 mil", "R$ 10 a 20 mil", "R$ 20 a 50 mil", "Mais de R$ 50 mil"];
const FAIXAS_VENDA = ["R$ 100 a 500 mil", "R$ 500 mil a 1 milhão", "R$ 1 a 5 milhões", "Acima de R$ 5 milhões"];
const LIMITES_FAIXA = {
  "R$ 2 a 5 mil": [2000, 5000], "R$ 5 a 10 mil": [5000, 10000], "R$ 10 a 20 mil": [10000, 20000],
  "R$ 20 a 50 mil": [20000, 50000], "Mais de R$ 50 mil": [50000, Infinity],
  "R$ 100 a 500 mil": [100000, 500000], "R$ 500 mil a 1 milhão": [500000, 1000000],
  "R$ 1 a 5 milhões": [1000000, 5000000], "Acima de R$ 5 milhões": [5000000, Infinity],
  // textos antigos (cadastros importados da planilha)
  "Até R$ 3 mil": [0, 3000], "R$ 3 a 5 mil": [3000, 5000], "Até R$ 5 mil": [0, 5000],
  "Acima de R$ 50 mil": [50000, Infinity], "Até R$ 100 mil": [0, 100000], "Mais de R$ 5 milhões": [5000000, Infinity],
};

const ETAPAS = ["Novo", "Qualificado", "Buscando imóveis", "Visita", "Proposta", "Fechado", "Pausado", "Perdido"];
const STATUS_ENVIO = ["Aguardando", "Tem imóvel", "Não tem imóvel", "Sem resposta", "Fechou"];
const STATUS_CORRETOR = ["Ativo", "Pausado", "Inativo"];
const TIPOS_RESIDENCIAL = ["Apartamento", "Casa", "Studio", "Cobertura", "Terreno", "Outro"];
const TIPOS_COMERCIAL = ["Galpão", "Loja", "Sala/Conjunto Comercial", "Casa", "Terreno", "Prédio comercial", "Outro"];
const OUTRO_BAIRRO = "Outro bairro";

/*
  Campos dos formulários.
  tipo: text | tel | email | dinheiro | select | multi | textarea
  se: { campo, valores } -> o campo só aparece quando o outro campo tem um desses valores
  opcoesPor: { campo, mapa } -> as opções mudam conforme o valor de outro campo
  soPublico: obrigatório apenas no cadastro público (no painel fica opcional)
*/
const CAMPOS_CORRETOR = [
  { id: "nome", rotulo: "Nome completo", tipo: "text", obrig: true, max: 120 },
  { id: "telefone", rotulo: "WhatsApp (com DDD)", tipo: "tel", obrig: true, dica: "(11) 91234-5678" },
  { id: "email", rotulo: "E-mail", tipo: "email", obrig: true, soPublico: true, max: 160 },
  { id: "imobiliaria", rotulo: "Imobiliária (caso tenha)", tipo: "text", max: 120 },
  { id: "site", rotulo: "Site ou perfil profissional", tipo: "text", max: 200 },
  { id: "creci", rotulo: "CRECI", tipo: "text", obrig: true, soPublico: true, max: 40 },
  { id: "categoria", rotulo: "Categoria de atuação", tipo: "select", opcoes: ["Residencial", "Comercial", "Ambos"], obrig: true, vazio: "Selecione" },
  { id: "operacao", rotulo: "Tipo de operação", tipo: "select", opcoes: ["Locação", "Venda", "Ambos"], obrig: true, vazio: "Selecione" },
  { id: "faixas_locacao", rotulo: "Faixas de locação em que trabalha (aluguel)", tipo: "multi", opcoes: FAIXAS_LOCACAO, obrig: true, soPublico: true,
    se: { campo: "operacao", valores: ["Locação", "Ambos"] } },
  { id: "faixas_venda", rotulo: "Faixas de venda em que trabalha", tipo: "multi", opcoes: FAIXAS_VENDA, obrig: true, soPublico: true,
    se: { campo: "operacao", valores: ["Venda", "Ambos"] } },
  { id: "bairro1", rotulo: "1º bairro em que mais atua", tipo: "select", opcoes: [...LISTA_BAIRROS, OUTRO_BAIRRO], obrig: true, vazio: "Selecione" },
  { id: "bairro1_outro", rotulo: "Qual bairro?", tipo: "text", obrig: true, max: 80, se: { campo: "bairro1", valores: [OUTRO_BAIRRO] } },
  { id: "bairro2", rotulo: "2º bairro em que mais atua", tipo: "select", opcoes: LISTA_BAIRROS, vazio: "Atuo somente em 1 bairro" },
  { id: "outros_bairros", rotulo: "Atua em outros bairros? Marque todos", tipo: "multi", grupos: BAIRROS_POR_ZONA,
    ajuda: "Opcional. Quanto mais completo, mais clientes certos chegam até você." },
  { id: "observacoes", rotulo: "Observações / especialidades / outras regiões", tipo: "textarea", max: 2000 },
];

const CAMPOS_LEAD = [
  { id: "nome", rotulo: "Nome completo", tipo: "text", obrig: true, max: 120 },
  { id: "telefone", rotulo: "WhatsApp (com DDD)", tipo: "tel", obrig: true, dica: "(11) 91234-5678" },
  { id: "operacao", rotulo: "O que você procura?", tipo: "select", opcoes: ["Locação", "Compra", "Compra ou locação"], obrig: true, vazio: "Selecione" },
  { id: "valor_locacao", rotulo: "Valor máximo do pacote (aluguel + IPTU)", tipo: "dinheiro", obrig: true, dica: "Ex.: 5.000",
    se: { campo: "operacao", valores: ["Locação", "Compra ou locação"] } },
  { id: "valor_compra", rotulo: "Valor máximo do imóvel", tipo: "dinheiro", obrig: true, dica: "Ex.: 800.000",
    se: { campo: "operacao", valores: ["Compra", "Compra ou locação"] } },
  { id: "categoria", rotulo: "Categoria do imóvel", tipo: "select", opcoes: ["Residencial", "Comercial"], obrig: true, vazio: "Selecione" },
  { id: "tipo", rotulo: "Tipo de imóvel", tipo: "select", opcoes: [], obrig: true, vazio: "Selecione",
    se: { campo: "categoria", valores: ["Residencial", "Comercial"] },
    opcoesPor: { campo: "categoria", mapa: { Residencial: TIPOS_RESIDENCIAL, Comercial: TIPOS_COMERCIAL } } },
  { id: "dormitorios", rotulo: "Quantidade de dormitórios", tipo: "select", opcoes: ["1", "2", "3", "4 ou +"], obrig: true, vazio: "Selecione",
    se: { campo: "categoria", valores: ["Residencial"] } },
  { id: "metragem", rotulo: "Metragem aproximada (m²)", tipo: "text", obrig: true, max: 60, dica: "Ex.: 80 a 100",
    se: { campo: "categoria", valores: ["Residencial", "Comercial"] } },
  { id: "vagas", rotulo: "Vagas de carro", tipo: "select", opcoes: ["Não preciso", "1", "2", "3", "+ de 3"], obrig: true, vazio: "Selecione",
    se: { campo: "categoria", valores: ["Residencial"] } },
  { id: "atividade", rotulo: "Atividade que pretende exercer", tipo: "text", obrig: true, max: 200,
    se: { campo: "categoria", valores: ["Comercial"] } },
  { id: "bairro1", rotulo: "Bairro de maior preferência", tipo: "select", opcoes: LISTA_BAIRROS, obrig: true, vazio: "Selecione" },
  { id: "bairro2", rotulo: "2ª opção de bairro", tipo: "select", opcoes: LISTA_BAIRROS, vazio: "Não tenho" },
  { id: "prazo", rotulo: "Prazo para entrar no imóvel", tipo: "select", opcoes: ["Dentro de 1 mês", "Entre 1 e 2 meses", "Depois de 2 meses"], obrig: true, soPublico: true, vazio: "Selecione" },
  { id: "essencial", rotulo: "O que não pode faltar no seu imóvel?", tipo: "textarea", obrig: true, soPublico: true, max: 2000 },
  { id: "diferencial", rotulo: "O que deixaria o imóvel ainda melhor para você?", tipo: "textarea", max: 2000 },
];

/* ---------- Utilidades ---------- */
const escapar = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const soDigitos = (t) => String(t ?? "").replace(/\D/g, "");
const semAcento = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const reais = (v) => "R$ " + Math.round(Number(v)).toLocaleString("pt-BR");
const dataBR = (iso) => {
  if (!iso) return "";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + "T12:00:00") : new Date(iso);
  return d.toLocaleDateString("pt-BR");
};
const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hojeISO = () => isoLocal(new Date());
const daquiADias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return isoLocal(d); };

const _zonas = Object.fromEntries(Object.entries(BAIRROS).map(([b, z]) => [semAcento(b), z]));
const zonaDe = (bairro) => _zonas[semAcento(bairro)] || "";

/*
  Lê um texto livre (as observações do corretor) e devolve os bairros da lista citados nele.
  Procura primeiro os nomes mais compridos, para "Alto de Pinheiros" não contar também como "Pinheiros".
  "Sé" fica de fora: confunde com a palavra "se".
*/
const _termosBairro = [
  ...LISTA_BAIRROS.filter((b) => b !== "Sé").map((b) => [semAcento(b), b]),
  ...Object.entries(APELIDOS_BAIRRO),
].sort((a, b) => b[0].length - a[0].length);
const _escaparRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function bairrosCitados(texto) {
  let t = " " + semAcento(texto) + " ";
  const achados = [];
  for (const [termo, oficial] of _termosBairro) {
    const re = new RegExp("(^|[^a-z0-9])" + _escaparRegex(termo) + "(?=[^a-z0-9]|$)", "g");
    if (re.test(t)) { if (!achados.includes(oficial)) achados.push(oficial); t = t.replace(re, "$1" + " ".repeat(termo.length)); }
  }
  return achados;
}
/* Zonas citadas por extenso ou pela sigla: "toda a Zona Oeste", "Zonas Oeste e Norte", "ZS". */
function zonasCitadas(texto) {
  const t = " " + semAcento(texto) + " ";
  const tem = (re) => re.test(t);
  const falaDeZona = tem(/[^a-z]zonas?[^a-z]/);
  const z = [];
  if (tem(/[^a-z]zo[^a-z]/) || (falaDeZona && tem(/[^a-z]oeste[^a-z]/))) z.push("ZO");
  if (tem(/[^a-z]zs[^a-z]/) || (falaDeZona && tem(/[^a-z]sul[^a-z]/))) z.push("ZS");
  if (tem(/[^a-z]zn[^a-z]/) || (falaDeZona && tem(/[^a-z]norte[^a-z]/))) z.push("ZN");
  if (tem(/[^a-z]zl[^a-z]/) || (falaDeZona && tem(/[^a-z]leste[^a-z]/))) z.push("ZL");
  if (tem(/[^a-z]zc[^a-z]/) || tem(/regiao central|zona central/)) z.push("ZC");
  return z;
}

/* "15.500", "15500", "5 mil", "30k a 50k", "1,2 milhão" -> número (0 se não entender) */
function lerDinheiro(texto) {
  const t = String(texto ?? "").toLowerCase().trim();
  if (!t) return 0;
  if (/milh|mi\b/.test(t) || /\bk\b|\dk|mil/.test(t)) {
    const numeros = t.match(/\d+(?:[.,]\d+)?/g);
    if (!numeros) return 0;
    const n = parseFloat(numeros[numeros.length - 1].replace(",", "."));
    return Math.round(n * (/milh|mi\b/.test(t) ? 1000000 : 1000));
  }
  return Number(soDigitos(t.replace(/,\d{1,2}$/, ""))) || 0;
}

/* Número no formato que o WhatsApp espera (55 + DDD + número) */
function telefoneWhats(t) {
  const d = soDigitos(t).replace(/^0+/, "");
  return d.length <= 11 ? "55" + d : d;
}
function formatarTelefone(t) {
  let d = soDigitos(t);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t || "";
}
const linkWhatsApp = (telefone, texto) =>
  `https://web.whatsapp.com/send?phone=${telefoneWhats(telefone)}` + (texto ? `&text=${encodeURIComponent(texto)}` : "");

/* ---------- Conexão com o banco ---------- */
function criarCliente() {
  const c = typeof CRM_CONFIG === "undefined" ? {} : CRM_CONFIG;
  if (!c.SUPABASE_URL || !c.SUPABASE_ANON_KEY || !window.supabase) return null;
  return window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY);
}

/* ---------- Formulários ---------- */
const htmlOpcoes = (opcoes, valor, vazio) => {
  const lista = valor && !opcoes.includes(valor) ? [...opcoes, valor] : opcoes; // mantém valor antigo fora da lista
  return (vazio !== undefined ? `<option value="">${escapar(vazio)}</option>` : "") +
    lista.map((o) => `<option value="${escapar(o)}"${valor === o ? " selected" : ""}>${escapar(o)}</option>`).join("");
};

function montarCampos(campos, valores = {}) {
  return campos.map((c) => {
    const v = valores[c.id];
    const req = c.obrig ? " required" : "";
    const estrela = c.obrig ? ' <span class="crm-obrig">*</span>' : "";
    if (c.tipo === "multi") {
      const marcados = v || [];
      const chips = (lista) => lista.map((o) =>
        `<label class="crm-chip"><input type="checkbox" name="${c.id}" value="${escapar(o)}"${marcados.includes(o) ? " checked" : ""}><span>${escapar(o)}</span></label>`).join("");
      // Com "grupos", as opções vêm separadas por título (ex.: bairros por zona) e começam recolhidas.
      const corpo = c.grupos
        ? `<details class="crm-grupos"${marcados.length ? " open" : ""}><summary>Mostrar a lista de bairros</summary>${c.grupos.map(([titulo, lista]) =>
            `<div class="crm-grupo"><strong>${escapar(titulo)}</strong><div class="crm-chips">${chips(lista)}</div></div>`).join("")}</details>`
        : `<div class="crm-chips">${chips(c.opcoes)}</div>`;
      return `<fieldset class="crm-campo crm-campo--largo" data-campo="${c.id}">
        <legend>${escapar(c.rotulo)}${estrela}</legend>${c.ajuda ? `<p class="crm-ajuda">${escapar(c.ajuda)}</p>` : ""}${corpo}</fieldset>`;
    }
    let entrada;
    if (c.tipo === "select") {
      const ops = c.opcoesPor ? (c.opcoesPor.mapa[valores[c.opcoesPor.campo]] || []) : c.opcoes;
      entrada = `<select name="${c.id}"${req}>${htmlOpcoes(ops, v ?? "", c.vazio)}</select>`;
    } else if (c.tipo === "textarea") {
      entrada = `<textarea name="${c.id}" rows="3" maxlength="${c.max || 2000}"${req}>${escapar(v)}</textarea>`;
    } else if (c.tipo === "dinheiro") {
      entrada = `<input type="text" inputmode="numeric" name="${c.id}" data-dinheiro value="${v ? escapar(reais(v)) : ""}" placeholder="${escapar(c.dica || "")}" maxlength="30"${req}>`;
    } else {
      entrada = `<input type="${c.tipo}" name="${c.id}" value="${escapar(v)}" placeholder="${escapar(c.dica || "")}" maxlength="${c.max || 120}"${req}>`;
    }
    const largo = c.tipo === "textarea" ? " crm-campo--largo" : "";
    return `<label class="crm-campo${largo}" data-campo="${c.id}"><span>${escapar(c.rotulo)}${estrela}</span>${entrada}</label>`;
  }).join("");
}

/* Mostra/esconde campos condicionais e troca opções que dependem de outro campo. */
function atualizarCondicionais(form, campos) {
  for (const c of campos) {
    const caixa = form.querySelector(`[data-campo="${c.id}"]`);
    if (!caixa) continue;
    if (c.opcoesPor) {
      const sel = form.elements[c.id];
      const chave = form.elements[c.opcoesPor.campo]?.value || "";
      if (sel.dataset.chave !== chave) {
        const ops = c.opcoesPor.mapa[chave] || [];
        const atual = sel.dataset.chave === undefined ? sel.value : (ops.includes(sel.value) ? sel.value : "");
        sel.innerHTML = htmlOpcoes(ops, atual, c.vazio);
        sel.dataset.chave = chave;
      }
    }
    if (c.se) {
      const visivel = c.se.valores.includes(form.elements[c.se.campo]?.value || "");
      caixa.hidden = !visivel;
      caixa.querySelectorAll("input, select, textarea").forEach((i) => { i.disabled = !visivel; });
    }
  }
}

/* Liga o comportamento do formulário (condicionais e máscara de dinheiro). */
function ativarForm(form, campos) {
  form._campos = campos;
  atualizarCondicionais(form, campos);
  if (form._ativo) return; // o mesmo <form> pode ser reaproveitado com outros campos
  form._ativo = true;
  form.addEventListener("change", () => atualizarCondicionais(form, form._campos));
  form.addEventListener("focusout", (e) => {
    if (e.target.matches?.("[data-dinheiro]")) { const n = lerDinheiro(e.target.value); e.target.value = n ? reais(n) : ""; }
  });
}

/* Lê o formulário. Devolve { dados } ou { erro }. Campos escondidos voltam vazios. */
function lerCampos(form, campos) {
  const dados = {};
  for (const c of campos) {
    const caixa = form.querySelector(`[data-campo="${c.id}"]`);
    const escondido = !caixa || caixa.hidden;
    if (c.tipo === "multi") {
      dados[c.id] = escondido ? [] : [...caixa.querySelectorAll("input:checked")].map((i) => i.value);
      if (!escondido && c.obrig && !dados[c.id].length) return { erro: `Marque pelo menos uma opção em "${c.rotulo}".` };
      continue;
    }
    const bruto = escondido ? "" : (form.elements[c.id]?.value ?? "").trim();
    if (c.tipo === "dinheiro") {
      const n = lerDinheiro(bruto);
      if (!escondido && c.obrig && !n) return { erro: `Informe um valor em "${c.rotulo}". Ex.: 5.000` };
      dados[c.id] = n || null;
    } else if (c.tipo === "tel") {
      const d = soDigitos(bruto);
      if (d.length < 10 || d.length > 13) return { erro: "Informe o WhatsApp com DDD. Ex.: (11) 91234-5678." };
      dados[c.id] = d;
    } else dados[c.id] = bruto === "" ? null : bruto;
  }
  // "Outro bairro": grava o que a pessoa escreveu
  if ("bairro1_outro" in dados) {
    if (dados.bairro1 === OUTRO_BAIRRO) dados.bairro1 = dados.bairro1_outro;
    delete dados.bairro1_outro;
  }
  // Bairros extras: não repete os dois principais
  if (Array.isArray(dados.outros_bairros)) {
    dados.outros_bairros = dados.outros_bairros.filter((b) => b !== dados.bairro1 && b !== dados.bairro2);
  }
  return { dados };
}
