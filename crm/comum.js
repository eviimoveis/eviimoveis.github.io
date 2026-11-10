/* ===== CRM EVI Imóveis - partes usadas pelo cadastro público e pelo painel ===== */

const REGIOES = ["Zona Oeste", "Centro / Jardins", "Zona Sul", "Zona Norte", "Zona Leste", "Interior de SP", "Outra região"];
const TIPOS = ["Casa", "Apartamento", "Comercial", "Terreno", "Galpão", "Sítio / Chácara"];
const ETAPAS = [
  ["novo", "Novo"],
  ["em_atendimento", "Em atendimento"],
  ["visita", "Visita"],
  ["proposta", "Proposta"],
  ["fechado", "Fechado"],
  ["perdido", "Perdido"],
];
const NOME_ETAPA = Object.fromEntries(ETAPAS);
const NOME_INTERESSE = { compra: "Compra", aluguel: "Aluguel" };

/* Campos dos formulários. tipo: text | tel | email | number | select | multi | textarea */
const CAMPOS_CORRETOR = [
  { id: "nome", rotulo: "Nome completo", tipo: "text", obrig: true, max: 120 },
  { id: "telefone", rotulo: "WhatsApp (com DDD)", tipo: "tel", obrig: true, dica: "(11) 91234-5678" },
  { id: "email", rotulo: "E-mail", tipo: "email", max: 160 },
  { id: "creci", rotulo: "CRECI", tipo: "text", max: 40 },
  { id: "imobiliaria", rotulo: "Imobiliária (se houver)", tipo: "text", max: 120 },
  { id: "regioes", rotulo: "Regiões em que atua", tipo: "multi", opcoes: REGIOES, obrig: true },
  { id: "tipos", rotulo: "Tipos de imóvel que atende", tipo: "multi", opcoes: TIPOS },
  { id: "negocios", rotulo: "Trabalha com", tipo: "multi", opcoes: [["venda", "Venda"], ["aluguel", "Aluguel"]] },
  { id: "observacoes", rotulo: "Observações", tipo: "textarea", max: 2000 },
];

const CAMPOS_LEAD = [
  { id: "nome", rotulo: "Nome", tipo: "text", obrig: true, max: 120 },
  { id: "telefone", rotulo: "WhatsApp (com DDD)", tipo: "tel", obrig: true, dica: "(11) 91234-5678" },
  { id: "email", rotulo: "E-mail", tipo: "email", max: 160 },
  { id: "interesse", rotulo: "O que procura", tipo: "select", opcoes: [["compra", "Comprar"], ["aluguel", "Alugar"]], obrig: true },
  { id: "tipo", rotulo: "Tipo de imóvel", tipo: "select", opcoes: TIPOS, vazio: "Tanto faz" },
  { id: "regiao", rotulo: "Região", tipo: "select", opcoes: REGIOES, vazio: "Tanto faz" },
  { id: "bairros", rotulo: "Bairros de preferência", tipo: "text", max: 300, dica: "Ex.: Perdizes, Pompeia" },
  { id: "valor_max", rotulo: "Valor máximo (R$)", tipo: "number", dica: "Ex.: 800000" },
  { id: "observacoes", rotulo: "Conte um pouco do que precisa", tipo: "textarea", max: 2000 },
];

/* ---------- Utilidades ---------- */
const escapar = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const soDigitos = (t) => String(t ?? "").replace(/\D/g, "");
const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dataBR = (iso) => {
  if (!iso) return "";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + "T12:00:00") : new Date(iso);
  return d.toLocaleDateString("pt-BR");
};
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

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
  `https://wa.me/${telefoneWhats(telefone)}` + (texto ? `?text=${encodeURIComponent(texto)}` : "");

/* ---------- Conexão com o banco ---------- */
function criarCliente() {
  const c = typeof CRM_CONFIG === "undefined" ? {} : CRM_CONFIG;
  if (!c.SUPABASE_URL || !c.SUPABASE_ANON_KEY || !window.supabase) return null;
  return window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY);
}

/* ---------- Formulários ---------- */
const parOpcao = (o) => (Array.isArray(o) ? o : [o, o]);

function montarCampos(campos, valores = {}) {
  return campos.map((c) => {
    const v = valores[c.id];
    const req = c.obrig ? " required" : "";
    const estrela = c.obrig ? ' <span class="crm-obrig">*</span>' : "";
    let entrada;
    if (c.tipo === "select") {
      const ops = c.opcoes.map(parOpcao).map(([val, nome]) =>
        `<option value="${escapar(val)}"${v === val ? " selected" : ""}>${escapar(nome)}</option>`).join("");
      const vazio = c.vazio ? `<option value="">${escapar(c.vazio)}</option>` : "";
      entrada = `<select name="${c.id}"${req}>${vazio}${ops}</select>`;
    } else if (c.tipo === "multi") {
      const marcados = v || [];
      const ops = c.opcoes.map(parOpcao).map(([val, nome]) =>
        `<label class="crm-chip"><input type="checkbox" name="${c.id}" value="${escapar(val)}"${marcados.includes(val) ? " checked" : ""}><span>${escapar(nome)}</span></label>`).join("");
      return `<fieldset class="crm-campo crm-campo--largo" data-multi="${c.id}"${c.obrig ? " data-obrig" : ""}>
        <legend>${escapar(c.rotulo)}${estrela}</legend><div class="crm-chips">${ops}</div></fieldset>`;
    } else if (c.tipo === "textarea") {
      entrada = `<textarea name="${c.id}" rows="3" maxlength="${c.max || 2000}"${req}>${escapar(v)}</textarea>`;
    } else {
      const extra = c.tipo === "number" ? ' min="0" step="1" inputmode="numeric"' : ` maxlength="${c.max || 120}"`;
      entrada = `<input type="${c.tipo}" name="${c.id}" value="${escapar(v)}" placeholder="${escapar(c.dica || "")}"${extra}${req}>`;
    }
    const largo = c.tipo === "textarea" ? " crm-campo--largo" : "";
    return `<label class="crm-campo${largo}">${escapar(c.rotulo)}${estrela}${entrada}</label>`;
  }).join("");
}

/* Lê o formulário. Devolve { dados } ou { erro } */
function lerCampos(form, campos) {
  const dados = {};
  for (const c of campos) {
    if (c.tipo === "multi") {
      dados[c.id] = [...form.querySelectorAll(`input[name="${c.id}"]:checked`)].map((i) => i.value);
      if (c.obrig && !dados[c.id].length) return { erro: `Marque pelo menos uma opção em "${c.rotulo}".` };
      continue;
    }
    const bruto = (form.elements[c.id]?.value ?? "").trim();
    if (c.tipo === "number") dados[c.id] = bruto === "" ? null : Number(bruto);
    else if (c.tipo === "tel") {
      const d = soDigitos(bruto);
      if (d.length < 10 || d.length > 13) return { erro: "Informe o WhatsApp com DDD. Ex.: (11) 91234-5678." };
      dados[c.id] = d;
    } else dados[c.id] = bruto === "" ? null : bruto;
  }
  return { dados };
}
