import {
  DN_COMERCIAIS, G, POTENCIAS_CV, Passo, Resultado, Verificacao, area, fmt, folgaMotor, proximoComercial,
  swameeJain, verif,
} from './core';
import { DadosBasicos, calcDemanda } from './demanda';

export interface EntradaAdutora {
  tipo: 'bruta' | 'tratada';
  tempoBombeamento: number; // h
  perdasEta: number; // % (somente água bruta)
  metodoDiametro: 'forchheimer' | 'bresse';
  kBresse: number;
  dnAdotado: number; // mm (0 = automático)
  comprimento: number; // m
  formulaPerda: 'universal' | 'hazen';
  cHazen: number;
  rugosidade: number; // mm
  viscosidade: number; // m²/s
  somaK: number; // Σk das singularidades
  cotaInicial: number; // m
  cotaFinal: number; // m
  alturaChegada: number; // m
  kAllievi: number;
  espessura: number; // mm
  psa: number; // mca
  rendimento: number; // %
}

export const ADUTORA_PADRAO: EntradaAdutora = {
  tipo: 'bruta',
  tempoBombeamento: 18,
  perdasEta: 5,
  metodoDiametro: 'forchheimer',
  kBresse: 1.2,
  dnAdotado: 0,
  comprimento: 7460.46,
  formulaPerda: 'universal',
  cHazen: 130,
  rugosidade: 0.1,
  viscosidade: 1.01e-6,
  somaK: 7.28,
  cotaInicial: 24.4,
  cotaFinal: 80.28,
  alturaChegada: 5.5,
  kAllievi: 18,
  espessura: 8.9,
  psa: 100,
  rendimento: 60,
};

export interface SaidaAdutora {
  qmd: number; qaSemPerdas: number; qa: number; dCalc: number; dn: number; v: number; jHazen: number; jUniversal: number;
  j: number; hl: number; hf: number; hg: number; hmt: number; celeridade: number; hm: number; ps: number;
  pCalc: number; folga: number; pCorr: number; pAdot: number; ventosas: number;
}

