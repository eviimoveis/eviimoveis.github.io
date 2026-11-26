/* ===== EVI Imóveis - modo administrador (só para o dono do site) =====
   Ative abrindo o site com #admin no final do endereço e colando a chave do GitHub.
   A chave fica salva SÓ neste aparelho. Clientes nunca veem nada disto.
   O botão Inativar/Reativar edita o arquivo inativos.txt do repositório. */
(function () {
  const REPO = "eviimoveis/eviimoveis.github.io";
  const BRANCH = "claude/funny-noether-tbkdch";
  const ARQUIVO = "inativos.txt";
  const API = `https://api.github.com/repos/${REPO}/contents/${ARQUIVO}`;
  const CHAVE_LS = "evi_admin_chave";

  const lerChave = () => { try { return localStorage.getItem(CHAVE_LS) || ""; } catch (e) { return ""; } };
  const salvarChave = (v) => { try { v ? localStorage.setItem(CHAVE_LS, v) : localStorage.removeItem(CHAVE_LS); } catch (e) {} };

  const b64ParaTexto = (b) => decodeURIComponent(escape(atob(b.replace(/\s/g, ""))));
  const textoParaB64 = (t) => btoa(unescape(encodeURIComponent(t)));

  const admin = {
    ativo: !!lerChave(),
    inativos: new Set(),
    sha: null,
    cabecalho: "",
  };
  window.EVI_ADMIN = admin;

  async function api(metodo, corpo) {
    const resp = await fetch(metodo === "GET" ? `${API}?ref=${encodeURIComponent(BRANCH)}&t=${Date.now()}` : API, {
      method: metodo,
      headers: { Authorization: `Bearer ${lerChave()}`, Accept: "application/vnd.github+json" },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    if (resp.status === 401 || resp.status === 403) throw new Error("chave");
    if (!resp.ok) throw new Error("http " + resp.status);
    return resp.json();
  }

  // Lê a lista atual direto do GitHub (mais atual que o site publicado)
  async function carregarLista() {
    const dados = await api("GET");
    admin.sha = dados.sha;
    const texto = b64ParaTexto(dados.content);
    const linhas = texto.split(/\r?\n/);
    admin.cabecalho = linhas.filter((l) => l.trim().startsWith("#")).join("\n");
    admin.inativos = new Set(linhas.map((l) => l.replace(/#.*/, "").trim().toUpperCase()).filter(Boolean));
  }

  async function gravarLista(mensagem) {
    const corpo = (admin.cabecalho ? admin.cabecalho + "\n" : "") + [...admin.inativos].sort().join("\n") + "\n";
    const r = await api("PUT", { message: mensagem, content: textoParaB64(corpo), sha: admin.sha, branch: BRANCH });
    admin.sha = r.content.sha;
  }

  // Chamado pelo script.js no início: devolve a lista do GitHub (ou null para usar a do site)
  admin.iniciar = async function () {
    if (location.hash === "#admin" && !admin.ativo) mostrarLogin();
    if (!admin.ativo) return null;
    try {
      await carregarLista();
      mostrarBarra();
      return admin.inativos;
    } catch (e) {
      aviso(e.message === "chave"
        ? "A chave do modo administrador não funcionou. Entre de novo com #admin."
        : "Não consegui falar com o GitHub agora. Os botões de inativar ficam desligados.");
      if (e.message === "chave") { salvarChave(""); admin.ativo = false; }
      return null;
    }
  };

  // Chamado pelo script.js para cada card
  admin.decorarCard = function (card, i) {
    if (!admin.ativo) return;
    const cod = String(i.codigo).toUpperCase();
    const inativo = admin.inativos.has(cod);
    card.classList.toggle("card--inativo", inativo);
    const barra = document.createElement("div");
    barra.className = "admin-card";
    barra.innerHTML = inativo
      ? `<span class="admin-card__selo">INATIVO</span><button class="admin-card__botao admin-card__botao--reativar">Reativar</button>`
      : `<span class="admin-card__selo admin-card__selo--ativo">Ativo</span><button class="admin-card__botao">Inativar</button>`;
    barra.querySelector("button").onclick = (e) => alternar(e.currentTarget, i);
    card.prepend(barra);
  };

  async function alternar(botao, i) {
    const cod = String(i.codigo).toUpperCase();
    const vaiInativar = !admin.inativos.has(cod);
    botao.disabled = true;
    botao.textContent = "Salvando…";
    const tentar = async () => {
      vaiInativar ? admin.inativos.add(cod) : admin.inativos.delete(cod);
      await gravarLista(`${vaiInativar ? "Inativa" : "Reativa"} ${cod} pelo site`);
    };
    try {
      try { await tentar(); }
      catch (e) {
        if (e.message === "chave") throw e;
        await carregarLista(); // alguém mudou o arquivo no meio: recarrega e tenta de novo
        await tentar();
      }
      aviso(vaiInativar
        ? `${cod} inativado. Some para os clientes em 1 a 2 minutos.`
        : `${cod} reativado. Volta para os clientes em 1 a 2 minutos.`);
    } catch (e) {
      vaiInativar ? admin.inativos.delete(cod) : admin.inativos.add(cod);
      aviso(e.message === "chave"
        ? "A chave não tem permissão para salvar. Gere uma nova chave e entre de novo com #admin."
        : "Não consegui salvar. Confira a internet e tente de novo.");
    }
    renderizar();
    atualizarBarra();
  }

  /* ---------- Interface ---------- */
  function aviso(texto) {
    let el = document.getElementById("admin-aviso");
    if (!el) {
      el = document.createElement("div");
      el.id = "admin-aviso";
      el.className = "admin-aviso";
      document.body.append(el);
    }
    el.textContent = texto;
    el.classList.add("admin-aviso--visivel");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("admin-aviso--visivel"), 5000);
  }

  function mostrarBarra() {
    const barra = document.createElement("div");
    barra.id = "admin-barra";
    barra.className = "admin-barra";
    barra.innerHTML = `<span><strong>Modo administrador</strong> · <span id="admin-contagem"></span></span>
      <button id="admin-sair" class="admin-barra__sair">Sair</button>`;
    document.body.prepend(barra);
    document.getElementById("admin-sair").onclick = () => {
      salvarChave("");
      location.href = location.pathname;
    };
    atualizarBarra();
  }

  function atualizarBarra() {
    const el = document.getElementById("admin-contagem");
    if (el) el.textContent = `${admin.inativos.size} imóve${admin.inativos.size === 1 ? "l inativo" : "is inativos"} · só você vê esta barra`;
  }

  function mostrarLogin() {
    const d = document.createElement("dialog");
    d.className = "admin-login";
    d.innerHTML = `
      <form method="dialog" id="admin-form">
        <h2>Modo administrador</h2>
        <p>Cole a chave do GitHub. Ela fica salva só neste aparelho.</p>
        <input id="admin-chave" type="password" autocomplete="off" placeholder="ghp_..." required>
        <p id="admin-erro" class="admin-login__erro" hidden></p>
        <div class="admin-login__acoes">
          <button type="button" id="admin-cancelar" class="botao botao--detalhes">Cancelar</button>
          <button type="submit" class="botao botao--whats">Entrar</button>
        </div>
      </form>`;
    document.body.append(d);
    d.showModal();
    d.querySelector("#admin-cancelar").onclick = () => { d.close(); history.replaceState(null, "", location.pathname); };
    d.querySelector("#admin-form").onsubmit = async (e) => {
      e.preventDefault();
      const chave = d.querySelector("#admin-chave").value.trim();
      salvarChave(chave);
      try {
        await carregarLista();
        location.href = location.pathname; // recarrega já no modo administrador
      } catch (err) {
        salvarChave("");
        const erro = d.querySelector("#admin-erro");
        erro.hidden = false;
        erro.textContent = err.message === "chave" ? "Chave inválida ou sem permissão." : "Não consegui falar com o GitHub. Tente de novo.";
      }
    };
  }
})();
