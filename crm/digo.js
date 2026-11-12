/* ===== CRM EVI Imóveis - Pagamentos Digo =====
   Carregado antes do painel.js; usa D, sb, gravar, carregar etc. na hora de desenhar. */

const VALOR_DIGO = { Corretor: 5, "Anúncio": 20, Cliente: 30, Visita: 30 };
const REGRAS_COMISSAO = [
  { id: "captou", rotulo: "Imóvel que ele captou", pct: 10 },
  { id: "corretor", rotulo: "Locação com corretor que ele trouxe", pct: 10 },
  { id: "cliente", rotulo: "Cliente que ele trouxe", pct: 10 },
  { id: "achou", rotulo: "Ele achou o imóvel para o cliente", pct: 10 },
];
const brl = (v) => "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* Junta tudo o que gera valor para o Digo, já com data/hora de entrada. */
function extratoDigo() {
  const inicio = D.digo_config[0]?.criado_em;
  const itens = D.digo_lancamentos.map((x) => ({
    quando: x.criado_em, data: x.data, tipo: x.tipo, qtd: x.qtd,
    descricao: x.descricao || "", valor: Number(x.valor), id: x.id, manual: true,
  }));
  if (inicio) {
    D.corretores.filter((c) => c.criado_em > inicio).forEach((c) => itens.push({
      quando: c.criado_em, data: c.criado_em, tipo: "Corretor", qtd: 1,
      descricao: `${c.nome} (${c.origem || "cadastro"})`, valor: VALOR_DIGO.Corretor,
    }));
  }
  D.leads.filter((l) => l.captado_digo).forEach((l) => itens.push({
    quando: l.captado_digo_em || l.criado_em, data: l.captado_digo_em || l.criado_em, tipo: "Cliente", qtd: 1,
    descricao: l.nome, valor: VALOR_DIGO.Cliente,
  }));
  return itens.sort((a, b) => (a.quando < b.quando ? 1 : -1));
}

function resumoDigo() {
  const itens = extratoDigo();
  const pags = [...D.digo_pagamentos].sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1));
  const ultimo = pags[0];
  const devido = itens.reduce((s, i) => s + i.valor, 0);
  const pago = pags.reduce((s, p) => s + Number(p.valor), 0);
  const novos = ultimo ? itens.filter((i) => i.quando > ultimo.criado_em) : itens;
  return { itens, pags, ultimo, devido, pago, saldo: devido - pago, novos, desde: novos.reduce((s, i) => s + i.valor, 0) };
}

