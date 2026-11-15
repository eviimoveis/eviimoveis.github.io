/* CRM EVI Imóveis - recebe as notificações das tarefas no celular.
   Não guarda nada em cache: só mostra os avisos e abre o painel ao tocar. */
importScripts("crm/config.js");

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

async function buscarAvisos() {
  try {
    const sub = await self.registration.pushManager.getSubscription();
    if (!sub) return [];
    const r = await fetch(`${CRM_CONFIG.SUPABASE_URL}/rest/v1/rpc/push_buscar`, {
      method: "POST",
      headers: { apikey: CRM_CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${CRM_CONFIG.SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_endpoint: sub.endpoint }),
    });
    const itens = r.ok ? await r.json() : [];
    return Array.isArray(itens) ? itens : [];
  } catch { return []; }
}

self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    let itens = await buscarAvisos();
    // O celular exige mostrar algo a cada aviso recebido.
    if (!itens.length) itens = [{ titulo: "EVI CRM", corpo: "Você tem tarefas para ver.", tag: "crm" }];
    await Promise.all(itens.map((i) => self.registration.showNotification(String(i.titulo || "EVI CRM"), {
      body: String(i.corpo || ""),
      tag: String(i.tag || "crm"),
      icon: "icon-192.png",
      badge: "icon-192.png",
      data: { url: "painel.html" },
    })));
  })());
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const painel = abertas.find((c) => c.url.includes("painel.html"));
    if (painel) return painel.focus();
    return self.clients.openWindow("painel.html");
  })());
});
