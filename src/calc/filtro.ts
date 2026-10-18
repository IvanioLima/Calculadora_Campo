import { G, Passo, Resultado, Verificacao, area, arredondaAcima, fmt, verif } from './core';

export interface Camada { x: number; dsup: number; dinf: number } // x = fração (leito) ou espessura (suporte, m); d em mm

export interface EntradaFiltro {
  usarVazaoAdutora: boolean;
  vazaoTotal: number; // L/s (quando não usa a adutora)
  numFiltros: number;
  taxa: number; // m³/m².d
  diametroAdotado: number; // m (0 = automático)
  espessuraLeito: number; // m
  porosidadeLeito: number;
  esfericidadeLeito: number;
  massaEspGraos: number; // kg/m³
  granulometriaExpansao: Camada[]; // x = fração do leito
  granulometriaFiltracao: Camada[]; // x = fração do leito (Kozeny-Carman)
  camadaSuporte: Camada[]; // x = espessura (m)
  porosidadeSuporte: number;
  esfericidadeSuporte: number;
  massaEspSuporte: number;
  temperaturaRef: string;
  massaEspAgua: number; // kg/m³
  viscAbsoluta: number; // N.s/m²
  viscCinematica: number; // m²/s
  velLavagem: number; // m/min
  larguraCalha: number; // m
  alturaCalhaAdotada: number; // m (0 = automático)
  folgaEspinha: number; // m
  folgaTampa: number; // m
  orificiosDrenagem: number;
  diamOrificioDrenagemPol: number;
  cd: number;
  vMaxEspinha: number; // m/s
  orificiosEspinhaLavagem: number;
  diamOrificioEspinhaLavagemMm: number;
  orificiosEspinhaFiltracao: number;
  diamOrificioEspinhaFiltracaoMm: number;
}

export const FILTRO_PADRAO: EntradaFiltro = {
  usarVazaoAdutora: true,
  vazaoTotal: 27.38,
  numFiltros: 3,
  taxa: 120,
  diametroAdotado: 0,
  espessuraLeito: 1.25,
  porosidadeLeito: 0.4,
  esfericidadeLeito: 0.7,
  massaEspGraos: 2650,
  granulometriaExpansao: [
    { x: 0.1, dsup: 0.71, dinf: 0.59 }, { x: 0.06, dsup: 0.84, dinf: 0.71 }, { x: 0.22, dsup: 1.0, dinf: 0.84 },
    { x: 0.18, dsup: 1.19, dinf: 1.0 }, { x: 0.2, dsup: 1.41, dinf: 1.19 }, { x: 0.08, dsup: 1.68, dinf: 1.41 },
    { x: 0.16, dsup: 2.0, dinf: 1.68 },
  ],
  granulometriaFiltracao: [
    { x: 0.4, dsup: 1.19, dinf: 1.0 }, { x: 0.2, dsup: 1.41, dinf: 1.19 }, { x: 0.2, dsup: 1.68, dinf: 1.41 },
    { x: 0.12, dsup: 2.0, dinf: 1.68 }, { x: 0.08, dsup: 2.4, dinf: 2.0 },
  ],
  camadaSuporte: [
    { x: 0.15, dsup: 38.1, dinf: 25.4 }, { x: 0.1, dsup: 25.4, dinf: 19.0 }, { x: 0.1, dsup: 19.0, dinf: 12.7 },
    { x: 0.1, dsup: 12.7, dinf: 6.4 }, { x: 0.1, dsup: 6.4, dinf: 3.2 },
  ],
  porosidadeSuporte: 0.45,
  esfericidadeSuporte: 0.85,
  massaEspSuporte: 2650,
  temperaturaRef: '≈ 30 °C',
  massaEspAgua: 995.7,
  viscAbsoluta: 0.000798,
  viscCinematica: 8.04e-7,
  velLavagem: 1.0,
  larguraCalha: 0.4,
  alturaCalhaAdotada: 0,
  folgaEspinha: 0.4,
  folgaTampa: 0.2,
  orificiosDrenagem: 165,
  diamOrificioDrenagemPol: 0.75,
  cd: 0.61,
  vMaxEspinha: 3.6,
  orificiosEspinhaLavagem: 132,
  diamOrificioEspinhaLavagemMm: 25,
  orificiosEspinhaFiltracao: 176,
  diamOrificioEspinhaFiltracaoMm: 20,
};

