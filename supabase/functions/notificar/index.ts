// CRM EVI Imóveis - entrega as notificações nos celulares (Web Push sem conteúdo).
// É chamada pelo banco de dados (função push_disparar). O texto do aviso é buscado
// pelo próprio aparelho, então aqui só mandamos o "toque" assinado.
// Implantar com "Verify JWT" DESLIGADO. Não usa nenhuma chave secreta do Supabase.

const HOSTS = /^https:\/\/(fcm\.googleapis\.com|[a-z0-9.-]+\.push\.apple\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com)\//;
const CONTATO = "https://eviimoveis.github.io/";

const b64u = (dados: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof dados === "string" ? new TextEncoder().encode(dados) : new Uint8Array(dados);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

async function assinar(chave: CryptoKey, origem: string) {
  const cabecalho = b64u(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const dados = b64u(JSON.stringify({ aud: origem, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: CONTATO }));
  const assinatura = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, chave, new TextEncoder().encode(`${cabecalho}.${dados}`));
  return `${cabecalho}.${dados}.${b64u(assinatura)}`;
}

export async function tratar(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ erro: "método" }, 405);
  const { segredo } = await req.json().catch(() => ({}));
  if (typeof segredo !== "string" || segredo.length < 32) return json({ erro: "pedido inválido" }, 400);

  const base = Deno.env.get("SUPABASE_URL");
  const apikey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!base || !apikey) return json({ erro: "configuração" }, 500);
  const rpc = (nome: string, corpo: unknown) =>
    fetch(`${base}/rest/v1/rpc/${nome}`, {
      method: "POST",
      headers: { apikey, Authorization: `Bearer ${apikey}`, "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });

  const r = await rpc("push_pendentes", { p_segredo: segredo });
  const dados = r.ok ? await r.json() : null;
  if (!dados?.privada) return json({ erro: "não autorizado" }, 403);

  const chave = await crypto.subtle.importKey("jwk", dados.privada, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const tokens = new Map<string, string>();
  let enviados = 0, falhas = 0;

  await Promise.all((dados.endpoints as string[]).map(async (endpoint) => {
    try {
      if (!HOSTS.test(endpoint)) throw new Error("host");
      const origem = new URL(endpoint).origin;
      if (!tokens.has(origem)) tokens.set(origem, await assinar(chave, origem));
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { TTL: "86400", Urgency: "high", Authorization: `vapid t=${tokens.get(origem)}, k=${dados.publica}` },
      });
      if (resp.ok) { enviados++; return; }
      falhas++;
      // Aparelho que desinstalou ou desativou: para de tentar.
      if (resp.status === 404 || resp.status === 410) await rpc("push_falhou", { p_segredo: segredo, p_endpoint: endpoint });
      else console.error("push", origem, resp.status, (await resp.text()).slice(0, 200));
    } catch (e) {
      falhas++;
      console.error("push", String(e));
    }
  }));
  return json({ enviados, falhas });
}

if (typeof Deno !== "undefined" && typeof Deno.serve === "function") Deno.serve(tratar);