function abaDigo() {
  if (!digoAtivo) {
    $("conteudo").innerHTML = '<p class="vazio">Pagamentos Digo ainda não está ativado no banco de dados. Falta rodar a parte “Pagamentos Digo” do arquivo supabase/schema.sql no Supabase (SQL Editor → Run).</p>';
    return;
  }
  const r = resumoDigo();
  const numero = (rotulo, valor) => `<div class="crm-numero"><b>${valor}</b><span>${rotulo}</span></div>`;
  const linhaItem = (i) => `<tr><td>${dataBR(i.data)}</td><td>${escapar(i.tipo)}${i.qtd > 1 ? ` ×${i.qtd}` : ""}</td>
    <td>${escapar(i.descricao)}</td><td>${brl(i.valor)}</td>
    <td>${i.manual ? `<button class="crm-link-texto" data-acao="digo-excluir" data-id="${i.id}" title="Excluir lançamento">✕</button>` : '<small>auto</small>'}</td></tr>`;
  const tabela = (lista, vazio) => lista.length
    ? `<table class="crm-mini"><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th><th></th></tr></thead><tbody>${lista.map(linhaItem).join("")}</tbody></table>`
    : `<p class="crm-sem-dados">${vazio}</p>`;

  $("conteudo").innerHTML = `
    <div class="crm-barra">
      <button class="botao botao--zap" data-acao="digo-form" data-tipo="Anúncio">+ Anúncio publicado</button>
      <button class="botao botao--zap" data-acao="digo-form" data-tipo="Visita">+ Visita acompanhada</button>
      <button class="botao botao--detalhes" data-acao="digo-comissao">+ Comissão</button>
      <button class="botao botao--whats" data-acao="digo-pagar"${r.saldo > 0 ? "" : " disabled"}>Marcar como pago</button>
    </div>
    <div class="crm-numeros">
      ${numero("Desde o último pagamento", brl(r.desde))}
      ${numero("Total devido", brl(r.devido))}
      ${numero("Total pago", brl(r.pago))}
      ${numero("Saldo a pagar", brl(r.saldo))}
    </div>
    <div class="crm-grade-cartoes">
      <section class="crm-cartao"><h3>Entrou desde o último pagamento${r.ultimo ? ` (${dataBR(r.ultimo.data)})` : ""}</h3>
        ${tabela(r.novos, "Nada novo desde o último pagamento.")}</section>
      <section class="crm-cartao"><h3>Histórico de pagamentos</h3>
        ${r.pags.length ? `<table class="crm-mini"><thead><tr><th>Data</th><th>Valor</th><th>Obs.</th><th></th></tr></thead><tbody>${r.pags.map((p) =>
          `<tr><td>${dataBR(p.data)}</td><td>${brl(p.valor)}</td><td>${escapar(p.observacao || "")}</td>
           <td><button class="crm-link-texto" data-acao="digo-excluir-pag" data-id="${p.id}" title="Excluir pagamento">✕</button></td></tr>`).join("")}</tbody></table>`
          : '<p class="crm-sem-dados">Nenhum pagamento ainda.</p>'}</section>
      <section class="crm-cartao"><h3>Regras</h3>
        <p><b>Valores fixos:</b> ${brl(5)} por corretor cadastrado (sem bônus) · ${brl(20)} por anúncio · ${brl(30)} por cliente captado · ${brl(30)} por visita. Pagamento toda sexta-feira.</p>
        <p style="margin-top:8px"><b>Comissões</b> (em parceria, sobre os 50% que o Felipe recebe e repassa):</p>
        <ul class="crm-lista-simples">${REGRAS_COMISSAO.map((g) => `<li>${g.pct}% · ${escapar(g.rotulo)}</li>`).join("")}</ul>
        <p style="margin-top:8px">Quando mais de uma regra vale no mesmo negócio, os percentuais somam.</p>
        <p style="margin-top:8px"><small>Corretores contam sozinhos (qualquer origem, inclusive o site). Clientes contam quando marcados “Captado pelo Digo: Sim”.</small></p>
      </section>
      <section class="crm-cartao"><h3>Extrato completo (${r.itens.length})</h3>${tabela(r.itens, "Sem lançamentos.")}</section>
    </div>`;
}

function janelaDigo(tipo) {
  abrirJanela(`<div class="crm-janela__corpo"><h2>${tipo === "Anúncio" ? "Anúncio publicado" : "Visita acompanhada"} · ${brl(VALOR_DIGO[tipo])}</h2>
    <form class="crm-form" data-form="digo-item" data-tipo="${tipo}">
      <div class="crm-grade-campos">
        <label class="crm-campo"><span>Data</span><input type="date" name="data" value="${hojeISO()}" required></label>
        <label class="crm-campo"><span>Imóvel</span><input type="text" name="descricao" maxlength="300" required placeholder="Ex.: Casa Rua Ilhéus, Sumaré"></label>
      </div>
      <div class="crm-acoes"><button type="submit" class="botao botao--zap">Lançar</button>
        <button type="button" class="botao botao--detalhes" data-acao="fechar">Cancelar</button></div>
    </form></div>`);
}

