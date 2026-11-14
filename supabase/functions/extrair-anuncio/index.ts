// Supabase Edge Function: extrair-anuncio
// Baixa a página de um anúncio e devolve título, meta tags, JSON-LD e o texto visível.
// A interpretação dos dados é feita no painel (crm/extrair.js), com as mesmas regras do texto colado.
//
// Proteções:
// - só atende quem está logado E autorizado no painel (tabela crm_admins);
// - só http/https, sem endereços internos, no máximo 3 redirecionamentos;
// - página de no máximo 3 MB e 10 segundos de espera.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ORIGENS = ["https://eviimoveis.github.io", "http://localhost:8765"];
const MAX_BYTES = 3 * 1024 * 1024;
const TEMPO_MS = 10_000;
const MAX_REDIRECIONAMENTOS = 3;

function cors(origem: string | null) {
  return {
    "Access-Control-Allow-Origin": origem && ORIGENS.includes(origem) ? origem : ORIGENS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const resposta = (corpo: unknown, status: number, origem: string | null) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors(origem), "Content-Type": "application/json" } });

/* Bloqueia endereços da rede interna (localhost, IPs privados etc.). */
function enderecoProibido(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || !h.includes(".") && !h.includes(":")) return true;
  if (h.includes(":")) return true; // IPv6 literal: não precisamos aceitar
  const ip = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ip) return false;
  const [a, b] = [Number(ip[1]), Number(ip[2])];
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}
function validarUrl(texto: string): URL | null {
  try {
    const u = new URL(texto);
    if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) return null;
    if (u.port && !["80", "443"].includes(u.port)) return null;
    return enderecoProibido(u.hostname) ? null : u;
  } catch { return null; }
}

async function baixar(inicial: URL): Promise<{ url: string; html: string }> {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_MS);
  try {
    let url = inicial;
    for (let i = 0; i <= MAX_REDIRECIONAMENTOS; i++) {
      const r = await fetch(url, {
        redirect: "manual",
        signal: controle.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
      });
      if (r.status >= 300 && r.status < 400) {
        const destino = validarUrl(new URL(r.headers.get("location") || "", url).toString());
        await r.body?.cancel();
        if (!destino) throw new Error("O link redireciona para um endereço não permitido.");
        url = destino;
        continue;
      }
      if (!r.ok) { await r.body?.cancel(); throw new Error(`O site respondeu com erro ${r.status}. Muitos portais bloqueiam robôs: cole o texto do anúncio.`); }
      const tipo = r.headers.get("content-type") || "";
      if (!/html|xml|text/i.test(tipo)) { await r.body?.cancel(); throw new Error("O link não é uma página de anúncio."); }
      // Lê no máximo MAX_BYTES
      const leitor = r.body!.getReader();
      const pedacos: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await leitor.read();
        if (done) break;
        total += value.length;
        if (total > MAX_BYTES) { await leitor.cancel(); break; }
        pedacos.push(value);
      }
      const bytes = new Uint8Array(pedacos.reduce((n, p) => n + p.length, 0));
      let pos = 0;
      for (const p of pedacos) { bytes.set(p, pos); pos += p.length; }
      const charset = (tipo.match(/charset=([\w-]+)/i) || [])[1] || "utf-8";
      let html: string;
      try { html = new TextDecoder(charset).decode(bytes); } catch { html = new TextDecoder("utf-8").decode(bytes); }
      return { url: url.toString(), html };
    }
    throw new Error("Redirecionamentos demais.");
  } finally {
    clearTimeout(timer);
  }
}

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ordm: "º", ordf: "ª", sup2: "²" };
const decodificar = (s: string) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z0-9]+);/gi, (m, n) => ENTIDADES[n.toLowerCase()] ?? m);

function analisar(html: string) {
  const jsonld: unknown[] = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { jsonld.push(JSON.parse(m[1].trim())); } catch { /* bloco inválido */ }
    if (jsonld.length >= 10) break;
  }
  const meta: Record<string, string> = {};
  for (const m of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const tag = m[0];
    const chave = (tag.match(/(?:property|name)=["']([^"']+)["']/i) || [])[1];
    const valor = (tag.match(/content=["']([^"']*)["']/i) || [])[1];
    if (chave && valor && /^(og:|twitter:|description$)/i.test(chave) && !(chave.toLowerCase() in meta)) meta[chave.toLowerCase()] = decodificar(valor).slice(0, 2000);
  }
  const titulo = decodificar(((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim()).slice(0, 300);
  const texto = decodificar(html
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|h\d|br|tr|section|article|dd|dt)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/[ \t\f\v]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 60_000);
  return { titulo, meta, jsonld, texto };
}

Deno.serve(async (req) => {
  const origem = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origem) });
  if (req.method !== "POST") return resposta({ erro: "Use POST." }, 405, origem);

  // Só quem está logado e autorizado no painel
  const auth = req.headers.get("Authorization") || "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: autorizado, error: erroAuth } = await sb.rpc("is_crm_admin");
  if (erroAuth || autorizado !== true) return resposta({ erro: "Acesso não autorizado." }, 403, origem);

  let corpo: { url?: string };
  try { corpo = await req.json(); } catch { return resposta({ erro: "Pedido inválido." }, 400, origem); }
  const url = validarUrl(String(corpo.url || "").trim());
  if (!url) return resposta({ erro: "Link inválido. Use um endereço que comece com https://" }, 400, origem);

  try {
    const { url: final, html } = await baixar(url);
    return resposta({ url: final, ...analisar(html) }, 200, origem);
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "AbortError" ? "O site demorou demais para responder." : e.message) : "Erro ao baixar a página.";
    return resposta({ erro: msg }, 502, origem);
  }
});
