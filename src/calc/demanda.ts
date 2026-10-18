import { Passo, fmt } from './core';

export interface DadosBasicos {
  modoPop: 'residencias' | 'populacao';
  nResidencias: number;
  taxaOcupacao: number; // hab/unidade
  populacaoAtual: number; // hab (quando modoPop = populacao)
  alcance: number; // anos
  crescimento: number; // % a.a.
  perCapita: number; // L/hab.dia
  k1: number;
  k2: number;
}

export const DADOS_BASICOS_PADRAO: DadosBasicos = {
  modoPop: 'residencias',
  nResidencias: 2507,
  taxaOcupacao: 3.78,
  populacaoAtual: 9476,
  alcance: 20,
  crescimento: 2,
  perCapita: 100,
  k1: 1.2,
  k2: 1.5,
};

export interface Demanda {
  p0: number;
  p: number;
  qm: number; // L/s
  qmd: number; // L/s
  qmh: number; // L/s
  passos: Passo[];
}

export function calcDemanda(d: DadosBasicos): Demanda {
  const passos: Passo[] = [];
  let p0: number;
  if (d.modoPop === 'residencias') {
    p0 = d.nResidencias * d.taxaOcupacao;
    passos.push({
      titulo: 'População atual', formula: "P₀ = Nº unidades × taxa de ocupação",
      subst: `P₀ = ${fmt(d.nResidencias, 0)} × ${fmt(d.taxaOcupacao)}`, valor: p0, unidade: 'hab', dec: 0,
    });
  } else {
    p0 = d.populacaoAtual;
    passos.push({ titulo: 'População atual (informada)', formula: 'P₀', valor: p0, unidade: 'hab', dec: 0 });
  }
  const p = p0 * Math.pow(1 + d.crescimento / 100, d.alcance);
  passos.push({
    titulo: 'População de projeto (crescimento geométrico)', formula: 'P = P₀ × (1 + i)ⁿ',
    subst: `P = ${fmt(p0, 0)} × (1 + ${fmt(d.crescimento / 100, 3)})^${d.alcance}`, valor: p, unidade: 'hab', dec: 0,
  });
  const qm = (p * d.perCapita) / 86400;
  passos.push({
    titulo: 'Vazão média de consumo', formula: 'Qm = P × q / 86400',
    subst: `Qm = ${fmt(p, 0)} × ${fmt(d.perCapita, 0)} / 86400`, valor: qm, unidade: 'L/s',
  });
  const qmd = qm * d.k1;
  passos.push({ titulo: 'Vazão do dia de maior consumo', formula: 'Qmd = Qm × K1', subst: `Qmd = ${fmt(qm)} × ${fmt(d.k1)}`, valor: qmd, unidade: 'L/s' });
  const qmh = qmd * d.k2;
  passos.push({ titulo: 'Vazão da hora de maior consumo', formula: 'Qmh = Qmd × K2', subst: `Qmh = ${fmt(qmd)} × ${fmt(d.k2)}`, valor: qmh, unidade: 'L/s' });
  return { p0, p, qm, qmd, qmh, passos };
}
