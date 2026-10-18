// Definição declarativa dos campos de entrada de cada módulo.

export interface Campo {
  key: string;
  label: string;
  unidade?: string;
  tipo?: 'num' | 'select' | 'bool' | 'text';
  opcoes?: { v: string; t: string }[];
  dica?: string;
  avancado?: boolean;
  /** Exibe o campo apenas se a condição for verdadeira */
  se?: (obj: Record<string, unknown>) => boolean;
  min?: number;
}

export const CAMPOS_DADOS: Campo[] = [
  { key: 'modoPop', label: 'Base da população', tipo: 'select', opcoes: [{ v: 'residencias', t: 'Nº de residências × ocupação' }, { v: 'populacao', t: 'População informada' }] },
  { key: 'nResidencias', label: 'Número de unidades habitacionais', unidade: 'un', se: (o) => o.modoPop === 'residencias', min: 0 },
  { key: 'taxaOcupacao', label: 'Taxa de ocupação', unidade: 'hab/un', se: (o) => o.modoPop === 'residencias', min: 0 },
  { key: 'populacaoAtual', label: 'População atual', unidade: 'hab', se: (o) => o.modoPop === 'populacao', min: 0 },
  { key: 'alcance', label: 'Alcance do projeto', unidade: 'anos', dica: 'NIT-0047: em geral 20 anos para tubulações e 10 para bombas.', min: 0 },
  { key: 'crescimento', label: 'Taxa de crescimento', unidade: '% a.a.' },
  { key: 'perCapita', label: 'Consumo per capita', unidade: 'L/hab.dia', min: 0 },
  { key: 'k1', label: 'K1 – dia de maior consumo', min: 1 },
  { key: 'k2', label: 'K2 – hora de maior consumo', min: 1 },
];

export const CAMPOS_ADUTORA: Campo[] = [
  { key: 'tipo', label: 'Tipo de adutora', tipo: 'select', opcoes: [{ v: 'bruta', t: 'Água bruta (Qmd + perdas no tratamento)' }, { v: 'tratada', t: 'Água tratada (Qmd)' }] },
  { key: 'tempoBombeamento', label: 'Tempo de bombeamento', unidade: 'h/dia', dica: 'NIT-0047 5.7.8.3: 18 h para fim de plano.', min: 1 },
  { key: 'perdasEta', label: 'Perdas no tratamento', unidade: '%', se: (o) => o.tipo === 'bruta' },
  { key: 'comprimento', label: 'Comprimento total da adutora', unidade: 'm', min: 0 },
  { key: 'cotaInicial', label: 'Cota inicial (nível de sucção)', unidade: 'm' },
  { key: 'cotaFinal', label: 'Cota final (chegada)', unidade: 'm' },
  { key: 'alturaChegada', label: 'Altura da torre/reservatório na chegada', unidade: 'm' },
  { key: 'dnAdotado', label: 'DN adotado', unidade: 'mm', dica: '0 = automático (próximo DN comercial ≥ calculado).', min: 0 },
  { key: 'psa', label: 'Pressão de serviço admissível do tubo (PSA)', unidade: 'mca', dica: 'Ex.: PVC DEFOFO 1,0 MPa = 100 mca.' },
  { key: 'rendimento', label: 'Rendimento do conjunto motobomba (η)', unidade: '%', min: 1 },
  { key: 'formulaPerda', label: 'Fórmula de perda de carga', tipo: 'select', opcoes: [{ v: 'universal', t: 'Universal – Darcy-Weisbach (preferencial)' }, { v: 'hazen', t: 'Hazen-Williams' }], avancado: true },
  { key: 'metodoDiametro', label: 'Diâmetro econômico', tipo: 'select', opcoes: [{ v: 'forchheimer', t: 'Forchheimer (bombeamento < 24 h)' }, { v: 'bresse', t: 'Bresse' }], avancado: true },
  { key: 'kBresse', label: 'K de Bresse', avancado: true, se: (o) => o.metodoDiametro === 'bresse' },
  { key: 'cHazen', label: 'C de Hazen-Williams (tubo envelhecido)', avancado: true },
  { key: 'rugosidade', label: 'Rugosidade ε (tubo envelhecido)', unidade: 'mm', avancado: true },
  { key: 'viscosidade', label: 'Viscosidade cinemática ν', unidade: 'm²/s', avancado: true },
  { key: 'somaK', label: 'Σk das singularidades (sucção + barrilete)', avancado: true, dica: 'Padrão: crivo, válvula de pé, reduções, curvas, retenção e gaveta (7,28).' },
  { key: 'kAllievi', label: 'K do material (Allievi)', avancado: true, dica: 'PVC = 18; ferro fundido = 1; aço = 0,5.' },
  { key: 'espessura', label: 'Espessura da parede do tubo', unidade: 'mm', avancado: true },
];

export const CAMPOS_RESERVACAO: Campo[] = [
  { key: 'volumeIncendio', label: 'Volume para combate a incêndio', unidade: 'm³', dica: 'Quando exigido pela concessionária (NIT-0048 5.1.1).', min: 0 },
  { key: 'volumeEmergencia', label: 'Volume de emergência', unidade: 'm³', min: 0 },
];