export interface SaidaFiltro {
  qTotal: number; qf: number; qad: number; at: number; dCalc: number; df: number; afr: number; taxaReal: number;
  deq: number; ga: number; vmf: number; vas: number; pe: number; pei: number[]; expansao: number; le: number;
  qlf: number; hCalha: number; hCalhaAdot: number; atf: number; lSuporte: number;
  h0: number; vf: number; h1: number; h2: number; h3: number; ht: number;
  espLav: { do: number; vc: number; hfo: number }; espFil: { do: number; vc: number; hfo: number };
}

/** Resolve a porosidade expandida de uma subcamada (equação de Di Bernardo / Libânio). */
export function porosidadeExpandida(d: number, vas: number, ce: number, p0: number, rho: number, rhoS: number, mu: number, nu: number): number {
  const gamma = rho * G;
  const vmf = (mu / (rho * d)) * (Math.sqrt(33.7 ** 2 + 0.0408 * ((gamma * (rhoS - rho) * d ** 3) / mu ** 2)) - 33.7);
  if (vas <= vmf) return p0;
  const k = (gamma * (rhoS - rho) * ce ** 3 * d ** 3) / (216 * mu ** 2);
  const meta = (pe: number) => {
    const lr = Math.log10((ce * vas * d) / (6 * (1 - pe) * nu));
    const la = Math.log10((pe ** 3 / (1 - pe) ** 2) * k);
    return 0.56543 + 1.09348 * lr + 0.17979 * lr * lr - 0.00392 * lr ** 4 - 1.5 * Math.log10(ce) ** 2 - la;
  };
  let lo = p0, hi = 0.98;
  let flo = meta(lo);
  if (flo * meta(hi) > 0) return p0;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2, fm = meta(mid);
    if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; }
  }
  return Math.max(p0, (lo + hi) / 2);
}

function espinha(q: number, vmax: number, n: number, doMm: number, cd: number) {
  const at = q / vmax;
  const ao = at / n;
  const dCalc = Math.sqrt((4 * ao) / Math.PI) * 1000;
  const aco = area(doMm / 1000);
  const vc = q / (n * aco);
  const hfo = (vc / cd) ** 2 / (2 * G);
  return { at, ao, dCalc, aco, vc, hfo, do: doMm };
}

