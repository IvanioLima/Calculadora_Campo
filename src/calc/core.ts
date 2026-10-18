// Tipos e utilitários comuns ao motor de cálculo.

export const G = 9.81;

export interface Passo {
  /** Título da etapa (ex.: "Vazão média de consumo") */
  titulo: string;
  /** Fórmula simbólica */
  formula: string;
  /** Fórmula com valores substituídos */
  subst?: string;
  valor: number | string;
  unidade?: string;
  /** Referência normativa ou bibliográfica */
  ref?: string;
  /** Casas decimais para exibição */
  dec?: number;
}

export type StatusVerif = 'ok' | 'alerta' | 'erro' | 'info';

export interface Verificacao {
  titulo: string;
  status: StatusVerif;
  msg: string;
  ref?: string;
}

export interface ItemResumo {
  label: string;
  valor: number | string;
  unidade?: string;
  dec?: number;
  destaque?: boolean;
}

export interface EntradaUsada {
  label: string;
  valor: number | string;
  unidade?: string;
}

export interface Resultado<O> {
  modulo: string;
  titulo: string;
  entradas: EntradaUsada[];
  passos: Passo[];
  verificacoes: Verificacao[];
  resumo: ItemResumo[];
  out: O;
}

/** Formata número no padrão brasileiro. */
export function fmt(v: number | string, dec = 2): string {
  if (typeof v === 'string') return v;
  if (!Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e7)) {
    return v.toExponential(Math.max(1, dec)).replace('.', ',');
  }
  return v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

/** Diâmetros nominais comerciais usuais (mm). */
export const DN_COMERCIAIS = [50, 75, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000];

/** Potências nominais usuais de motores (cv) – NBR 5432 (confirmar com fabricante). */
export const POTENCIAS_CV = [
  0.25, 0.33, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150,
  175, 200, 250, 300, 350, 400, 450, 500,
];

/** Velocidade máxima na sucção de bomba afogada por DN (NBR 12214 – a confirmar com Tabela 1 do Anexo I da NIT-0047). */
export const VMAX_SUCCAO_AFOGADA: [number, number][] = [
  [50, 0.7], [75, 0.8], [100, 0.9], [150, 1.0], [200, 1.1], [250, 1.2], [300, 1.4], [400, 1.5],
];

export function vmaxSuccao(dnMm: number, afogada: boolean): number {
  if (!afogada) return 0.9;
  let v = VMAX_SUCCAO_AFOGADA[0][1];
  for (const [dn, vm] of VMAX_SUCCAO_AFOGADA) if (dnMm >= dn) v = vm;
  return v;
}

export function proximoComercial(valor: number, lista: number[]): number {
  for (const x of lista) if (x >= valor - 1e-9) return x;
  return lista[lista.length - 1];
}

export function arredondaAcima(v: number, passo: number): number {
  return Math.ceil(v / passo - 1e-9) * passo;
}

/** Folga de potência do motor (Azevedo Netto). Retorna fração. */
export function folgaMotor(pCv: number): number {
  if (pCv <= 2) return 0.5;
  if (pCv <= 5) return 0.3;
  if (pCv <= 10) return 0.2;
  if (pCv <= 20) return 0.15;
  return 0.1;
}

/** Fator de atrito de Swamee-Jain. eps e d em metros. */
export function swameeJain(epsM: number, d: number, re: number): number {
  return 0.25 / Math.pow(Math.log10(epsM / (3.7 * d) + 5.74 / Math.pow(re, 0.9)), 2);
}

export const area = (d: number) => (Math.PI * d * d) / 4;

export function verif(cond: boolean, titulo: string, okMsg: string, failMsg: string, ref?: string, failStatus: StatusVerif = 'erro'): Verificacao {
  return { titulo, status: cond ? 'ok' : failStatus, msg: cond ? okMsg : failMsg, ref };
}
