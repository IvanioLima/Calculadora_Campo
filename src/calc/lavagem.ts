import {
  G, POTENCIAS_CV, Passo, Resultado, Verificacao, area, arredondaAcima, fmt, folgaMotor, proximoComercial, swameeJain,
  verif, vmaxSuccao,
} from './core';
import { EntradaFiltro, SaidaFiltro } from './filtro';

export interface EntradaLavagem {
  hg: number; // m – nível mínimo do RAP até a borda da calha
  dnSuccao: number; // mm
  bombaAfogada: boolean;
  coefSuccao: number; // Σ comprimentos equivalentes da sucção (múltiplos de D)
  comprimentoSuccao: number; // m (trecho reto)
  dnRecalque: number; // mm
  comprimentoRecalque: number; // m
  coefRecalque: number; // Σ comprimentos equivalentes do recalque (múltiplos de D)
  rugosidade: number; // mm
  perdaFundo: number; // m
  rendimento: number; // %
  tempoLavagem: number; // min
}

export const LAVAGEM_PADRAO: EntradaLavagem = {
  hg: 4.0,
  dnSuccao: 350,
  bombaAfogada: true,
  coefSuccao: 314.3,
  comprimentoSuccao: 3,
  dnRecalque: 300,
  comprimentoRecalque: 15,
  coefRecalque: 81.3,
  rugosidade: 0.1,
  perdaFundo: 1.0,
  rendimento: 65,
  tempoLavagem: 10,
};

export interface SaidaLavagem {
  qlf: number; hlf: number; hcs: number; hsd: number; vs: number; vmaxS: number; res: number; fs: number; js: number; ls: number; hs: number;
  vr: number; rer: number; fr: number; jr: number; lr: number; hr: number; somaH: number; hm: number; pCalc: number; folga: number;
  pCorr: number; pAdot: number; volLavagem: number; volRap: number; volRapAdot: number;
}