export const CAMPOS_FILTRO: Campo[] = [
  { key: 'usarVazaoAdutora', label: 'Usar vazão do módulo Adutora', tipo: 'bool' },
  { key: 'vazaoTotal', label: 'Vazão total afluente à ETA', unidade: 'L/s', se: (o) => !o.usarVazaoAdutora, min: 0 },
  { key: 'numFiltros', label: 'Número de filtros', unidade: 'un', min: 1 },
  { key: 'taxa', label: 'Taxa de filtração', unidade: 'm³/m².d', dica: 'NBR 12216: filtro ascendente ≤ 120 m³/m².d.' },
  { key: 'diametroAdotado', label: 'Diâmetro adotado', unidade: 'm', dica: '0 = automático (arredonda p/ cima a cada 0,10 m).', min: 0 },
  { key: 'espessuraLeito', label: 'Espessura do leito filtrante', unidade: 'm' },
  { key: 'velLavagem', label: 'Velocidade de lavagem', unidade: 'm/min' },
  { key: 'larguraCalha', label: 'Largura útil da calha coletora', unidade: 'm' },
  { key: 'alturaCalhaAdotada', label: 'Altura da calha adotada', unidade: 'm', dica: '0 = automático.', min: 0 },
  { key: 'porosidadeLeito', label: 'Porosidade do leito', avancado: true },
  { key: 'esfericidadeLeito', label: 'Esfericidade dos grãos', avancado: true },
  { key: 'massaEspGraos', label: 'Massa específica dos grãos', unidade: 'kg/m³', avancado: true },
  { key: 'porosidadeSuporte', label: 'Porosidade da camada suporte', avancado: true },
  { key: 'esfericidadeSuporte', label: 'Esfericidade do pedregulho', avancado: true },
  { key: 'massaEspSuporte', label: 'Massa específica do pedregulho', unidade: 'kg/m³', avancado: true },
  { key: 'massaEspAgua', label: 'Massa específica da água', unidade: 'kg/m³', avancado: true, dica: 'Padrão para ≈ 30 °C.' },
  { key: 'viscAbsoluta', label: 'Viscosidade absoluta da água', unidade: 'N.s/m²', avancado: true },
  { key: 'viscCinematica', label: 'Viscosidade cinemática da água', unidade: 'm²/s', avancado: true },
  { key: 'folgaEspinha', label: 'Folga p/ espinha de peixe', unidade: 'm', avancado: true },
  { key: 'folgaTampa', label: 'Folga da tampa', unidade: 'm', avancado: true },
  { key: 'orificiosDrenagem', label: 'Nº de orifícios do fundo (drenagem)', avancado: true },
  { key: 'diamOrificioDrenagemPol', label: 'Ø orifício de drenagem', unidade: 'pol', avancado: true },
  { key: 'cd', label: 'Coeficiente de descarga Cd', avancado: true },
  { key: 'vMaxEspinha', label: 'Velocidade máx. nos orifícios da espinha', unidade: 'm/s', avancado: true },
  { key: 'orificiosEspinhaLavagem', label: 'Espinha (lavagem): nº de orifícios', avancado: true },
  { key: 'diamOrificioEspinhaLavagemMm', label: 'Espinha (lavagem): Ø orifício adotado', unidade: 'mm', avancado: true },
  { key: 'orificiosEspinhaFiltracao', label: 'Espinha (filtração): nº de orifícios', avancado: true },
  { key: 'diamOrificioEspinhaFiltracaoMm', label: 'Espinha (filtração): Ø orifício adotado', unidade: 'mm', avancado: true },
];

export const TABELAS_FILTRO = [
  { key: 'granulometriaExpansao', titulo: 'Granulometria – expansão (fração do leito; d em mm)', xLabel: 'Fração' },
  { key: 'granulometriaFiltracao', titulo: 'Granulometria – perda na filtração (fração; d em mm)', xLabel: 'Fração' },
  { key: 'camadaSuporte', titulo: 'Camada suporte (espessura em m; d em mm)', xLabel: 'Espessura (m)' },
];

export const CAMPOS_LAVAGEM: Campo[] = [
  { key: 'hg', label: 'Altura geométrica Hg', unidade: 'm', dica: 'Desnível entre o NÍVEL MÍNIMO do RAP e a BORDA DA CALHA coletora do filtro.' },
  { key: 'dnSuccao', label: 'DN da sucção', unidade: 'mm', min: 1 },
  { key: 'bombaAfogada', label: 'Bomba afogada', tipo: 'bool', dica: 'Não afogada: velocidade máx. 0,90 m/s (NIT-0047 5.7.13.3).' },
  { key: 'dnRecalque', label: 'DN do recalque', unidade: 'mm', min: 1 },
  { key: 'comprimentoRecalque', label: 'Comprimento real do recalque', unidade: 'm', min: 0 },
  { key: 'rendimento', label: 'Rendimento do conjunto (η)', unidade: '%', min: 1 },
  { key: 'tempoLavagem', label: 'Tempo de lavagem de um filtro', unidade: 'min', min: 0 },
  { key: 'coefSuccao', label: 'ΣLeq da sucção (múltiplos de D)', avancado: true, dica: 'Padrão 314,3: válvula de pé c/ crivo 265D + curva 90° 12,8D + entrada 14,7D + tê 21,8D.' },
  { key: 'comprimentoSuccao', label: 'Trecho reto da sucção', unidade: 'm', avancado: true },
  { key: 'coefRecalque', label: 'ΣLeq do recalque (múltiplos de D)', avancado: true, dica: 'Padrão 81,3: saída 35D + curva 90° 17,5D + tê 21,8D + registro 7D.' },
  { key: 'rugosidade', label: 'Rugosidade ε', unidade: 'mm', avancado: true },
  { key: 'perdaFundo', label: 'Perda no fundo do filtro', unidade: 'm', avancado: true, dica: '0,50 a 1,00 m (Vianna, 2014).' },
];
