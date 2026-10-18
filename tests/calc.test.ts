// Valores de referência: planilha "DIMENSIONAMENTO ETA - revisada v2.xlsx" (recalculada).
import { describe, expect, it } from 'vitest';
import { DADOS_BASICOS_PADRAO, calcDemanda } from '../src/calc/demanda';
import { ADUTORA_PADRAO, calcAdutora } from '../src/calc/adutora';
import { RESERVACAO_PADRAO, calcReservacao } from '../src/calc/reservacao';
import { FILTRO_PADRAO, calcFiltro, porosidadeExpandida } from '../src/calc/filtro';
import { LAVAGEM_PADRAO, calcLavagem } from '../src/calc/lavagem';
import { swameeJain } from '../src/calc/core';

const near = (a: number, b: number, rel = 0.005) => expect(Math.abs(a - b) / Math.max(Math.abs(b), 1e-12)).toBeLessThan(rel);

describe('Demanda', () => {
  it('população e vazões', () => {
    const d = calcDemanda(DADOS_BASICOS_PADRAO);
    near(d.p0, 9476.46, 1e-9);
    near(d.p, 14081.521060093, 1e-9);
    near(d.qm, 16.2980567825151, 1e-9);
    near(d.qmd, 19.5576681390181, 1e-9);
    near(d.qmh, 29.3365022085272, 1e-9);
  });
  it('modo população direta', () => {
    const d = calcDemanda({ ...DADOS_BASICOS_PADRAO, modoPop: 'populacao', populacaoAtual: 1000, alcance: 0 });
    expect(d.p).toBe(1000);
  });
});

describe('Adutora (planilha: Bresse, DN 200, Hazen-Williams)', () => {
  const r = calcAdutora(DADOS_BASICOS_PADRAO, { ...ADUTORA_PADRAO, metodoDiametro: 'bresse', dnAdotado: 200, formulaPerda: 'hazen' });
  const o = r.out;
  it('vazões e diâmetro', () => {
    near(o.qaSemPerdas, 26.0768908520242, 1e-9);
    near(o.qa, 27.3807353946254, 1e-9);
    near(o.dCalc, 0.198565502966302, 1e-9);
  });
  it('hidráulica', () => {
    near(o.v, 0.871555876709169, 1e-6);
    near(o.jHazen, 0.00426114420540879, 1e-6);
    near(o.jUniversal, 0.00371621207758176, 1e-6);
    near(o.hl, 0.281853120516176, 1e-6);
    near(o.hf, 32.0719490192002, 1e-6);
    near(o.hg, 61.38, 1e-9);
    near(o.hmt, 93.4519490192002, 1e-6);
  });
  it('golpe e bomba', () => {
    near(o.celeridade, 465.248176591778, 1e-6);
    near(o.hm, 41.3343305236279, 1e-6);
    near(o.ps, 102.714330523628, 1e-6);
    near(o.pCalc, 56.8618464045942, 1e-6);
    near(o.pCorr, 62.5480310450537, 1e-6);
    expect(o.pAdot).toBe(75);
  });
  it('verificações normativas', () => {
    const folga = r.verificacoes.find((v) => v.titulo.startsWith('Folga de pressão'));
    expect(folga?.status).toBe('erro'); // 93,5 > 100/1,15
  });
  it('Forchheimer escolhe DN comercial ≥ calculado', () => {
    const f = calcAdutora(DADOS_BASICOS_PADRAO, ADUTORA_PADRAO).out;
    near(f.dCalc * 1000, 200.184857069701, 1e-6);
    expect(f.dn).toBe(250);
  });
});

describe('Reservação', () => {
  it('1/3 do volume do dia de maior consumo', () => {
    const r = calcReservacao(DADOS_BASICOS_PADRAO, RESERVACAO_PADRAO);
    near(r.out.vd, 1689.78252721116, 1e-9);
    near(r.out.vr, 563.260842403722, 1e-9);
    expect(r.verificacoes.some((v) => v.titulo === 'Número de câmaras')).toBe(true);
  });
});

