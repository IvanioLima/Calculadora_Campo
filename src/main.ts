import './styles.css';
import { Resultado, Verificacao, fmt } from './calc/core';
import { calcDemanda } from './calc/demanda';
import { Camada } from './calc/filtro';
import { Campo, CAMPOS_ADUTORA, CAMPOS_DADOS, CAMPOS_FILTRO, CAMPOS_LAVAGEM, CAMPOS_RESERVACAO, TABELAS_FILTRO } from './ui/campos';
import { Projeto, Resultados, calcularTudo, novoProjeto, store } from './state';

type Aba = 'dados' | 'adutora' | 'reservacao' | 'filtro' | 'lavagem';
type ModuloKey = Exclude<Aba, 'dados'>;

const ABAS: { id: Aba; nome: string; icone: string }[] = [
  { id: 'dados', nome: 'Dados', icone: '<path d="M4 5h16M4 12h16M4 19h10"/>' },
  { id: 'adutora', nome: 'Adutora', icone: '<path d="M3 14h6l2-4h10M3 18h18M7 10V6h4"/>' },
  { id: 'reservacao', nome: 'Reservação', icone: '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M5 12h14"/>' },
  { id: 'filtro', nome: 'Filtro', icone: '<path d="M4 4h16l-6 8v6l-4 2v-8z"/>' },
  { id: 'lavagem', nome: 'Lavagem', icone: '<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/>' },
];

const CAMPOS: Record<Aba, Campo[]> = {
  dados: CAMPOS_DADOS, adutora: CAMPOS_ADUTORA, reservacao: CAMPOS_RESERVACAO, filtro: CAMPOS_FILTRO, lavagem: CAMPOS_LAVAGEM,
};

const INTRO: Record<Aba, string> = {
  dados: 'Informações do estudo e dados de população e consumo, usados por todos os módulos.',
  adutora: 'Vazão de adução, diâmetro, perdas de carga, golpe de aríete e potência do conjunto motobomba.',
  reservacao: 'Volume de reservação pelo critério de 1/3 do volume do dia de maior consumo (NIT-0048 / NBR 12217).',
  filtro: 'Filtro de fluxo ascendente: área, diâmetro, altura, fluidização, expansão e perdas de carga.',
  lavagem: 'Bomba de lavagem do filtro: perdas na lavagem, sucção, recalque, potência e reservatório de água de lavagem (RAP).',
};

let projeto: Projeto = store.atual();
let aba: Aba = 'dados';
let res: Resultados = calcularTudo(projeto);
let timerSalvar: number | undefined;

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const numTxt = (v: unknown) => (typeof v === 'number' ? String(v).replace('.', ',') : String(v ?? ''));

function objetoDa(a: Aba): Record<string, unknown> {
  return (a === 'dados' ? projeto.dados : projeto[a]) as unknown as Record<string, unknown>;
}

function salvarDepois() {
  window.clearTimeout(timerSalvar);
  timerSalvar = window.setTimeout(() => store.salvar(projeto), 400);
}

function recalcular() {
  try {
    res = calcularTudo(projeto);
  } catch (err) {
    console.error(err);
  }
  renderResultados();
  renderNav();
  salvarDepois();
}

// ---------------------------------------------------------------- Estrutura
function renderShell() {
  document.body.innerHTML = `
  <header class="topo">
    <img src="./icon-192.png" alt="" class="logo" />
    <div class="titulo">
      <strong>Calculadora de Campo</strong>
      <button class="proj-nome" id="btnProjetos" title="Estudos salvos"><span id="nomeProjeto"></span> ▾</button>
    </div>
    <button class="btn-icone" id="btnExportar" aria-label="Exportar memória de cálculo" title="Exportar">
      <svg viewBox="0 0 24 24"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14"/></svg>
    </button>
  </header>
  <main id="conteudo"></main>
  <nav class="abas" id="abas"></nav>
  <div class="painel" id="painel" hidden></div>
  <div class="toast" id="toast" hidden></div>`;
  $('#btnProjetos').onclick = abrirProjetos;
  $('#btnExportar').onclick = () => abrirExportar();
  renderNav();
  renderAba();
}