export function calcLavagem(e: EntradaLavagem, f: EntradaFiltro, sf: SaidaFiltro): Resultado<SaidaLavagem> {
  const passos: Passo[] = [];
  const v: Verificacao[] = [];
  const rho = f.massaEspAgua, nu = f.viscCinematica;
  const qlf = sf.qlf;
  passos.push({ titulo: 'Vazão de lavagem (do módulo Filtro)', formula: 'Qlf = Afr × Vlav', subst: `Afr = ${fmt(sf.afr, 3)} m² ; Vlav = ${fmt(f.velLavagem)} m/min`, valor: qlf * 1000, unidade: 'L/s', dec: 1 });

  const hlf = (f.massaEspGraos / rho - 1) * (1 - f.porosidadeLeito) * f.espessuraLeito;
  passos.push({ titulo: 'Perda no leito filtrante (fluidizado)', formula: 'Hlf = (ρs/ρ − 1) × (1 − P) × L', subst: `Hlf = (${fmt(f.massaEspGraos, 0)}/${fmt(rho, 1)} − 1) × (1 − ${fmt(f.porosidadeLeito)}) × ${fmt(f.espessuraLeito)}`, valor: hlf, unidade: 'm', dec: 3 });
  const hcs = (f.massaEspSuporte / rho - 1) * (1 - f.porosidadeSuporte) * sf.lSuporte;
  passos.push({ titulo: 'Perda na camada suporte', formula: 'Hcs = (ρs/ρ − 1) × (1 − Ps) × Ls', subst: `Hcs = (${fmt(f.massaEspSuporte, 0)}/${fmt(rho, 1)} − 1) × (1 − ${fmt(f.porosidadeSuporte)}) × ${fmt(sf.lSuporte)}`, valor: hcs, unidade: 'm', dec: 3, ref: 'Conservador. Alternativa usual: ≈ Vlav(m/min) × Ls / 3' });
  const ao = area(f.diamOrificioDrenagemPol * 0.0254);
  const qo = qlf / f.orificiosDrenagem;
  const hsd = (qo / (f.cd * ao)) ** 2 / (2 * G);
  passos.push({ titulo: 'Perda no sistema de drenagem', formula: 'Hsd = [Qo / (Cd Ao)]² / 2g ; Qo = Qlf / No', subst: `Qo = ${fmt(qo, 6)} m³/s ; Vo = ${fmt(qo / ao)} m/s`, valor: hsd, unidade: 'm', dec: 3 });

  // Sucção
  const ds = e.dnSuccao / 1000;
  const vs = qlf / area(ds);
  const vmaxS = vmaxSuccao(e.dnSuccao, e.bombaAfogada);
  passos.push({ titulo: 'Velocidade na sucção', formula: 'Vs = Qlf / (π ds² / 4)', subst: `ds = ${fmt(e.dnSuccao, 0)} mm`, valor: vs, unidade: 'm/s' });
  const res = (4 * qlf) / (Math.PI * ds * nu);
  const fs = swameeJain(e.rugosidade / 1000, ds, res);
  const js = (8 * fs * qlf ** 2) / (G * Math.PI ** 2 * ds ** 5);
  const ls = e.coefSuccao * ds + e.comprimentoSuccao;
  const hs = js * ls;
  passos.push({ titulo: 'Reynolds e fator de atrito (sucção)', formula: 'Re = 4Q/(π d ν) ; f Swamee-Jain', subst: `Re = ${fmt(res, 0)}`, valor: fs, dec: 4 });
  passos.push({ titulo: 'Perda unitária na sucção', formula: 'Js = 8 f Q² / (g π² d⁵)', valor: js, unidade: 'm/m', dec: 5 });
  passos.push({ titulo: 'Comprimento total da sucção', formula: 'Ls = ΣLeq(×D) × ds + L real', subst: `Ls = ${fmt(e.coefSuccao, 1)} × ${fmt(ds, 3)} + ${fmt(e.comprimentoSuccao, 1)}`, valor: ls, unidade: 'm' });
  passos.push({ titulo: 'Perda total na sucção', formula: 'Hs = Js × Ls', valor: hs, unidade: 'm', dec: 3 });

  // Recalque
  const dr = e.dnRecalque / 1000;
  const vr = qlf / area(dr);
  passos.push({ titulo: 'Velocidade no recalque', formula: 'Vr = Qlf / (π Dr² / 4)', subst: `Dr = ${fmt(e.dnRecalque, 0)} mm`, valor: vr, unidade: 'm/s' });
  const rer = (4 * qlf) / (Math.PI * dr * nu);
  const fr = swameeJain(e.rugosidade / 1000, dr, rer);
  const jr = (8 * fr * qlf ** 2) / (G * Math.PI ** 2 * dr ** 5);
  const lr = e.coefRecalque * dr + e.comprimentoRecalque;
  const hr = jr * lr;
  passos.push({ titulo: 'Reynolds e fator de atrito (recalque)', formula: 'Re = 4Q/(π D ν) ; f Swamee-Jain', subst: `Re = ${fmt(rer, 0)}`, valor: fr, dec: 4 });
  passos.push({ titulo: 'Perda unitária no recalque', formula: 'Jr = 8 f Q² / (g π² D⁵)', valor: jr, unidade: 'm/m', dec: 5 });
  passos.push({ titulo: 'Comprimento total do recalque', formula: 'Lr = ΣLeq(×D) × Dr + L real', subst: `Lr = ${fmt(e.coefRecalque, 1)} × ${fmt(dr, 3)} + ${fmt(e.comprimentoRecalque, 1)}`, valor: lr, unidade: 'm' });
  passos.push({ titulo: 'Perda total no recalque', formula: 'Hr = Jr × Lr', valor: hr, unidade: 'm', dec: 3 });

  passos.push({ titulo: 'Perda no fundo do filtro', formula: 'adotada (0,50 a 1,00 m – Vianna, 2014)', valor: e.perdaFundo, unidade: 'm' });
  const somaH = hs + hlf + hcs + hsd + hr + e.perdaFundo;
  passos.push({ titulo: 'Somatório das perdas', formula: 'ΣH = Hs + Hlf + Hcs + Hsd + Hr + Hfundo', valor: somaH, unidade: 'm', dec: 3 });
  passos.push({ titulo: 'Altura geométrica (informada)', formula: 'Hg = nível mínimo do RAP → borda da calha', valor: e.hg, unidade: 'm' });
  const hm = e.hg + somaH;
  passos.push({ titulo: 'Altura manométrica', formula: 'Hm = Hg + ΣH', subst: `Hm = ${fmt(e.hg)} + ${fmt(somaH, 3)}`, valor: hm, unidade: 'mca' });

  const pCalc = (qlf * 1000 * hm) / (75 * (e.rendimento / 100));
  passos.push({ titulo: 'Potência da bomba de lavagem', formula: 'P = Qlf × Hm / (75 × η)', subst: `P = ${fmt(qlf * 1000, 1)} × ${fmt(hm)} / (75 × ${fmt(e.rendimento / 100)})`, valor: pCalc, unidade: 'cv' });
  const folga = folgaMotor(pCalc);
  const pCorr = pCalc * (1 + folga);
  passos.push({ titulo: 'Potência com folga do motor', formula: 'Pc = P × (1 + f)', subst: `f = ${fmt(folga * 100, 0)}%`, valor: pCorr, unidade: 'cv', ref: 'Azevedo Netto; NIT-0047 5.7.10.4' });
  const pAdot = proximoComercial(pCorr, POTENCIAS_CV);
  passos.push({ titulo: 'Potência comercial adotada', formula: 'próxima potência padronizada ≥ Pc', valor: pAdot, unidade: 'cv', dec: 2, ref: 'NIT-0047 5.7.10.3' });

  const volLavagem = qlf * 60 * e.tempoLavagem;
  passos.push({ titulo: 'Volume de uma lavagem', formula: 'V = Qlf × 60 × Tl', subst: `V = ${fmt(qlf, 4)} × 60 × ${fmt(e.tempoLavagem, 0)}`, valor: volLavagem, unidade: 'm³' });
  const volRap = volLavagem * f.numFiltros;
  passos.push({ titulo: 'Volume do RAP (situação crítica: todos os filtros)', formula: 'Vrap = V × Nf', subst: `Vrap = ${fmt(volLavagem)} × ${f.numFiltros}`, valor: volRap, unidade: 'm³', ref: 'NIT-0046 4.3.16' });
  const volRapAdot = arredondaAcima(volRap, 10);
  passos.push({ titulo: 'Volume do RAP adotado', formula: 'arredondado p/ cima (10 m³)', valor: volRapAdot, unidade: 'm³', dec: 0 });

  v.push(verif(vs <= vmaxS, 'Velocidade na sucção', `${fmt(vs)} m/s ≤ ${fmt(vmaxS)} m/s`, `${fmt(vs)} m/s > ${fmt(vmaxS)} m/s – aumentar o DN de sucção`, e.bombaAfogada ? 'NIT-0047 5.7.13.2 / NBR 12214 (confirmar Tabela 1 do Anexo I)' : 'NIT-0047 5.7.13.3'));
  v.push(verif(vr >= 0.6 && vr <= 3, 'Velocidade no recalque', `${fmt(vr)} m/s dentro de 0,6–3,0 m/s`, `${fmt(vr)} m/s fora de 0,6–3,0 m/s`, 'NIT-0045 5.3.8; NIT-0047 5.7.13.4'));
  v.push({ titulo: 'Pré-dimensionamento do recalque', status: 'info', msg: `Para V ≈ 1 m/s o diâmetro seria ≈ ${fmt(Math.sqrt((4 * qlf) / Math.PI) * 1000, 0)} mm.`, ref: 'NIT-0047 5.7.15' });
  if (e.bombaAfogada && e.coefSuccao >= 265) v.push({ titulo: 'Peças da sucção', status: 'info', msg: 'Bomba afogada: o padrão inclui válvula de pé com crivo (265D). Para sucção afogada substitua por registro de bloqueio (NIT-0047 5.8.22) em "Avançado".' });
  v.push({ titulo: 'Conjunto motobomba', status: 'info', msg: `Adotar ${fmt(pAdot, 0)} cv com 1 + 1 reserva instalada. Vazão instantânea de lavagem: ${fmt(qlf * 3600, 0)} m³/h.`, ref: 'NIT-0046 4.3.16 / 4.3.21' });

  return {
    modulo: 'lavagem', titulo: 'Bomba de lavagem do filtro e RAP', passos, verificacoes: v,
    entradas: [
      { label: 'Hg (nível mín. RAP → calha)', valor: e.hg, unidade: 'm' },
      { label: 'DN sucção', valor: e.dnSuccao, unidade: 'mm' },
      { label: 'Bomba afogada', valor: e.bombaAfogada ? 'Sim' : 'Não' },
      { label: 'ΣLeq sucção (×D)', valor: e.coefSuccao },
      { label: 'Trecho reto sucção', valor: e.comprimentoSuccao, unidade: 'm' },
      { label: 'DN recalque', valor: e.dnRecalque, unidade: 'mm' },
      { label: 'Comprimento recalque', valor: e.comprimentoRecalque, unidade: 'm' },
      { label: 'ΣLeq recalque (×D)', valor: e.coefRecalque },
      { label: 'Rugosidade ε', valor: e.rugosidade, unidade: 'mm' },
      { label: 'Perda no fundo do filtro', valor: e.perdaFundo, unidade: 'm' },
      { label: 'Rendimento do conjunto', valor: e.rendimento, unidade: '%' },
      { label: 'Tempo de lavagem', valor: e.tempoLavagem, unidade: 'min' },
    ],
    resumo: [
      { label: 'Vazão de lavagem', valor: qlf * 3600, unidade: 'm³/h', dec: 0, destaque: true },
      { label: 'Hm', valor: hm, unidade: 'mca', destaque: true },
      { label: 'Potência adotada', valor: pAdot, unidade: 'cv', dec: 0, destaque: true },
      { label: 'Vel. sucção', valor: vs, unidade: 'm/s' },
      { label: 'Vel. recalque', valor: vr, unidade: 'm/s' },
      { label: 'RAP adotado', valor: volRapAdot, unidade: 'm³', dec: 0, destaque: true },
    ],
    out: { qlf, hlf, hcs, hsd, vs, vmaxS, res, fs, js, ls, hs, vr, rer, fr, jr, lr, hr, somaH, hm, pCalc, folga, pCorr, pAdot, volLavagem, volRap, volRapAdot },
  };
}