describe('Filtro', () => {
  const qa = 27.3807353946254;
  const r = calcFiltro(FILTRO_PADRAO, qa);
  const o = r.out;
  it('dimensões', () => {
    near(o.qf, 9.12691179820845, 1e-9);
    near(o.qad, 788.56517936521, 1e-9);
    near(o.at, 6.57137649471009, 1e-9);
    near(o.dCalc, 2.8925657151408, 1e-9);
    expect(o.df).toBeCloseTo(2.9, 9);
    near(o.afr, 6.60519855417254, 1e-9);
    near(o.taxaReal, 119.38553745172, 1e-9);
  });
  it('fluidização e expansão', () => {
    near(o.ga, 32525.8767883226, 1e-6);
    near(o.vmf, 0.0117501040430135, 1e-6);
    near(o.pe, 0.504243652807084, 0.002);
    near(o.expansao, 21.0271947898064, 0.01);
    near(o.le, 1.51283993487258, 0.002);
    near(o.atf, 3.06283993487258, 0.002);
  });
  it('porosidades das subcamadas', () => {
    const ref = [0.624486110947199, 0.580091163885052, 0.538510143106475, 0.498120664165193, 0.460409111250266, 0.424849315084168, 0.391209155327233];
    // 5 primeiras subcamadas fluidizam (Vlav > Vmf da subcamada) e conferem com a planilha.
    o.pei.slice(0, 5).forEach((p, i) => near(p, ref[i], 0.003));
    // As 2 mais grossas têm Vmf > Vlav: não fluidizam, porosidade = P inicial
    // (a planilha forçava a solução, chegando a Pei < P na última).
    expect(o.pei[5]).toBe(0.4);
    expect(o.pei[6]).toBe(0.4);
  });
  it('lavagem e calha', () => {
    near(o.qlf, 0.110086642569542, 1e-9);
    near(o.hCalha, 0.355211912588359, 1e-6);
    expect(o.hCalhaAdot).toBeCloseTo(0.4, 9);
  });
  it('perdas na filtração', () => {
    near(o.h0, 0.00515895171166611, 1e-6);
    near(o.vf, 0.00138177705383935, 1e-9);
    near(o.h1, 0.172704698433083, 0.002);
    near(o.h2, 0.000643421016797368, 0.002);
    near(o.h3, 0.0536140856068302, 1e-6);
    near(o.ht, 0.232121156768376, 0.002);
  });
  it('espinha de peixe', () => {
    near(o.espLav.hfo, 0.395790943414063, 0.002); // planilha usa g = 9,8
    near(o.espFil.hfo, 0.00373600014770048, 0.002);
  });
  it('sem fluidização retorna porosidade inicial', () => {
    expect(porosidadeExpandida(0.002, 0.001, 0.7, 0.4, 995.7, 2650, 0.000798, 8.04e-7)).toBe(0.4);
  });
});

describe('Lavagem', () => {
  const sf = calcFiltro(FILTRO_PADRAO, 27.3807353946254).out;
  const o = calcLavagem(LAVAGEM_PADRAO, FILTRO_PADRAO, sf).out;
  it('perdas', () => {
    near(o.hlf, 1.24608315757758, 1e-6);
    near(o.hcs, 0.502586873556292, 1e-6);
    near(o.hsd, 0.750555841350998, 1e-6);
    near(o.vs, 1.14421768707483, 1e-6);
    near(o.fs, 0.01626271513995, 1e-4);
    near(o.ls, 113.005, 1e-9);
    near(o.hs, 0.350381349158796, 1e-4);
    near(o.vr, 1.55740740740741, 1e-6);
    near(o.lr, 39.39, 1e-9);
    near(o.hr, 0.267475443148344, 1e-4);
    near(o.hm, 8.11708266479201, 1e-4);
  });
  it('bomba e RAP', () => {
    near(o.pCalc, 18.3298949338746, 1e-4);
    near(o.pCorr, 21.0793791739558, 1e-4);
    expect(o.pAdot).toBe(25);
    near(o.volRap, 198.155956625176, 1e-6);
    expect(o.volRapAdot).toBe(200);
  });
});

describe('Swamee-Jain', () => {
  it('confere com planilha corrigida', () => {
    near(swameeJain(0.0001, 0.2, 172585.322120627), 0.0191972498833786, 1e-9);
  });
});
