import { Passo, Resultado, Verificacao, fmt } from './core';
import { DadosBasicos, calcDemanda } from './demanda';

export interface EntradaReservacao {
  volumeIncendio: number; // m³
  volumeEmergencia: number; // m³
}

export const RESERVACAO_PADRAO: EntradaReservacao = { volumeIncendio: 0, volumeEmergencia: 0 };

export interface SaidaReservacao { vd: number; vr: number; vt: number; vElevadoMax: number }

export function calcReservacao(db: DadosBasicos, e: EntradaReservacao): Resultado<SaidaReservacao> {
  const dem = calcDemanda(db);
  const passos: Passo[] = [...dem.passos];
  const vd = (dem.p * db.perCapita * db.k1) / 1000;
  passos.push({ titulo: 'Volume distribuído no dia de maior consumo', formula: 'Vd = P × q × K1 / 1000', subst: `Vd = ${fmt(dem.p, 0)} × ${fmt(db.perCapita, 0)} × ${fmt(db.k1)} / 1000`, valor: vd, unidade: 'm³' });
  const vr = vd / 3;
  passos.push({ titulo: 'Volume de regularização', formula: 'Vr = Vd / 3', subst: `Vr = ${fmt(vd)} / 3`, valor: vr, unidade: 'm³', ref: 'NIT-0048 5.1.1; NBR 12217' });
  const vt = vr + e.volumeIncendio + e.volumeEmergencia;
  passos.push({ titulo: 'Volume total de reservação', formula: 'Vt = Vr + Vincêndio + Vemergência', subst: `Vt = ${fmt(vr)} + ${fmt(e.volumeIncendio)} + ${fmt(e.volumeEmergencia)}`, valor: vt, unidade: 'm³' });
  const vElevadoMax = 0.33 * vd;
  passos.push({ titulo: 'Volume elevado máximo', formula: 'Velev ≤ 0,33 × Vd', subst: `Velev ≤ 0,33 × ${fmt(vd)}`, valor: vElevadoMax, unidade: 'm³', ref: 'NIT-0048 5.1.7' });

  const v: Verificacao[] = [];
  if (vt <= 100) v.push({ titulo: 'Tipo de reservatório', status: 'alerta', msg: 'Volume ≤ 100 m³: todo o volume deve ser elevado (dispensa reservatório apoiado).', ref: 'NIT-0048 5.1.6' });
  else v.push({ titulo: 'Tipo de reservatório', status: 'info', msg: `Apoiado + elevado. Volume elevado entre 0 e ${fmt(vElevadoMax, 0)} m³ (33% de Vd). Se < 33%, aplicar fator de correção 1,0–1,5 na vazão que abastece o elevado (gráfico do Anexo I da NIT-0048).`, ref: 'NIT-0048 5.1.7–5.1.9' });
  if (vt >= 500) v.push({ titulo: 'Número de câmaras', status: 'alerta', msg: 'Volume ≥ 500 m³: recomenda-se dividir em pelo menos 2 câmaras.', ref: 'NIT-0048 4.2.11' });
  v.push({ titulo: 'Material', status: 'info', msg: vt < 500 ? 'Apoiado < 500 m³: aço carbono soldado, aço aparafusado ou concreto. Elevado em aço soldado: máx. 60 m³.' : 'Apoiado ≥ 500 m³: aço aparafusado, dobra dupla ou concreto.', ref: 'NIT-0048 4.2.5–4.2.7' });
  if (dem.qmh < 50) v.push({ titulo: 'Combate a incêndio', status: 'alerta', msg: `Demanda (${fmt(dem.qmh, 1)} L/s) < 50 L/s: prever ponto de tomada para carro-pipa junto ao reservatório.`, ref: 'NIT-0048 4.2.34' });
  v.push({ titulo: 'Folgas e dispositivos', status: 'info', msg: 'Folga cobertura–extravasão: 0,60 m (boia) ou 0,30 m (sensor). Descarga de fundo ≥ 100 mm. Extravasor para a vazão máxima de recalque. Perda máx. 2 m/km na saída.', ref: 'NIT-0048 4.2.18, 4.2.19, 5.1.2, 5.1.10' });
  if (e.volumeIncendio === 0 && e.volumeEmergencia === 0) v.push({ titulo: 'Incêndio / emergência', status: 'info', msg: 'Volumes de incêndio e emergência não incluídos. Somar quando exigido pela concessionária.', ref: 'NIT-0048 5.1.1' });

  return {
    modulo: 'reservacao', titulo: 'Reservação', passos, verificacoes: v,
    entradas: [
      { label: 'Volume para incêndio', valor: e.volumeIncendio, unidade: 'm³' },
      { label: 'Volume para emergência', valor: e.volumeEmergencia, unidade: 'm³' },
    ],
    resumo: [
      { label: 'População de projeto', valor: dem.p, unidade: 'hab', dec: 0 },
      { label: 'Vd (dia de maior consumo)', valor: vd, unidade: 'm³', dec: 0 },
      { label: 'Volume de regularização', valor: vr, unidade: 'm³', dec: 0, destaque: true },
      { label: 'Volume total', valor: vt, unidade: 'm³', dec: 0, destaque: true },
    ],
    out: { vd, vr, vt, vElevadoMax },
  };
}
