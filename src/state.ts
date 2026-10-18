import { ADUTORA_PADRAO, EntradaAdutora, calcAdutora } from './calc/adutora';
import { DADOS_BASICOS_PADRAO, DadosBasicos } from './calc/demanda';
import { EntradaFiltro, FILTRO_PADRAO, calcFiltro } from './calc/filtro';
import { EntradaLavagem, LAVAGEM_PADRAO, calcLavagem } from './calc/lavagem';
import { EntradaReservacao, RESERVACAO_PADRAO, calcReservacao } from './calc/reservacao';

export interface InfoProjeto {
  id: string;
  nome: string;
  local: string;
  responsavel: string;
  observacoes: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Projeto {
  info: InfoProjeto;
  dados: DadosBasicos;
  adutora: EntradaAdutora;
  reservacao: EntradaReservacao;
  filtro: EntradaFiltro;
  lavagem: EntradaLavagem;
}

const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function novoProjeto(nome = 'Novo estudo'): Projeto {
  const agora = new Date().toISOString();
  return {
    info: { id: uid(), nome, local: '', responsavel: '', observacoes: '', criadoEm: agora, atualizadoEm: agora },
    dados: clone(DADOS_BASICOS_PADRAO),
    adutora: clone(ADUTORA_PADRAO),
    reservacao: clone(RESERVACAO_PADRAO),
    filtro: clone(FILTRO_PADRAO),
    lavagem: clone(LAVAGEM_PADRAO),
  };
}

/** Completa projetos salvos em versões anteriores com campos novos. */
function normaliza(p: Projeto): Projeto {
  const base = novoProjeto();
  return {
    info: { ...base.info, ...p.info },
    dados: { ...base.dados, ...p.dados },
    adutora: { ...base.adutora, ...p.adutora },
    reservacao: { ...base.reservacao, ...p.reservacao },
    filtro: { ...base.filtro, ...p.filtro },
    lavagem: { ...base.lavagem, ...p.lavagem },
  };
}

const KEY = 'calcCampo.projetos.v1';
const KEY_ATUAL = 'calcCampo.atual.v1';

function ler(): Projeto[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Projeto[]).map(normaliza) : [];
  } catch {
    return [];
  }
}

function gravar(lista: Projeto[]) {
  try { localStorage.setItem(KEY, JSON.stringify(lista)); } catch { /* armazenamento indisponível */ }
}

export const store = {
  listar(): Projeto[] {
    return ler().sort((a, b) => b.info.atualizadoEm.localeCompare(a.info.atualizadoEm));
  },
  salvar(p: Projeto) {
    p.info.atualizadoEm = new Date().toISOString();
    const lista = ler().filter((x) => x.info.id !== p.info.id);
    lista.push(p);
    gravar(lista);
    try { localStorage.setItem(KEY_ATUAL, p.info.id); } catch { /* */ }
  },
  excluir(id: string) {
    gravar(ler().filter((x) => x.info.id !== id));
  },
  atual(): Projeto {
    let id: string | null = null;
    try { id = localStorage.getItem(KEY_ATUAL); } catch { /* */ }
    const lista = ler();
    return lista.find((x) => x.info.id === id) ?? lista[0] ?? novoProjeto('Estudo de exemplo');
  },
  duplicar(p: Projeto): Projeto {
    const c = clone(p);
    c.info.id = uid();
    c.info.nome = `${p.info.nome} (cópia)`;
    c.info.criadoEm = new Date().toISOString();
    return c;
  },
  importar(json: string): Projeto {
    const p = normaliza(JSON.parse(json) as Projeto);
    p.info.id = uid();
    return p;
  },
};

export function calcularTudo(p: Projeto) {
  const adutora = calcAdutora(p.dados, p.adutora);
  const reservacao = calcReservacao(p.dados, p.reservacao);
  const filtro = calcFiltro(p.filtro, adutora.out.qa);
  const lavagem = calcLavagem(p.lavagem, p.filtro, filtro.out);
  return { adutora, reservacao, filtro, lavagem };
}

export type Resultados = ReturnType<typeof calcularTudo>;
