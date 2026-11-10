/* ===== CRM EVI Imóveis - cadastro público (corretor ou cliente) ===== */

const PERFIS = {
  lead: {
    tabela: "leads",
    campos: CAMPOS_LEAD,
    titulo: "Quero encontrar um imóvel",
    sub: "Preencha os dados abaixo. Leva menos de um minuto.",
    ok: "Recebemos seu pedido. Um corretor que atua na região que você procura vai entrar em contato pelo WhatsApp.",
  },
  corretor: {
    tabela: "corretores",
    campos: CAMPOS_CORRETOR,
    titulo: "Cadastro de corretor parceiro",
    sub: "Informe onde você atua para receber os clientes certos.",
    ok: "Recebemos seu cadastro. Quando surgir um cliente na sua região de atuação, entraremos em contato pelo WhatsApp.",
  },
};

const el = (id) => document.getElementById(id);
const sb = criarCliente();
let perfilAtual = null;

function mostrarPasso(id) {
  ["passo-escolha", "passo-form", "passo-ok", "passo-config"].forEach((p) => el(p).classList.toggle("oculto", p !== id));
  window.scrollTo({ top: 0 });
}

function abrirForm(perfil) {
  perfilAtual = perfil;
  const p = PERFIS[perfil];
  el("form-titulo").textContent = p.titulo;
  el("form-sub").textContent = p.sub;
  el("campos").innerHTML = montarCampos(p.campos);
  el("erro").classList.add("oculto");
  mostrarPasso("passo-form");
}

function mostrarErro(msg) {
  el("erro").textContent = msg;
  el("erro").classList.remove("oculto");
}

async function enviar(evento) {
  evento.preventDefault();
  const form = el("form");
  const p = PERFIS[perfilAtual];
  el("erro").classList.add("oculto");

  if (!form.checkValidity()) { form.reportValidity(); return; }
  const { dados, erro } = lerCampos(form, p.campos);
  if (erro) { mostrarErro(erro); return; }

  // Robô preencheu o campo invisível: finge que deu certo e não grava nada.
  if (form.elements.site.value) { el("ok-texto").textContent = p.ok; mostrarPasso("passo-ok"); return; }

  if (perfilAtual === "lead") {
    const origem = new URLSearchParams(location.search).get("origem");
    if (origem) dados.origem = origem.slice(0, 60);
  }

  const botao = el("enviar");
  botao.disabled = true;
  botao.textContent = "Enviando...";
  const { error } = await sb.from(p.tabela).insert(dados);
  botao.disabled = false;
  botao.textContent = "Enviar cadastro";

  if (error) {
    console.error(error);
    mostrarErro("Não foi possível enviar agora. Confira os dados e tente de novo em instantes.");
    return;
  }
  el("ok-texto").textContent = p.ok;
  mostrarPasso("passo-ok");
}

if (!sb) {
  mostrarPasso("passo-config");
} else {
  document.querySelectorAll("[data-perfil]").forEach((b) => b.addEventListener("click", () => abrirForm(b.dataset.perfil)));
  el("voltar").addEventListener("click", () => mostrarPasso("passo-escolha"));
  el("form").addEventListener("submit", enviar);
  // Link direto: cadastro.html?perfil=corretor ou ?perfil=cliente
  const perfil = new URLSearchParams(location.search).get("perfil");
  if (perfil === "corretor") abrirForm("corretor");
  if (perfil === "cliente") abrirForm("lead");
}
