/* ===== CRM EVI Imóveis - notificações das tarefas no celular =====
   Carregado antes do painel.js; usa sb, aviso, $ e CRM_CONFIG.
   Cada aparelho ativa as suas notificações pela barra no alto da aba Tarefas. */

const NOTIF = { estado: "carregando", sincronizado: false };

const notifSuporte = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const notifIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const notifInstalado = () => navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
const paraB64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64u = (txt) => Uint8Array.from(atob(txt.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function notifInscricao() {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

async function notifAtualizar() {
  try {
    if (!notifSuporte()) NOTIF.estado = notifIOS() && !notifInstalado() ? "ios" : "sem";
    else if (Notification.permission === "denied") NOTIF.estado = "bloqueado";
    else {
      const sub = await notifInscricao();
      NOTIF.estado = sub && Notification.permission === "granted" ? "ativo" : "inativo";
      // Confirma no banco, uma vez por visita, que este aparelho continua inscrito.
      if (NOTIF.estado === "ativo" && !NOTIF.sincronizado) {
        NOTIF.sincronizado = true;
        sb.rpc("push_inscrever", { p_endpoint: sub.endpoint }).then(() => {}, () => {});
      }
    }
  } catch (e) { console.error(e); NOTIF.estado = "sem"; }
  desenharBarraNotif();
}

function desenharBarraNotif() {
  const el = $("barra-notif");
  if (!el) return;
  const html = {
    carregando: "",
    sem: "",
    ios: `<span>🔔 Para receber avisos no iPhone, abra o CRM pelo <strong>ícone da Tela de Início</strong> (Compartilhar → Adicionar à Tela de Início).</span>`,
    bloqueado: `<span>🔕 As notificações estão bloqueadas neste aparelho. Libere nas configurações do celular (Notificações → EVI CRM).</span>`,
    inativo: `<span>🔔 Receba avisos das tarefas neste aparelho.</span>
      <button type="button" class="botao botao--zap" data-acao="notif-ativar">Ativar notificações</button>`,
    ativo: `<span>🔔 Notificações ativadas neste aparelho.</span>
      <span class="crm-notif__acoes">
        <button type="button" class="crm-link-texto" data-acao="notif-teste">Enviar teste</button>
        <button type="button" class="crm-link-texto" data-acao="notif-desativar">Desativar</button>
      </span>`,
  }[NOTIF.estado] || "";
  el.innerHTML = html;
  el.hidden = !html;
}

async function notifChave() {
  let { data: chave, error } = await sb.rpc("push_chave_publica");
  if (error) throw new Error("sql");
  if (chave) return chave;
  // Primeira ativação: cria o par de chaves e guarda no banco (a parte secreta nunca fica no site).
  const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const publica = paraB64u(await crypto.subtle.exportKey("raw", par.publicKey));
  const { kty, crv, x, y, d } = await crypto.subtle.exportKey("jwk", par.privateKey);
  ({ data: chave, error } = await sb.rpc("push_definir_chaves", {
    p_publica: publica,
    p_privada: { kty, crv, x, y, d },
    p_funcao_url: `${CRM_CONFIG.SUPABASE_URL}/functions/v1/notificar`,
    p_apikey: CRM_CONFIG.SUPABASE_ANON_KEY,
  }));
  if (error || !chave) throw new Error("sql");
  return chave;
}

const NOTIF_ACOES = {
  "notif-ativar": async (b) => {
    b.disabled = true;
    try {
      // Precisa ser a primeira coisa do toque (exigência do iPhone).
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") { aviso("Sem permissão, o celular não deixa enviar avisos.", true); return; }
      const reg = await navigator.serviceWorker.register("sw.js");
      await navigator.serviceWorker.ready;
      const chave = await notifChave();
      let sub = await reg.pushManager.getSubscription();
      if (sub && sub.options?.applicationServerKey && paraB64u(sub.options.applicationServerKey) !== chave) { await sub.unsubscribe(); sub = null; }
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: deB64u(chave) });
      const { error } = await sb.rpc("push_inscrever", { p_endpoint: sub.endpoint });
      if (error) throw new Error(error.message);
      NOTIF.sincronizado = true;
      await sb.rpc("push_teste");
      aviso("Notificações ativadas! Um aviso de teste deve chegar em instantes.");
    } catch (e) {
      console.error(e);
      aviso(e.message === "sql" ? "Falta rodar no Supabase o SQL das notificações (passo a passo no README)." : "Não foi possível ativar: " + e.message, true);
    } finally {
      b.disabled = false;
      notifAtualizar();
    }
  },
  "notif-teste": async () => {
    const { data, error } = await sb.rpc("push_teste");
    if (error || !data) aviso("Não foi possível enviar o teste. Desative e ative de novo.", true);
    else aviso("Teste enviado. Deve chegar em instantes.");
  },
  "notif-desativar": async () => {
    try {
      const sub = await notifInscricao();
      if (sub) { await sb.rpc("push_desinscrever", { p_endpoint: sub.endpoint }); await sub.unsubscribe(); }
      aviso("Notificações desativadas neste aparelho.");
    } catch (e) { console.error(e); aviso("Não foi possível desativar.", true); }
    notifAtualizar();
  },
};