function piorStatus(r?: Resultado<unknown>): 'erro' | 'alerta' | null {
  if (!r) return null;
  if (r.verificacoes.some((v) => v.status === 'erro')) return 'erro';
  if (r.verificacoes.some((v) => v.status === 'alerta')) return 'alerta';
  return null;
}

function renderNav() {
  $('#nomeProjeto').textContent = projeto.info.nome || 'Sem nome';
  $('#abas').innerHTML = ABAS.map((a) => {
    const st = a.id === 'dados' ? null : piorStatus(res[a.id as ModuloKey]);
    return `<button class="aba ${a.id === aba ? 'ativa' : ''}" data-aba="${a.id}">
      <svg viewBox="0 0 24 24">${a.icone}</svg><span>${a.nome}</span>${st ? `<i class="ponto ${st}"></i>` : ''}</button>`;
  }).join('');
  document.querySelectorAll<HTMLButtonElement>('.aba').forEach((b) => {
    b.onclick = () => { aba = b.dataset.aba as Aba; renderNav(); renderAba(); window.scrollTo({ top: 0 }); };
  });
}

// ---------------------------------------------------------------- Formulários
function campoHtml(c: Campo, obj: Record<string, unknown>, prefixo: string): string {
  if (c.se && !c.se(obj)) return '';
  const id = `${prefixo}-${c.key}`;
  const dica = c.dica ? `<small class="dica">${esc(c.dica)}</small>` : '';
  if (c.tipo === 'select') {
    return `<label class="campo" for="${id}"><span>${esc(c.label)}</span>
      <select id="${id}" data-key="${c.key}" data-tipo="select">${c.opcoes!.map((o) => `<option value="${o.v}" ${obj[c.key] === o.v ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}</select>${dica}</label>`;
  }
  if (c.tipo === 'bool') {
    return `<label class="campo chk" for="${id}"><input type="checkbox" id="${id}" data-key="${c.key}" data-tipo="bool" ${obj[c.key] ? 'checked' : ''}/>
      <span>${esc(c.label)}</span>${dica}</label>`;
  }
  if (c.tipo === 'text') {
    return `<label class="campo" for="${id}"><span>${esc(c.label)}</span><input id="${id}" data-key="${c.key}" data-tipo="text" value="${esc(String(obj[c.key] ?? ''))}"/>${dica}</label>`;
  }
  return `<label class="campo" for="${id}"><span>${esc(c.label)}</span>
    <div class="com-unid"><input id="${id}" data-key="${c.key}" data-tipo="num" inputmode="decimal" autocomplete="off" value="${esc(numTxt(obj[c.key]))}"/>${c.unidade ? `<em>${esc(c.unidade)}</em>` : ''}</div>${dica}</label>`;
}

function ligarCampos(root: HTMLElement, obj: Record<string, unknown>, campos: Campo[], aoMudarEstrutura: () => void) {
  root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-key]').forEach((el) => {
    const key = el.dataset.key!;
    const tipo = el.dataset.tipo;
    const campo = campos.find((c) => c.key === key);
    if (tipo === 'num') {
      el.addEventListener('input', () => {
        const txt = (el as HTMLInputElement).value.trim().replace(/\s/g, '').replace(',', '.');
        const n = Number(txt);
        const invalido = txt === '' || !Number.isFinite(n) || (campo?.min !== undefined && n < campo.min);
        el.classList.toggle('invalido', invalido);
        if (invalido) return;
        obj[key] = n;
        recalcular();
      });
    } else if (tipo === 'text') {
      el.addEventListener('input', () => { obj[key] = (el as HTMLInputElement).value; if (key === 'nome') renderNav(); salvarDepois(); });
    } else {
      el.addEventListener('change', () => {
        obj[key] = tipo === 'bool' ? (el as HTMLInputElement).checked : el.value;
        recalcular();
        aoMudarEstrutura();
      });
    }
  });
}

function tabelaCamadasHtml(chave: string, titulo: string, xLabel: string, camadas: Camada[]): string {
  return `<div class="tabela-camadas" data-tabela="${chave}">
    <h4>${esc(titulo)}</h4>
    <table><thead><tr><th>#</th><th>${esc(xLabel)}</th><th>d sup</th><th>d inf</th><th></th></tr></thead><tbody>
    ${camadas.map((c, i) => `<tr data-i="${i}">
      <td>${i + 1}</td>
      <td><input inputmode="decimal" data-c="x" value="${numTxt(c.x)}"/></td>
      <td><input inputmode="decimal" data-c="dsup" value="${numTxt(c.dsup)}"/></td>
      <td><input inputmode="decimal" data-c="dinf" value="${numTxt(c.dinf)}"/></td>
      <td><button class="mini" data-rem="${i}" aria-label="Remover">×</button></td></tr>`).join('')}
    </tbody></table>
    <button class="mini add" data-add="${chave}">+ subcamada</button></div>`;
}

function ligarTabelas(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('[data-tabela]').forEach((t) => {
    const chave = t.dataset.tabela as 'granulometriaExpansao' | 'granulometriaFiltracao' | 'camadaSuporte';
    const lista = projeto.filtro[chave];
    t.querySelectorAll<HTMLInputElement>('input[data-c]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const i = Number(inp.closest('tr')!.dataset.i);
        const n = Number(inp.value.replace(',', '.'));
        const ok = inp.value.trim() !== '' && Number.isFinite(n) && n > 0;
        inp.classList.toggle('invalido', !ok);
        if (!ok) return;
        lista[i][inp.dataset.c as keyof Camada] = n;
        recalcular();
      });
    });
    t.querySelectorAll<HTMLButtonElement>('[data-rem]').forEach((b) => {
      b.onclick = () => { if (lista.length > 1) { lista.splice(Number(b.dataset.rem), 1); recalcular(); renderAba(); } };
    });
    t.querySelector<HTMLButtonElement>('[data-add]')!.onclick = () => {
      const u = lista[lista.length - 1];
      lista.push({ x: u.x, dsup: u.dsup, dinf: u.dinf });
      recalcular(); renderAba();
    };
  });
}

function renderAba() {
  const main = $('#conteudo');
  const obj = objetoDa(aba);
  const campos = CAMPOS[aba];
  const basicos = campos.filter((c) => !c.avancado).map((c) => campoHtml(c, obj, aba)).join('');
  const avancados = campos.filter((c) => c.avancado).map((c) => campoHtml(c, obj, aba)).join('');
  const info = projeto.info;
  const tituloAba = ABAS.find((a) => a.id === aba)!.nome;

  main.innerHTML = `
    <section class="cab-modulo"><h2>${aba === 'dados' ? 'Dados do estudo' : tituloAba}</h2><p>${INTRO[aba]}</p></section>
    ${aba !== 'dados' ? '<button class="barra-res" id="barraRes" aria-label="Ir para os resultados"></button>' : ''}
    ${aba === 'dados' ? `<section class="cartao" id="formProjeto"><h3>Identificação</h3>
      ${campoHtml({ key: 'nome', label: 'Nome do estudo', tipo: 'text' }, info as unknown as Record<string, unknown>, 'p')}
      ${campoHtml({ key: 'local', label: 'Local / município', tipo: 'text' }, info as unknown as Record<string, unknown>, 'p')}
      ${campoHtml({ key: 'responsavel', label: 'Responsável técnico', tipo: 'text' }, info as unknown as Record<string, unknown>, 'p')}
      ${campoHtml({ key: 'observacoes', label: 'Observações', tipo: 'text' }, info as unknown as Record<string, unknown>, 'p')}
    </section>` : ''}
    ${aba === 'lavagem' ? `<div class="aviso">Usa a área, o leito e a vazão de lavagem calculados no módulo <b>Filtro</b>.</div>` : ''}
    ${aba === 'filtro' && projeto.filtro.usarVazaoAdutora ? `<div class="aviso">Vazão afluente vinda da <b>Adutora</b>: ${fmt(res.adutora.out.qa)} L/s.</div>` : ''}
    <section class="cartao" id="formBasico"><h3>${aba === 'dados' ? 'População e consumo' : 'Dados de entrada'}</h3>${basicos}</section>
    ${avancados || aba === 'filtro' ? `<details class="cartao avancado" id="formAvancado"><summary>Parâmetros avançados</summary>${avancados}
      ${aba === 'filtro' ? TABELAS_FILTRO.map((t) => tabelaCamadasHtml(t.key, t.titulo, t.xLabel, projeto.filtro[t.key as 'camadaSuporte'])).join('') : ''}
      <button class="btn-sec" id="btnPadrao">Restaurar valores padrão deste módulo</button></details>` : ''}
    <div id="resultados"></div>`;

  const refazer = () => renderAba();
  ligarCampos($('#formBasico'), obj, campos, refazer);
  const av = $('#formAvancado');
  if (av) {
    ligarCampos(av, obj, campos, refazer);
    ligarTabelas(av);
    $('#btnPadrao').onclick = () => {
      if (!confirm('Restaurar os valores padrão deste módulo?')) return;
      const base = novoProjeto();
      if (aba === 'dados') projeto.dados = base.dados; else (projeto as unknown as Record<string, unknown>)[aba] = base[aba];
      recalcular(); renderAba();
    };
  }
  if (aba === 'dados') ligarCampos($('#formProjeto'), info as unknown as Record<string, unknown>, [], refazer);
  renderResultados();
}

// ---------------------------------------------------------------- Resultados
const ICONE: Record<string, string> = { ok: '✓', alerta: '!', erro: '✕', info: 'i' };

function verifHtml(v: Verificacao) {
  return `<li class="verif ${v.status}"><b class="ic">${ICONE[v.status]}</b><div><strong>${esc(v.titulo)}</strong><p>${esc(v.msg)}</p>${v.ref ? `<small>${esc(v.ref)}</small>` : ''}</div></li>`;
}

function resultadoHtml(r: Resultado<unknown>) {
  return `
    <section class="cartao resultado"><h3>Resultados</h3>
      <div class="grade">${r.resumo.map((s) => `<div class="kpi ${s.destaque ? 'dest' : ''}"><span>${esc(s.label)}</span><b>${fmt(s.valor, s.dec ?? 2)}</b><em>${esc(s.unidade ?? '')}</em></div>`).join('')}</div>
    </section>
    <section class="cartao"><h3>Verificações</h3><ul class="verifs">${r.verificacoes.map(verifHtml).join('')}</ul></section>
    <details class="cartao memoria"><summary>Memória de cálculo (${r.passos.length} etapas)</summary>
      <ol>${r.passos.map((p) => `<li><div class="m-tit">${esc(p.titulo)}</div><div class="m-form">${esc(p.formula)}</div>${p.subst ? `<div class="m-sub">${esc(p.subst)}</div>` : ''}
        <div class="m-val">= <b>${fmt(p.valor, p.dec ?? 2)}</b> ${esc(p.unidade ?? '')}</div>${p.ref ? `<small>${esc(p.ref)}</small>` : ''}</li>`).join('')}</ol>
    </details>
    <div class="acoes">
      <button class="btn" data-exp="pdf">Memória em PDF</button>
      <button class="btn sec" data-exp="xlsx">Memória em Excel</button>
    </div>`;
}

function renderResultados() {
  const alvo = document.getElementById('resultados');
  if (!alvo) return;
  if (aba === 'dados') {
    const d = calcDemanda(projeto.dados);
    alvo.innerHTML = `<section class="cartao resultado"><h3>Demanda de projeto</h3><div class="grade">
      ${[['População atual', d.p0, 'hab', 0], ['População de projeto', d.p, 'hab', 0], ['Vazão média (Qm)', d.qm, 'L/s', 2], ['Dia de maior consumo (Qmd)', d.qmd, 'L/s', 2], ['Hora de maior consumo (Qmh)', d.qmh, 'L/s', 2], ['Qmd em m³/h', d.qmd * 3.6, 'm³/h', 1]]
        .map(([l, v, u, dec], i) => `<div class="kpi ${i === 1 || i === 3 ? 'dest' : ''}"><span>${l}</span><b>${fmt(v as number, dec as number)}</b><em>${u}</em></div>`).join('')}
      </div></section>
      <section class="cartao"><h3>Resumo dos módulos</h3><ul class="resumo-mod">
      ${(['adutora', 'reservacao', 'filtro', 'lavagem'] as ModuloKey[]).map((m) => {
        const r = res[m]; const st = piorStatus(r) ?? 'ok';
        const dest = r.resumo.filter((s) => s.destaque).slice(0, 3).map((s) => `${esc(s.label)}: <b>${fmt(s.valor, s.dec ?? 2)} ${esc(s.unidade ?? '')}</b>`).join(' · ');
        return `<li class="${st}" data-ir="${m}"><strong>${esc(r.titulo)}</strong><span>${dest}</span></li>`;
      }).join('')}</ul></section>
      <div class="acoes"><button class="btn" id="expTudoPdf">Memória completa em PDF</button><button class="btn sec" id="expTudoXls">Memória completa em Excel</button></div>
      <p class="rodape">Dimensionamento preliminar para visitas técnicas e estudos de viabilidade. Não substitui o projeto executivo. Critérios: NBR 12211/12214/12215/12216/12217 e normas internas NIT-0045 a NIT-0048.</p>`;
    alvo.querySelectorAll<HTMLElement>('[data-ir]').forEach((li) => { li.onclick = () => { aba = li.dataset.ir as Aba; renderNav(); renderAba(); window.scrollTo({ top: 0 }); }; });
    $('#expTudoPdf').onclick = () => exportar('pdf', 'todos');
    $('#expTudoXls').onclick = () => exportar('xlsx', 'todos');
    return;
  }
  const r = res[aba];
  alvo.innerHTML = resultadoHtml(r);
  const barra = document.getElementById('barraRes');
  if (barra) {
    const st = piorStatus(r) ?? 'ok';
    barra.className = `barra-res ${st}`;
    barra.innerHTML = r.resumo.filter((s) => s.destaque).slice(0, 3)
      .map((s) => `<span><small>${esc(s.label)}</small><b>${fmt(s.valor, s.dec ?? 2)}</b> <em>${esc(s.unidade ?? '')}</em></span>`).join('') + '<i>▾</i>';
    barra.onclick = () => alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  alvo.querySelectorAll<HTMLButtonElement>('[data-exp]').forEach((b) => { b.onclick = () => exportar(b.dataset.exp as 'pdf' | 'xlsx', 'atual'); });
}

// ---------------------------------------------------------------- Exportação
function toast(msg: string, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  window.clearTimeout((t as unknown as { _t?: number })._t);
  (t as unknown as { _t?: number })._t = window.setTimeout(() => { t.hidden = true; }, ms);
}

function dadosBasicosTexto() {
  const d = projeto.dados; const dem = calcDemanda(d);
  return [
    { label: 'População', valor: d.modoPop === 'residencias' ? `${fmt(d.nResidencias, 0)} un × ${fmt(d.taxaOcupacao)} hab/un` : `${fmt(d.populacaoAtual, 0)} hab` },
    { label: 'Alcance / crescimento', valor: `${d.alcance} anos / ${fmt(d.crescimento)}% a.a.` },
    { label: 'Per capita / K1 / K2', valor: `${fmt(d.perCapita, 0)} L/hab.dia / ${fmt(d.k1)} / ${fmt(d.k2)}` },
    { label: 'População de projeto', valor: `${fmt(dem.p, 0)} hab` },
  ];
}

async function exportar(formato: 'pdf' | 'xlsx', escopo: 'atual' | 'todos') {
  fecharPainel();
  const mods: ModuloKey[] = escopo === 'todos' || aba === 'dados' ? ['adutora', 'reservacao', 'filtro', 'lavagem'] : [aba as ModuloKey];
  const lista = mods.map((m) => res[m]);
  toast('Gerando arquivo…', 10000);
  try {
    const { salvarArquivo, nomeArquivo } = await import('./export/salvar');
    const sufixo = mods.length > 1 ? 'memoria' : mods[0];
    let blob: Blob;
    if (formato === 'pdf') {
      const { gerarPdf } = await import('./export/pdf');
      blob = await gerarPdf(projeto.info, lista, dadosBasicosTexto());
    } else {
      const { gerarExcel } = await import('./export/excel');
      blob = await gerarExcel(projeto.info, lista, dadosBasicosTexto());
    }
    await salvarArquivo(blob, nomeArquivo(projeto.info.nome, sufixo, formato));
    toast('Arquivo gerado.');
  } catch (err) {
    console.error(err);
    toast('Não foi possível gerar o arquivo.');
  }
}

function abrirPainel(html: string) {
  const p = $('#painel');
  p.innerHTML = `<div class="fundo" data-fechar></div><div class="folha">${html}</div>`;
  p.hidden = false;
  p.querySelectorAll<HTMLElement>('[data-fechar]').forEach((el) => { el.onclick = fecharPainel; });
  return p;
}
function fecharPainel() { const p = $('#painel'); p.hidden = true; p.innerHTML = ''; }

function abrirExportar() {
  const atual = aba !== 'dados' ? ABAS.find((a) => a.id === aba)!.nome : null;
  const p = abrirPainel(`<h3>Exportar memória de cálculo</h3>
    ${atual ? `<p class="sub">Módulo atual: ${atual}</p>
    <div class="acoes"><button class="btn" data-e="pdf-atual">PDF – ${atual}</button><button class="btn sec" data-e="xlsx-atual">Excel – ${atual}</button></div>` : ''}
    <p class="sub">Todos os módulos</p>
    <div class="acoes"><button class="btn" data-e="pdf-todos">PDF completo</button><button class="btn sec" data-e="xlsx-todos">Excel completo</button></div>
    <button class="btn-sec largo" data-fechar>Fechar</button>`);
  p.querySelectorAll<HTMLButtonElement>('[data-e]').forEach((b) => {
    const [f, e] = b.dataset.e!.split('-');
    b.onclick = () => exportar(f as 'pdf' | 'xlsx', e as 'atual' | 'todos');
  });
}

function trocarProjeto(p: Projeto) {
  projeto = p;
  store.salvar(projeto);
  res = calcularTudo(projeto);
  fecharPainel();
  aba = 'dados';
  renderNav(); renderAba();
}

function abrirProjetos() {
  store.salvar(projeto);
  const lista = store.listar();
  const p = abrirPainel(`<h3>Estudos salvos</h3>
    <ul class="lista-proj">${lista.map((x) => `<li class="${x.info.id === projeto.info.id ? 'atual' : ''}">
      <button class="abrir" data-abrir="${x.info.id}"><strong>${esc(x.info.nome || 'Sem nome')}</strong>
      <small>${esc(x.info.local || '')} · ${new Date(x.info.atualizadoEm).toLocaleDateString('pt-BR')}</small></button>
      <button class="mini" data-dup="${x.info.id}" title="Duplicar">⧉</button>
      <button class="mini" data-del="${x.info.id}" title="Excluir">🗑</button></li>`).join('')}</ul>
    <div class="acoes"><button class="btn" id="novoProj">+ Novo estudo</button><button class="btn sec" id="impProj">Importar (.json)</button></div>
    <button class="btn-sec largo" id="expProj">Backup do estudo atual (.json)</button>
    <button class="btn-sec largo" data-fechar>Fechar</button>`);
  p.querySelectorAll<HTMLElement>('[data-abrir]').forEach((b) => { b.onclick = () => trocarProjeto(lista.find((x) => x.info.id === b.dataset.abrir)!); });
  p.querySelectorAll<HTMLElement>('[data-dup]').forEach((b) => { b.onclick = () => trocarProjeto(store.duplicar(lista.find((x) => x.info.id === b.dataset.dup)!)); });
  p.querySelectorAll<HTMLElement>('[data-del]').forEach((b) => {
    b.onclick = () => {
      const alvo = lista.find((x) => x.info.id === b.dataset.del)!;
      if (!confirm(`Excluir o estudo "${alvo.info.nome}"?`)) return;
      store.excluir(alvo.info.id);
      if (alvo.info.id === projeto.info.id) { const resto = store.listar(); trocarProjeto(resto[0] ?? novoProjeto()); } else abrirProjetos();
    };
  });
  $('#novoProj').onclick = () => {
    const nome = prompt('Nome do novo estudo:', 'Novo estudo');
    if (nome !== null) trocarProjeto(novoProjeto(nome || 'Novo estudo'));
  };
  $('#expProj').onclick = async () => {
    const { salvarArquivo, nomeArquivo } = await import('./export/salvar');
    await salvarArquivo(new Blob([JSON.stringify(projeto, null, 2)], { type: 'application/json' }), nomeArquivo(projeto.info.nome, 'estudo', 'json'));
  };
  $('#impProj').onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = async () => {
      const f = inp.files?.[0]; if (!f) return;
      try { trocarProjeto(store.importar(await f.text())); toast('Estudo importado.'); } catch { toast('Arquivo inválido.'); }
    };
    inp.click();
  };
}

renderShell();
store.salvar(projeto);