export function calcAdutora(db: DadosBasicos, e: EntradaAdutora): Resultado<SaidaAdutora> {
  const dem = calcDemanda(db);
  const passos: Passo[] = [...dem.passos];
  const verificacoes: Verificacao[] = [];
  const NIT45 = 'NIT-0045';

  const qaSemPerdas = (dem.qmd * 24) / e.tempoBombeamento;
  passos.push({
    titulo: 'Vazão de adução (regime de bombeamento)', formula: "Qa' = Qmd × 24 / t",
    subst: `Qa' = ${fmt(dem.qmd)} × 24 / ${fmt(e.tempoBombeamento, 1)}`, valor: qaSemPerdas, unidade: 'L/s', ref: 'NIT-0047 5.7.8.3 (t = 18 h)',
  });
  const perdas = e.tipo === 'bruta' ? e.perdasEta : 0;
  const qa = qaSemPerdas * (1 + perdas / 100);
  passos.push({
    titulo: e.tipo === 'bruta' ? 'Vazão de adução com perdas no tratamento' : 'Vazão de adução (água tratada)',
    formula: "Qa = Qa' × (1 + perdas)", subst: `Qa = ${fmt(qaSemPerdas)} × (1 + ${fmt(perdas / 100, 2)})`,
    valor: qa, unidade: 'L/s', ref: `${NIT45} 5.3.1`,
  });
  const q = qa / 1000;

  let dCalc: number;
  if (e.metodoDiametro === 'forchheimer') {
    const x = e.tempoBombeamento / 24;
    dCalc = 1.3 * Math.pow(x, 0.25) * Math.sqrt(q);
    passos.push({
      titulo: 'Diâmetro econômico (Forchheimer)', formula: 'D = 1,3 × X^0,25 × √Q ; X = t/24',
      subst: `D = 1,3 × ${fmt(x, 3)}^0,25 × √${fmt(q, 5)}`, valor: dCalc * 1000, unidade: 'mm', dec: 1,
    });
  } else {
    dCalc = e.kBresse * Math.sqrt(q);
    passos.push({ titulo: 'Diâmetro econômico (Bresse)', formula: 'D = K × √Q', subst: `D = ${fmt(e.kBresse)} × √${fmt(q, 5)}`, valor: dCalc * 1000, unidade: 'mm', dec: 1 });
  }
  const dn = e.dnAdotado > 0 ? e.dnAdotado : proximoComercial(dCalc * 1000, DN_COMERCIAIS);
  passos.push({ titulo: 'Diâmetro adotado', formula: e.dnAdotado > 0 ? 'informado pelo usuário' : 'próximo DN comercial ≥ D calculado', valor: dn, unidade: 'mm', dec: 0 });
  const d = dn / 1000;
  const a = area(d);
  const v = q / a;
  passos.push({ titulo: 'Área da seção', formula: 'A = π × D² / 4', subst: `A = π × ${fmt(d, 3)}² / 4`, valor: a, unidade: 'm²', dec: 4 });
  passos.push({ titulo: 'Velocidade', formula: 'V = Q / A', subst: `V = ${fmt(q, 5)} / ${fmt(a, 4)}`, valor: v, unidade: 'm/s' });

  const jHazen = 10.643 * Math.pow(q, 1.85) * Math.pow(e.cHazen, -1.85) * Math.pow(d, -4.87);
  const re = (4 * q) / (Math.PI * d * e.viscosidade);
  const f = swameeJain(e.rugosidade / 1000, d, re);
  const jUniversal = (f / d) * (v * v) / (2 * G);
  passos.push({
    titulo: 'Perda unitária – Hazen-Williams', formula: 'J = 10,643 × Q^1,85 × C^-1,85 × D^-4,87',
    subst: `J = 10,643 × ${fmt(q, 5)}^1,85 × ${fmt(e.cHazen, 0)}^-1,85 × ${fmt(d, 3)}^-4,87`, valor: jHazen, unidade: 'm/m', dec: 5,
  });
  passos.push({ titulo: 'Número de Reynolds', formula: 'Re = 4Q / (π D ν)', subst: `Re = 4 × ${fmt(q, 5)} / (π × ${fmt(d, 3)} × ${fmt(e.viscosidade, 2)})`, valor: re, dec: 0 });
  passos.push({
    titulo: 'Fator de atrito (Swamee-Jain)', formula: 'f = 0,25 / [log(ε/3,7D + 5,74/Re^0,9)]²',
    subst: `ε = ${fmt(e.rugosidade, 3)} mm`, valor: f, dec: 4,
  });
  passos.push({ titulo: 'Perda unitária – Fórmula Universal', formula: 'J = f/D × V²/2g', subst: `J = ${fmt(f, 4)}/${fmt(d, 3)} × ${fmt(v)}²/(2 × 9,81)`, valor: jUniversal, unidade: 'm/m', dec: 5, ref: `${NIT45} 5.3.7 (preferencial)` });
  const j = e.formulaPerda === 'universal' ? jUniversal : jHazen;
  const hl = e.somaK * (v * v) / (2 * G);
  passos.push({ titulo: 'Perda de carga localizada', formula: 'Hl = Σk × V²/2g', subst: `Hl = ${fmt(e.somaK)} × ${fmt(v)}²/(2 × 9,81)`, valor: hl, unidade: 'm', dec: 3 });
  const hf = j * e.comprimento + hl;
  passos.push({
    titulo: `Perda de carga total (${e.formulaPerda === 'universal' ? 'Universal' : 'Hazen-Williams'})`, formula: 'Hf = J × L + Hl',
    subst: `Hf = ${fmt(j, 5)} × ${fmt(e.comprimento, 1)} + ${fmt(hl, 3)}`, valor: hf, unidade: 'm',
  });
  const hg = e.cotaFinal - e.cotaInicial + e.alturaChegada;
  passos.push({ titulo: 'Desnível geométrico', formula: 'Hg = Cota final − Cota inicial + altura de chegada', subst: `Hg = ${fmt(e.cotaFinal)} − ${fmt(e.cotaInicial)} + ${fmt(e.alturaChegada)}`, valor: hg, unidade: 'm' });
  const hmt = hg + hf;
  passos.push({ titulo: 'Altura manométrica total', formula: 'Hmt = Hg + Hf', subst: `Hmt = ${fmt(hg)} + ${fmt(hf)}`, valor: hmt, unidade: 'mca' });

  const celeridade = 9900 / Math.sqrt(48.3 + e.kAllievi * (dn / e.espessura));
  passos.push({ titulo: 'Celeridade da onda (Allievi)', formula: 'c = 9900 / √(48,3 + K × D/e)', subst: `c = 9900 / √(48,3 + ${fmt(e.kAllievi, 1)} × ${fmt(dn, 0)}/${fmt(e.espessura, 1)})`, valor: celeridade, unidade: 'm/s', dec: 1 });
  const hm = (celeridade * v) / G;
  passos.push({ titulo: 'Sobrepressão máxima (Joukowsky)', formula: 'hm = c × V / g', subst: `hm = ${fmt(celeridade, 1)} × ${fmt(v)} / 9,81`, valor: hm, unidade: 'mca' });
  const ps = hm + hg;
  passos.push({ titulo: 'Pressão máxima com golpe', formula: 'Ps = hm + Hg', subst: `Ps = ${fmt(hm)} + ${fmt(hg)}`, valor: ps, unidade: 'mca' });

  const pCalc = (qa * hmt) / (75 * (e.rendimento / 100));
  passos.push({ titulo: 'Potência da bomba', formula: 'P = Qa × Hmt / (75 × η)', subst: `P = ${fmt(qa)} × ${fmt(hmt)} / (75 × ${fmt(e.rendimento / 100)})`, valor: pCalc, unidade: 'cv' });
  const folga = folgaMotor(pCalc);
  const pCorr = pCalc * (1 + folga);
  passos.push({ titulo: 'Potência com folga do motor', formula: 'Pc = P × (1 + f)', subst: `Pc = ${fmt(pCalc)} × (1 + ${fmt(folga)})`, valor: pCorr, unidade: 'cv', ref: 'Azevedo Netto (folgas); NIT-0047 5.7.10.4' });
  const pAdot = proximoComercial(pCorr, POTENCIAS_CV);
  passos.push({ titulo: 'Potência comercial adotada', formula: 'próxima potência padronizada ≥ Pc', valor: pAdot, unidade: 'cv', dec: 2, ref: 'NIT-0047 5.7.10.3 (NBR 5432)' });
  const ventosas = Math.max(1, Math.ceil(e.comprimento / 800));

  const vmin = e.tipo === 'bruta' ? 0.6 : 0.3;
  verificacoes.push(verif(v >= vmin && v <= 3, 'Velocidade na adutora', `${fmt(v)} m/s dentro de ${fmt(vmin, 1)}–3,0 m/s`, `${fmt(v)} m/s fora de ${fmt(vmin, 1)}–3,0 m/s`, `${NIT45} 5.3.8.1`));
  verificacoes.push(verif(j <= 0.008, 'Perda de carga unitária', `${fmt(j, 4)} m/m ≤ 0,008 m/m`, `${fmt(j, 4)} m/m > 0,008 m/m – justificar técnica e economicamente`, `${NIT45} 5.3.9`, 'alerta'));
  verificacoes.push(verif(dn >= 50, 'Diâmetro mínimo', 'DN ≥ 50 mm', 'DN abaixo de 50 mm', `${NIT45} 5.3.10`));
  verificacoes.push(verif(hmt <= e.psa / 1.15, 'Folga de pressão (15%)', `Hmt = ${fmt(hmt, 1)} ≤ PSA/1,15 = ${fmt(e.psa / 1.15, 1)} mca`, `Hmt = ${fmt(hmt, 1)} > PSA/1,15 = ${fmt(e.psa / 1.15, 1)} mca – rever classe do tubo ou DN`, `${NIT45} 5.3.6`));
  verificacoes.push(verif(ps <= e.psa, 'Pressão com golpe de aríete', `Ps = ${fmt(ps, 1)} ≤ PSA = ${fmt(e.psa, 0)} mca`, `Ps = ${fmt(ps, 1)} > PSA = ${fmt(e.psa, 0)} mca – prever proteção contra transientes`, `${NIT45} 5.5`, 'alerta'));
  verificacoes.push({ titulo: 'Estudo de transientes', status: 'info', msg: 'O golpe calculado é estimativa preliminar (manobra rápida). O projeto exige estudo de transientes; subpressão máxima −2 mca.', ref: `${NIT45} 5.3.5 / 5.5.2` });
  verificacoes.push({ titulo: 'Ventosas', status: 'info', msg: `Prever ventosas nos pontos altos e, em média, a cada 800 m (≈ ${ventosas} unid.).`, ref: `${NIT45} 5.4.4` });
  verificacoes.push({ titulo: 'Conjunto motobomba', status: 'info', msg: `Adotar ${fmt(pAdot, pAdot < 1 ? 2 : 0)} cv com 1 + 1 reserva instalada. Verificar NPSHd ≥ 1,2 × NPSHr e ≥ NPSHr + 0,5 m na curva do fabricante.`, ref: 'NIT-0046 4.3.21; NIT-0047 5.7.10.2' });

  const entradas = [
    { label: 'Tipo de água', valor: e.tipo === 'bruta' ? 'Bruta' : 'Tratada' },
    { label: 'Tempo de bombeamento', valor: e.tempoBombeamento, unidade: 'h' },
    { label: 'Perdas no tratamento', valor: perdas, unidade: '%' },
    { label: 'Comprimento da adutora', valor: e.comprimento, unidade: 'm' },
    { label: 'Fórmula de perda adotada', valor: e.formulaPerda === 'universal' ? 'Universal' : 'Hazen-Williams' },
    { label: 'C (Hazen-Williams)', valor: e.cHazen },
    { label: 'Rugosidade ε', valor: e.rugosidade, unidade: 'mm' },
    { label: 'Σk singularidades', valor: e.somaK },
    { label: 'Cota inicial', valor: e.cotaInicial, unidade: 'm' },
    { label: 'Cota final', valor: e.cotaFinal, unidade: 'm' },
    { label: 'Altura de chegada', valor: e.alturaChegada, unidade: 'm' },
    { label: 'K (Allievi)', valor: e.kAllievi },
    { label: 'Espessura da parede', valor: e.espessura, unidade: 'mm' },
    { label: 'PSA do tubo', valor: e.psa, unidade: 'mca' },
    { label: 'Rendimento do conjunto', valor: e.rendimento, unidade: '%' },
  ];

  return {
    modulo: 'adutora', titulo: 'Adutora e conjunto motobomba', entradas, passos, verificacoes,
    resumo: [
      { label: 'Vazão de adução', valor: qa, unidade: 'L/s', destaque: true },
      { label: 'DN adotado', valor: dn, unidade: 'mm', dec: 0, destaque: true },
      { label: 'Velocidade', valor: v, unidade: 'm/s' },
      { label: 'Hmt', valor: hmt, unidade: 'mca', destaque: true },
      { label: 'Pressão c/ golpe', valor: ps, unidade: 'mca' },
      { label: 'Potência adotada', valor: pAdot, unidade: 'cv', dec: 0, destaque: true },
    ],
    out: { qmd: dem.qmd, qaSemPerdas, qa, dCalc, dn, v, jHazen, jUniversal, j, hl, hf, hg, hmt, celeridade, hm, ps, pCalc, folga, pCorr, pAdot, ventosas },
  };
}