function janelaComissao() {
  abrirJanela(`<div class="crm-janela__corpo"><h2>Lançar comissão</h2>
    <form class="crm-form" data-form="digo-comissao">
      <div class="crm-grade-campos">
        <label class="crm-campo"><span>Data</span><input type="date" name="data" value="${hojeISO()}" required></label>
        <label class="crm-campo"><span>Negócio</span><input type="text" name="descricao" maxlength="250" required placeholder="Ex.: Locação apto Pinheiros"></label>
        <label class="crm-campo"><span>Quanto você recebeu (R$) — em parceria, os seus 50%</span><input type="text" name="base" inputmode="decimal" required placeholder="Ex.: 3.000"></label>
      </div>
      <p style="margin:10px 0 6px"><b>Regras que valem neste negócio</b> (somam):</p>
      ${REGRAS_COMISSAO.map((g) => `<label class="crm-chip" style="margin:0 6px 6px 0"><input type="checkbox" name="regra" value="${g.pct}" data-rotulo="${escapar(g.rotulo)}"><span>${g.pct}% · ${escapar(g.rotulo)}</span></label>`).join("")}
      <p id="digo-calc" style="margin:10px 0"><b>Comissão do Digo: ${brl(0)}</b></p>
      <div class="crm-acoes"><button type="submit" class="botao botao--zap">Lançar</button>
        <button type="button" class="botao botao--detalhes" data-acao="fechar">Cancelar</button></div>
    </form></div>`);
  const f = $("janela-conteudo").querySelector("form");
  f.addEventListener("input", () => { const c = calcComissao(f); $("digo-calc").innerHTML = `<b>Comissão do Digo: ${c.pct}% de ${brl(c.base)} = ${brl(c.valor)}</b>`; });
}

function calcComissao(f) {
  const base = lerDinheiro(f.elements.base.value) || 0;
  const marcadas = [...f.querySelectorAll('input[name="regra"]:checked')];
  const pct = marcadas.reduce((s, i) => s + Number(i.value), 0);
  return { base, pct, marcadas, valor: Math.round(base * pct) / 100 };
}

async function enviarDigo(f, tipo) {
  const autor = usuario?.email;
  let dados;
  if (tipo === "digo-item") {
    const t = f.dataset.tipo;
    dados = { tipo: t, data: f.elements.data.value, descricao: f.elements.descricao.value.trim(), qtd: 1, valor: VALOR_DIGO[t], autor };
    if (!dados.data || !dados.descricao) { aviso("Preencha data e imóvel.", true); return; }
  } else {
    const c = calcComissao(f);
    if (!c.base || !c.pct) { aviso("Informe o valor recebido e marque ao menos uma regra.", true); return; }
    const regras = c.marcadas.map((i) => `${i.value}% ${i.dataset.rotulo}`).join(" + ");
    dados = { tipo: "Comissão", data: f.elements.data.value, descricao: `${f.elements.descricao.value.trim()} · ${c.pct}% de ${brl(c.base)} (${regras})`.slice(0, 300), qtd: 1, valor: c.valor, autor };
  }
  if (await gravar(sb.from("digo_lancamentos").insert(dados))) { aviso("Lançado."); fecharJanela(); await carregar(); }
}

const ACOES_DIGO = {
  "digo-form": (b) => janelaDigo(b.dataset.tipo),
  "digo-comissao": () => janelaComissao(),
  "digo-pagar": async () => {
    const r = resumoDigo();
    if (r.saldo <= 0) return;
    if (!confirm(`Marcar ${brl(r.saldo)} como pago ao Digo hoje (${dataBR(hojeISO())})?`)) return;
    if (await gravar(sb.from("digo_pagamentos").insert({ data: hojeISO(), valor: r.saldo, autor: usuario?.email }))) { aviso("Pagamento registrado."); await carregar(); }
  },
  "digo-excluir": async (b) => {
    if (!confirm("Excluir este lançamento? Não dá para desfazer.")) return;
    if (await gravar(sb.from("digo_lancamentos").delete().eq("id", b.dataset.id))) await carregar();
  },
  "digo-excluir-pag": async (b) => {
    if (!confirm("Excluir este pagamento do histórico? O saldo volta a subir. Não dá para desfazer.")) return;
    if (await gravar(sb.from("digo_pagamentos").delete().eq("id", b.dataset.id))) await carregar();
  },
};