export function calcFiltro(e: EntradaFiltro, qAdutora?: number): Resultado<SaidaFiltro> {
  const passos: Passo[] = [];
  const v: Verificacao[] = [];
  const rho = e.massaEspAgua, mu = e.viscAbsoluta, nu = e.viscCinematica, gamma = rho * G;
  const qTotal = e.usarVazaoAdutora && qAdutora !== undefined ? qAdutora : e.vazaoTotal;
  const qf = qTotal / e.numFiltros;
  passos.push({ titulo: 'Vazão por filtro', formula: 'Qf = Qa / Nf', subst: `Qf = ${fmt(qTotal)} / ${e.numFiltros}`, valor: qf, unidade: 'L/s' });
  const qad = qf * 86.4;
  passos.push({ titulo: 'Vazão por filtro em m³/d (regime)', formula: 'Qad = Qf × 86,4', subst: `Qad = ${fmt(qf)} × 86,4`, valor: qad, unidade: 'm³/d' });
  const at = qad / e.taxa;
  passos.push({ titulo: 'Área necessária', formula: 'At = Qad / Taxa', subst: `At = ${fmt(qad)} / ${fmt(e.taxa, 0)}`, valor: at, unidade: 'm²', ref: 'NBR 12216 (ascendente ≤ 120 m³/m².d)' });
  const dCalc = Math.sqrt((4 * at) / Math.PI);
  passos.push({ titulo: 'Diâmetro calculado', formula: 'D = √(4 At / π)', subst: `D = √(4 × ${fmt(at, 3)} / π)`, valor: dCalc, unidade: 'm', dec: 3 });
  const df = e.diametroAdotado > 0 ? e.diametroAdotado : arredondaAcima(dCalc, 0.1);
  passos.push({ titulo: 'Diâmetro adotado', formula: e.diametroAdotado > 0 ? 'informado' : 'D calculado arredondado p/ cima (0,10 m)', valor: df, unidade: 'm' });
  const afr = area(df);
  passos.push({ titulo: 'Área adotada', formula: 'Afr = π D² / 4', subst: `Afr = π × ${fmt(df)}² / 4`, valor: afr, unidade: 'm²', dec: 3 });
  const taxaReal = qad / afr;
  passos.push({ titulo: 'Taxa de filtração real', formula: 'Tf = Qad / Afr', subst: `Tf = ${fmt(qad)} / ${fmt(afr, 3)}`, valor: taxaReal, unidade: 'm³/m².d', dec: 1 });

  // Fluidização
  const ge = e.granulometriaExpansao;
  const dmin = Math.min(...ge.map((c) => c.dinf)), dmax = Math.max(...ge.map((c) => c.dsup));
  const deq = Math.sqrt(dmin * dmax) / 1000;
  passos.push({ titulo: 'Diâmetro equivalente dos grãos', formula: 'Deq = √(dmin × dmax)', subst: `Deq = √(${fmt(dmin)} × ${fmt(dmax)}) mm`, valor: deq * 1000, unidade: 'mm', dec: 3 });
  const ga = (deq ** 3 * rho * G * (e.massaEspGraos - rho)) / mu ** 2;
  passos.push({ titulo: 'Número de Galileu', formula: 'Ga = Deq³ ρ (ρs − ρ) g / μ²', valor: ga, dec: 0 });
  const vmf = (mu / (rho * deq)) * (Math.sqrt(33.7 ** 2 + 0.0408 * ga) - 33.7);
  passos.push({ titulo: 'Velocidade mínima de fluidização (Wen & Yu)', formula: 'Vmf = μ/(ρ Deq) × [√(33,7² + 0,0408 Ga) − 33,7]', valor: vmf * 60, unidade: 'm/min', dec: 3 });
  const vas = e.velLavagem / 60;
  passos.push({ titulo: 'Velocidade de lavagem adotada', formula: 'Vlav', valor: e.velLavagem, unidade: 'm/min' });
  const pei = ge.map((c) => porosidadeExpandida(Math.sqrt(c.dsup * c.dinf) / 1000, vas, e.esfericidadeLeito, e.porosidadeLeito, rho, e.massaEspGraos, mu, nu));
  const somaX = ge.reduce((s, c) => s + c.x, 0);
  const soma = ge.reduce((s, c, i) => s + c.x / somaX / (1 - pei[i]), 0);
  const pe = 1 - 1 / soma;
  passos.push({ titulo: 'Porosidade do leito expandido', formula: 'Pe = 1 − 1 / Σ[xi / (1 − Pei)]', subst: `Pei (por subcamada) = ${pei.map((p) => fmt(p, 3)).join('; ')}`, valor: pe, dec: 4, ref: 'Libânio (2008) / Di Bernardo (2003)' });
  const expansao = (100 * (pe - e.porosidadeLeito)) / (1 - pe);
  passos.push({ titulo: 'Expansão do leito', formula: 'E = (Pe − P) / (1 − Pe) × 100', subst: `E = (${fmt(pe, 4)} − ${fmt(e.porosidadeLeito)}) / (1 − ${fmt(pe, 4)}) × 100`, valor: expansao, unidade: '%', dec: 1 });
  const le = (e.espessuraLeito * (1 - e.porosidadeLeito)) / (1 - pe);
  passos.push({ titulo: 'Altura do leito expandido', formula: 'Le = L × (1 − P) / (1 − Pe)', subst: `Le = ${fmt(e.espessuraLeito)} × (1 − ${fmt(e.porosidadeLeito)}) / (1 − ${fmt(pe, 4)})`, valor: le, unidade: 'm', dec: 3 });

  const qlf = (afr * e.velLavagem) / 60;
  passos.push({ titulo: 'Vazão de lavagem', formula: 'Qlf = Afr × Vlav', subst: `Qlf = ${fmt(afr, 3)} × ${fmt(e.velLavagem)} / 60`, valor: qlf * 1000, unidade: 'L/s', dec: 1 });
  const hCalha = (qlf / (1.3 * e.larguraCalha)) ** (2 / 3);
  passos.push({ titulo: 'Lâmina máxima na calha coletora', formula: 'H = [Q / (1,3 b)]^(2/3)', subst: `H = [${fmt(qlf, 4)} / (1,3 × ${fmt(e.larguraCalha)})]^(2/3)`, valor: hCalha, unidade: 'm', dec: 3 });
  const hCalhaAdot = e.alturaCalhaAdotada > 0 ? e.alturaCalhaAdotada : arredondaAcima(hCalha, 0.05);
  passos.push({ titulo: 'Altura da calha adotada', formula: e.alturaCalhaAdotada > 0 ? 'informada' : 'arredondada p/ cima (0,05 m)', valor: hCalhaAdot, unidade: 'm' });
  const lSuporte = e.camadaSuporte.reduce((s, c) => s + c.x, 0);
  const atf = le + lSuporte + hCalhaAdot + e.folgaEspinha + e.folgaTampa;
  passos.push({ titulo: 'Altura total do filtro', formula: 'Atf = Le + Lsuporte + Hcalha + EP + folga', subst: `Atf = ${fmt(le, 3)} + ${fmt(lSuporte)} + ${fmt(hCalhaAdot)} + ${fmt(e.folgaEspinha)} + ${fmt(e.folgaTampa)}`, valor: atf, unidade: 'm' });

  // Perdas de carga na filtração (leito limpo)
  const qfm = qf / 1000;
  const doDren = e.diamOrificioDrenagemPol * 0.0254;
  const aoDren = area(doDren);
  const qo = qfm / e.orificiosDrenagem;
  const h0 = (qo / (e.cd * aoDren)) ** 2 / (2 * G);
  passos.push({ titulo: 'Perda no sistema de drenagem (filtração)', formula: 'h0 = [Qo / (Cd Ao)]² / 2g ; Qo = Qf / No', subst: `Qo = ${fmt(qo, 6)} m³/s ; Ao = ${fmt(aoDren, 6)} m²`, valor: h0, unidade: 'm', dec: 4 });
  const vf = qfm / afr;
  passos.push({ titulo: 'Velocidade de filtração', formula: 'Vf = Qf / Afr', subst: `Vf = ${fmt(qfm, 5)} / ${fmt(afr, 3)}`, valor: vf, unidade: 'm/s', dec: 5 });
  const gf = e.granulometriaFiltracao;
  const sxf = gf.reduce((s, c) => s + c.x, 0);
  const somaLeito = gf.reduce((s, c) => s + c.x / sxf / ((c.dsup / 1000) * (c.dinf / 1000)), 0);
  const P = e.porosidadeLeito;
  const h1 = (180 * mu * (1 - P) ** 2 * vf * e.espessuraLeito * somaLeito) / (gamma * P ** 3 * e.esfericidadeLeito ** 2);
  passos.push({ titulo: 'Perda no leito filtrante (Kozeny-Carman)', formula: 'h1 = 180 μ (1−P)² Vf L Σ(xi/di²) / (γ P³ Ce²)', subst: `Σ(xi/di²) = ${fmt(somaLeito, 0)} m⁻²`, valor: h1, unidade: 'm', dec: 4 });
  const sxs = lSuporte;
  const somaSup = e.camadaSuporte.reduce((s, c) => s + c.x / sxs / ((c.dsup / 1000) * (c.dinf / 1000)), 0);
  const Ps = e.porosidadeSuporte;
  const h2 = (180 * mu * (1 - Ps) ** 2 * vf * lSuporte * somaSup) / (gamma * Ps ** 3 * e.esfericidadeSuporte ** 2);
  passos.push({ titulo: 'Perda na camada suporte (Kozeny-Carman)', formula: 'h2 = 180 μ (1−P)² Vf L Σ(xi/di²) / (γ P³ Cs²)', subst: `Σ(xi/di²) = ${fmt(somaSup, 0)} m⁻²`, valor: h2, unidade: 'm', dec: 5 });
  const h3 = (qfm / (1.838 * e.larguraCalha)) ** (2 / 3);
  passos.push({ titulo: 'Perda no vertedor de saída', formula: 'h3 = [Qf / (1,838 b)]^(2/3)', subst: `h3 = [${fmt(qfm, 5)} / (1,838 × ${fmt(e.larguraCalha)})]^(2/3)`, valor: h3, unidade: 'm', dec: 4 });
  const ht = h0 + h1 + h2 + h3;
  passos.push({ titulo: 'Perda de carga total na filtração (leito limpo)', formula: 'HT = h0 + h1 + h2 + h3', valor: ht, unidade: 'm', dec: 3 });

  // Tubos distribuidores (espinha de peixe)
  const el = espinha(qlf, e.vMaxEspinha, e.orificiosEspinhaLavagem, e.diamOrificioEspinhaLavagemMm, e.cd);
  passos.push({ titulo: 'Espinha de peixe (lavagem) – Ø orifício calculado', formula: 'At = Q/Vmáx ; Ao = At/No ; Do = √(4Ao/π)', subst: `No = ${e.orificiosEspinhaLavagem}`, valor: el.dCalc, unidade: 'mm', dec: 1 });
  passos.push({ titulo: 'Espinha de peixe (lavagem) – perda nos orifícios', formula: "Vc = Q/(No Aco) ; Hfo = (Vc/Cd)²/2g", subst: `Do' = ${fmt(el.do, 0)} mm ; Vc = ${fmt(el.vc)} m/s`, valor: el.hfo, unidade: 'm', dec: 3 });
  const ef = espinha(qfm, e.vMaxEspinha, e.orificiosEspinhaFiltracao, e.diamOrificioEspinhaFiltracaoMm, e.cd);
  passos.push({ titulo: 'Espinha de peixe (filtração) – Ø orifício calculado', formula: 'At = Q/Vmáx ; Ao = At/No ; Do = √(4Ao/π)', subst: `No = ${e.orificiosEspinhaFiltracao}`, valor: ef.dCalc, unidade: 'mm', dec: 1 });
  passos.push({ titulo: 'Espinha de peixe (filtração) – perda nos orifícios', formula: "Vc = Q/(No Aco) ; Hfo = (Vc/Cd)²/2g", subst: `Do' = ${fmt(ef.do, 0)} mm ; Vc = ${fmt(ef.vc)} m/s`, valor: ef.hfo, unidade: 'm', dec: 4 });

  v.push(verif(taxaReal <= e.taxa + 1e-9 && taxaReal <= 120, 'Taxa de filtração', `${fmt(taxaReal, 1)} m³/m².d ≤ 120`, `${fmt(taxaReal, 1)} m³/m².d acima do limite – aumentar diâmetro ou nº de filtros`, 'NBR 12216'));
  v.push(verif(expansao >= 20 && expansao <= 30, 'Expansão do leito na lavagem', `${fmt(expansao, 1)}% dentro de 20–30%`, `${fmt(expansao, 1)}% fora de 20–30% – ajustar velocidade de lavagem`, 'NBR 12216; ITCOA241 Nota 3', 'alerta'));
  v.push(verif(vas > vmf, 'Velocidade de lavagem × fluidização', `Vlav (${fmt(e.velLavagem)} m/min) > Vmf (${fmt(vmf * 60, 2)} m/min)`, `Vlav ≤ Vmf (${fmt(vmf * 60, 2)} m/min): leito não fluidiza`, 'Wen & Yu'));
  v.push(verif(hCalhaAdot >= hCalha, 'Calha coletora', `Altura adotada ${fmt(hCalhaAdot)} m ≥ lâmina ${fmt(hCalha, 3)} m`, `Altura adotada menor que a lâmina (${fmt(hCalha, 3)} m)`, undefined));
  v.push({ titulo: 'Granulometria', status: 'info', msg: 'A expansão usa a granulometria 0,59–2,00 mm e a perda na filtração usa 1,00–2,40 mm (valores da planilha base). Ajuste em "Avançado" se o leito for outro.' });

  return {
    modulo: 'filtro', titulo: 'Filtro ascendente', passos, verificacoes: v,
    entradas: [
      { label: 'Vazão total afluente', valor: qTotal, unidade: 'L/s' },
      { label: 'Número de filtros', valor: e.numFiltros },
      { label: 'Taxa de filtração', valor: e.taxa, unidade: 'm³/m².d' },
      { label: 'Espessura do leito', valor: e.espessuraLeito, unidade: 'm' },
      { label: 'Porosidade do leito', valor: e.porosidadeLeito },
      { label: 'Esfericidade do leito', valor: e.esfericidadeLeito },
      { label: 'Massa específica dos grãos', valor: e.massaEspGraos, unidade: 'kg/m³' },
      { label: 'Água: massa específica', valor: rho, unidade: 'kg/m³' },
      { label: 'Água: viscosidade absoluta', valor: mu, unidade: 'N.s/m²' },
      { label: 'Água: viscosidade cinemática', valor: nu, unidade: 'm²/s' },
      { label: 'Velocidade de lavagem', valor: e.velLavagem, unidade: 'm/min' },
      { label: 'Largura da calha', valor: e.larguraCalha, unidade: 'm' },
      { label: 'Orifícios de drenagem', valor: e.orificiosDrenagem },
    ],
    resumo: [
      { label: 'Diâmetro do filtro', valor: df, unidade: 'm', destaque: true },
      { label: 'Área por filtro', valor: afr, unidade: 'm²' },
      { label: 'Taxa real', valor: taxaReal, unidade: 'm³/m².d', dec: 1, destaque: true },
      { label: 'Altura total', valor: atf, unidade: 'm', destaque: true },
      { label: 'Expansão', valor: expansao, unidade: '%', dec: 1 },
      { label: 'Vazão de lavagem', valor: qlf * 1000, unidade: 'L/s', dec: 1 },
    ],
    out: {
      qTotal, qf, qad, at, dCalc, df, afr, taxaReal, deq, ga, vmf, vas, pe, pei, expansao, le, qlf, hCalha, hCalhaAdot,
      atf, lSuporte, h0, vf, h1, h2, h3, ht, espLav: { do: el.do, vc: el.vc, hfo: el.hfo }, espFil: { do: ef.do, vc: ef.vc, hfo: ef.hfo },
    },
  };
}
