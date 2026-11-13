/* ===== CRM EVI Imóveis - partes usadas pelo cadastro público e pelo painel ===== */

/* Bairro -> zona. Para adicionar um bairro, inclua uma linha aqui. */
/*
  BAIRROS_DA_LISTA: os que aparecem como sugestão nos formulários.
  Para incluir ou tirar um bairro das sugestões, mexa só aqui.
*/
const BAIRROS_DA_LISTA = {
  // Zona Oeste
  "Água Branca": "ZO", "Alto da Lapa": "ZO", "Alto de Pinheiros": "ZO", "Barra Funda": "ZO", "Butantã": "ZO",
  "Cidade Jardim": "ZO", "Jardim Guedala": "ZO", "Jardim Paulistano": "ZO", "Lapa": "ZO", "Morumbi": "ZO",
  "Pacaembu": "ZO", "Perdizes": "ZO", "Pinheiros": "ZO", "Pompeia": "ZO", "Real Parque": "ZO", "Sumaré": "ZO",
  "Sumarezinho": "ZO", "Vila Leopoldina": "ZO", "Vila Madalena": "ZO", "Vila Romana": "ZO", "Vila Sônia": "ZO",
  // Zona Sul
  "Aclimação": "ZS", "Alto da Boa Vista": "ZS", "Brooklin": "ZS", "Campo Belo": "ZS", "Chácara Klabin": "ZS",
  "Chácara Santo Antônio": "ZS", "Granja Julieta": "ZS", "Indianópolis": "ZS", "Ipiranga": "ZS", "Itaim Bibi": "ZS",
  "Jardim Marajoara": "ZS", "Moema": "ZS", "Panamby": "ZS", "Paraíso": "ZS", "Planalto Paulista": "ZS",
  "Santo Amaro": "ZS", "Saúde": "ZS", "Vila Andrade": "ZS", "Vila Clementino": "ZS", "Vila Mariana": "ZS",
  "Vila Nova Conceição": "ZS", "Vila Olímpia": "ZS",
  // Centro / Jardins
  "Bela Vista": "ZC", "Bom Retiro": "ZC", "Campos Elíseos": "ZC", "Centro": "ZC", "Cerqueira César": "ZC",
  "Consolação": "ZC", "Higienópolis": "ZC", "Jardins": "ZC", "Liberdade": "ZC", "Paulista": "ZC",
  "República": "ZC", "Santa Cecília": "ZC",
  // Zona Norte
  "Casa Verde": "ZN", "Freguesia do Ó": "ZN", "Limão": "ZN", "Santana": "ZN", "Tucuruvi": "ZN",
  // Zona Leste
  "Anália Franco": "ZL", "Mooca": "ZL", "Tatuapé": "ZL",
};
/*
  Bairros que saíram das sugestões (nenhum corretor nem cliente escolheu), mas que o CRM continua
  reconhecendo: em cadastros antigos, nas observações e para saber a zona.
*/
const BAIRROS_RECONHECIDOS = {
  "Jaguaré": "ZO", "Campo Limpo": "ZS", "Jabaquara": "ZS", "Brás": "ZC", "Cambuci": "ZC", "Sé": "ZC",
  "Brasilândia": "ZN", "Cachoeirinha": "ZN", "Jaçanã": "ZN", "Mandaqui": "ZN", "Tremembé": "ZN",
  "Vila Guilherme": "ZN", "Vila Maria": "ZN", "Água Rasa": "ZL", "Belém": "ZL", "Carrão": "ZL", "Itaquera": "ZL",
  "Penha": "ZL", "São Mateus": "ZL", "São Miguel Paulista": "ZL", "Vila Formosa": "ZL", "Vila Prudente": "ZL",
};
const BAIRROS = { ...BAIRROS_DA_LISTA, ...BAIRROS_RECONHECIDOS };
const LISTA_BAIRROS = Object.keys(BAIRROS_DA_LISTA).sort((a, b) => a.localeCompare(b, "pt-BR"));
const TODOS_BAIRROS = Object.keys(BAIRROS);
const NOME_ZONA = { ZO: "Zona Oeste", ZS: "Zona Sul", ZC: "Centro", ZN: "Zona Norte", ZL: "Zona Leste" };
const BAIRROS_POR_ZONA = Object.keys(NOME_ZONA).map((z) => [NOME_ZONA[z], LISTA_BAIRROS.filter((b) => BAIRROS[b] === z)]);
/* Jeitos comuns de escrever um bairro nas observações -> nome oficial */
const APELIDOS_BAIRRO = {
  "itaim": "Itaim Bibi", "vnc": "Vila Nova Conceição", "vila nova": "Vila Nova Conceição", "madalena": "Vila Madalena",
  "jardim america": "Jardins", "jardim europa": "Jardins", "jardim paulista": "Jardins", "alto pinheiros": "Alto de Pinheiros",
  "klabin": "Chácara Klabin", "leopoldina": "Vila Leopoldina", "olimpia": "Vila Olímpia", "sta cecilia": "Santa Cecília",
  "sta. cecilia": "Santa Cecília", "vila pompeia": "Pompeia", "cerqueira cesar": "Cerqueira César", "santo antonio": "Chácara Santo Antônio",
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
/* Especialidades do corretor. Cada uma soma pontos no match quando combina com o pedido do cliente. */
const ESPECIALIDADES = ["Alto padrão", "Terrenos", "Galpões", "Lojas e salas", "Studios", "Lançamentos", "Econômico / MCMV"];
const PONTOS_ESPECIALIDADE = 10;
const ALTO_PADRAO = { locacao: 10000, compra: 2000000 };  // a partir destes valores conta como alto padrão
const ECONOMICO = { locacao: 2500, compra: 400000 };      // até estes valores conta como econômico

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
  { id: "bairro1", rotulo: "1º bairro em que mais atua", tipo: "bairro", obrig: true, livre: true },
  { id: "bairro2", rotulo: "2º bairro em que mais atua", tipo: "bairro", livre: true, dica: "Deixe em branco se atua em 1 bairro só" },
  { id: "outros_bairros", rotulo: "Atua em outros bairros?", tipo: "bairros", livre: true,
    ajuda: "Opcional. Digite um bairro, toque na sugestão e ele entra na lista. Repita para cada bairro." },
  { id: "especialidades", rotulo: "Tem alguma especialidade?", tipo: "multi", opcoes: ESPECIALIDADES,
    ajuda: "Opcional. Marque só o que for o seu forte." },
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
  { id: "bairro1", rotulo: "Bairro de maior preferência", tipo: "bairro", obrig: true },
  { id: "bairro2", rotulo: "2ª opção de bairro", tipo: "bairro", dica: "Deixe em branco se não tiver" },
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
  ...TODOS_BAIRROS.filter((b) => b !== "Sé").map((b) => [semAcento(b), b]),
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
    if (c.tipo === "bairro" || c.tipo === "bairros") {
      const caixa = `<span class="crm-auto"><input type="text" ${c.tipo === "bairro" ? `name="${c.id}" value="${escapar(v)}"${req}` : ""} data-auto="${c.tipo}"${c.livre ? " data-livre" : ""}
          autocomplete="off" autocapitalize="words" spellcheck="false" maxlength="80" role="combobox" aria-autocomplete="list" aria-expanded="false"
          placeholder="${escapar(c.dica || (c.tipo === "bairro" ? "Comece a digitar. Ex.: Pe" : "Digite um bairro para adicionar"))}"><ul class="crm-auto__lista" role="listbox" hidden></ul></span>`;
      if (c.tipo === "bairro") return `<label class="crm-campo" data-campo="${c.id}"><span>${escapar(c.rotulo)}${estrela}</span>${caixa}</label>`;
      return `<fieldset class="crm-campo crm-campo--largo" data-campo="${c.id}">
        <legend>${escapar(c.rotulo)}${estrela}</legend>${c.ajuda ? `<p class="crm-ajuda">${escapar(c.ajuda)}</p>` : ""}
        <div class="crm-etiquetas">${(v || []).map((b) => htmlEtiqueta(c.id, b)).join("")}</div>${caixa}</fieldset>`;
    }
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
/* ---------- Campo de bairro com sugestão ao digitar ---------- */
const htmlEtiqueta = (campo, bairro) =>
  `<span class="crm-etiqueta">${escapar(bairro)}<input type="hidden" name="${campo}" value="${escapar(bairro)}"><button type="button" data-remover aria-label="Remover ${escapar(bairro)}">×</button></span>`;

/* Bairro oficial com esse nome (sem ligar para acento ou maiúscula), ou "". */
const bairroOficial = (texto) => TODOS_BAIRROS.find((b) => semAcento(b) === semAcento(texto)) || "";

/* Sugestões para o que foi digitado: primeiro os que começam com o texto, depois palavra que começa, depois quem contém. */
function sugerirBairros(texto, ignorar = []) {
  const t = semAcento(texto);
  if (!t) return [];
  const fora = ignorar.map(semAcento);
  const nota = (b) => { const n = semAcento(b); return n.startsWith(t) ? 0 : n.split(/[\s-]+/).some((p) => p.startsWith(t)) ? 1 : n.includes(t) ? 2 : 9; };
  return LISTA_BAIRROS.filter((b) => !fora.includes(semAcento(b)) && nota(b) < 9).sort((a, b) => nota(a) - nota(b) || a.localeCompare(b, "pt-BR")).slice(0, 8);
}

function fecharSugestoes(input) {
  const ul = input.parentElement.querySelector(".crm-auto__lista");
  ul.hidden = true; ul.innerHTML = ""; input.setAttribute("aria-expanded", "false");
}
function mostrarSugestoes(input) {
  const ul = input.parentElement.querySelector(".crm-auto__lista");
  const texto = input.value.trim();
  const jaTem = input.dataset.auto === "bairros" ? [...input.closest("[data-campo]").querySelectorAll("input[type=hidden]")].map((i) => i.value) : [];
  const lista = sugerirBairros(texto, jaTem);
  const itens = lista.map((b, i) => `<li role="option" data-valor="${escapar(b)}"${i === 0 ? ' class="ativo"' : ""}>${escapar(b)}</li>`);
  // Corretor pode informar bairro fora da lista: oferece usar o que digitou.
  if (texto.length >= 3 && input.hasAttribute("data-livre") && !bairroOficial(texto) && !jaTem.map(semAcento).includes(semAcento(texto)))
    itens.push(`<li role="option" data-valor="${escapar(texto)}" class="crm-auto__livre${lista.length ? "" : " ativo"}">Usar “${escapar(texto)}”</li>`);
  if (texto && !itens.length) itens.push('<li class="crm-auto__vazio">Nenhum bairro com esse nome. Tente as primeiras letras.</li>');
  ul.innerHTML = itens.join(""); ul.hidden = !itens.length; input.setAttribute("aria-expanded", String(!ul.hidden));
}
function escolherBairro(input, valor) {
  if (input.dataset.auto === "bairros") {
    const caixa = input.closest("[data-campo]");
    const ja = [...caixa.querySelectorAll("input[type=hidden]")].map((i) => semAcento(i.value));
    if (valor && !ja.includes(semAcento(valor))) caixa.querySelector(".crm-etiquetas").insertAdjacentHTML("beforeend", htmlEtiqueta(caixa.dataset.campo, valor));
    input.value = "";
  } else input.value = valor;
  fecharSugestoes(input);
}
/*
  Ao sair do campo: ajusta para o nome oficial; se só uma sugestão combina, usa ela.
  Com "forcar" (ao enviar o formulário), o que ficou digitado em "outros bairros" entra como está.
*/
function ajustarBairro(input, forcar = false) {
  const texto = input.value.trim();
  if (!texto) return;
  const exato = bairroOficial(texto);
  const lista = exato ? [exato] : sugerirBairros(texto);
  if (lista.length === 1) escolherBairro(input, lista[0]);
  else if (input.dataset.auto === "bairros" && input.hasAttribute("data-livre") && texto.length >= 3 && (forcar || !lista.length)) escolherBairro(input, texto);
}

function ativarForm(form, campos) {
  form._campos = campos;
  atualizarCondicionais(form, campos);
  if (form._ativo) return; // o mesmo <form> pode ser reaproveitado com outros campos
  form._ativo = true;
  const auto = (e) => (e.target.matches?.("[data-auto]") ? e.target : null);
  form.addEventListener("input", (e) => { if (auto(e)) mostrarSugestoes(e.target); });
  form.addEventListener("focusin", (e) => { if (auto(e) && e.target.value.trim()) mostrarSugestoes(e.target); });
  form.addEventListener("focusout", (e) => { if (auto(e)) { ajustarBairro(e.target); fecharSugestoes(e.target); } });
  // pointerdown (e não click) para escolher antes de o campo perder o foco
  form.addEventListener("pointerdown", (e) => {
    const li = e.target.closest?.(".crm-auto__lista li[data-valor]");
    if (li) { e.preventDefault(); escolherBairro(li.closest(".crm-auto").querySelector("input"), li.dataset.valor); }
  });
  form.addEventListener("click", (e) => { if (e.target.matches?.("[data-remover]")) e.target.closest(".crm-etiqueta").remove(); });
  form.addEventListener("keydown", (e) => {
    const input = auto(e);
    if (!input) return;
    const ul = input.parentElement.querySelector(".crm-auto__lista");
    const itens = [...ul.querySelectorAll("li[data-valor]")];
    const atual = itens.findIndex((li) => li.classList.contains("ativo"));
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!itens.length) return;
      e.preventDefault();
      const novo = (atual + (e.key === "ArrowDown" ? 1 : -1) + itens.length) % itens.length;
      itens.forEach((li, i) => li.classList.toggle("ativo", i === novo));
      itens[novo].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      // Enter escolhe a sugestão em vez de enviar o formulário
      if (!ul.hidden && itens.length) { e.preventDefault(); escolherBairro(input, itens[Math.max(0, atual)].dataset.valor); }
      else if (input.dataset.auto === "bairros") { e.preventDefault(); ajustarBairro(input, true); }
    } else if (e.key === "Escape" && !ul.hidden) { e.preventDefault(); e.stopPropagation(); fecharSugestoes(input); } // não fecha a janela do painel
  });
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
    if (c.tipo === "bairros") {
      const pendente = caixa?.querySelector("[data-auto]");
      if (pendente && !escondido) ajustarBairro(pendente, true); // o que ficou digitado sem escolher
      dados[c.id] = escondido ? [] : [...caixa.querySelectorAll("input[type=hidden]")].map((i) => i.value);
      continue;
    }
    const bruto = escondido ? "" : (form.elements[c.id]?.value ?? "").trim();
    if (c.tipo === "bairro") {
      const oficial = bairroOficial(bruto);
      if (bruto && !oficial && !c.livre) return { erro: `Escolha um bairro da lista em "${c.rotulo}". Digite as primeiras letras e toque na sugestão.` };
      dados[c.id] = oficial || bruto || null;
      continue;
    }
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
  // Bairros extras: não repete os dois principais
  if (Array.isArray(dados.outros_bairros)) {
    const principais = [dados.bairro1, dados.bairro2].map(semAcento);
    dados.outros_bairros = dados.outros_bairros.filter((b) => !principais.includes(semAcento(b)));
  }
  return { dados };
}
