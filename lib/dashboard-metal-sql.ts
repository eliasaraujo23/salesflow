// Fragmento SQL reutilizável com as 5 regras de exclusão de registros inválidos,
// replicadas do Dashboard Metal legado (ver CONTEXTO.md em C:\Users\conta\Dashboard-Metal).
// metal_ouro = soma de 24k+22k+pt+750+720+bx+platina (nunca inclui prata).
export const METAL_OURO_EXPR = `(ouro_24k + ouro_22k + pt + ouro_750 + ouro_720 + bx + platina)`;

export const REGISTRO_VALIDO_WHERE = `
  -- 1. transacao vazia/nula (registro incompleto)
  transacao IS NOT NULL
  -- 2. NÃO_COMPRA com motivo Bijuteria (feedback_nc_id = '4')
  AND NOT (transacao = 'NAO_COMPRA' AND feedback_nc_id = '4')
  -- 3. COMPRA só com prata (sem ouro/platina)
  AND NOT (transacao = 'COMPRA' AND ${METAL_OURO_EXPR} = 0 AND prata > 0)
  -- 4. COMPRA totalmente zerada (peso zero e valor zero)
  AND NOT (transacao = 'COMPRA' AND ${METAL_OURO_EXPR} = 0 AND prata = 0 AND valor = 0)
  -- 5. NÃO_COMPRA com prata > 0
  AND NOT (transacao = 'NAO_COMPRA' AND prata > 0)
`;

/** Threshold único de conversão (substitui os 3 conjuntos inconsistentes do dashboard legado). */
export const CONVERSAO_OTIMA = 0.95;
export const CONVERSAO_BOA = 0.88;

/** Labels dos motivos de não compra por código (1-11; 4=Bijuteria é excluído das regras). */
export const MOTIVO_NC_LABELS: Record<string, string> = {
  '1': 'Melhor preço concorrente',
  '2': 'Imagina preço melhor',
  '3': 'Elo emocional',
  '5': 'Peça de terceiros',
  '6': 'Não deixou limar',
  '7': 'Imagina preço acima da cotação',
  '8': 'Pesquisando preço',
  '9': 'Sem documentos',
  '10': 'Não quis assinar',
  '11': 'Dispensado',
  '12': 'Fiz merda',
};

/** Agrupamento de motivos de não compra por categoria (para o donut "Por Categoria"). */
export const NC_GRUPOS: Record<'preco' | 'peca' | 'processo', string[]> = {
  preco: ['2', '7', '8'],
  peca: ['3', '5', '6'],
  processo: ['1', '9', '10', '11', '12'],
};
export const NC_GRUPO_LABELS: Record<string, string> = {
  preco: 'Preço',
  peca: 'Peça/Posse',
  processo: 'Outros',
};
export const NC_GRUPO_COLORS: Record<string, string> = {
  preco: '#D4AF37',
  peca: '#60a5fa',
  processo: '#6b7280',
};
export function getNcGrupo(cod: string): 'preco' | 'peca' | 'processo' {
  if (NC_GRUPOS.preco.includes(cod)) return 'preco';
  if (NC_GRUPOS.peca.includes(cod)) return 'peca';
  return 'processo';
}

/** IDs dos avaliadores-donos, excluídos dos rankings de desempenho e preço. */
export const AV_DONOS_IDS = ['helton-santana', 'eduardo-carvalho', 'augusto-carvalho'];
export function isAvDono(avaliadorId: string): boolean {
  return AV_DONOS_IDS.includes(avaliadorId);
}

/** Cores por loja usadas em tabelas cruzadas, cards e tags de avaliador. */
export const LOJA_TAG_COLORS: Record<string, string> = {
  gtt: '#fdba74',
  gti: '#6ee7b7',
  '24k': '#93c5fd',
  ci: '#34d399',
  ptq: '#c4b5fd',
  pgt: '#f9a8d4',
};

/** Cores por qualidade de metal, usadas no donut "Divisão por Teor". */
export const TEOR_COLORS: Record<string, string> = {
  ouro_750: '#D4AF37',
  bx: '#8B6914',
  ouro_720: '#F0D060',
  ouro_24k: '#c9a227',
  ouro_22k: '#6b5520',
  pt: '#3a2f10',
  platina: '#9ca3af',
};

export const TEOR_LABELS_CURTO: Record<string, string> = {
  ouro_750: '750 (18K)',
  bx: 'BX',
  ouro_720: '720 (18K)',
  ouro_24k: '24K',
  ouro_22k: '22K',
  pt: 'PT',
  platina: 'Platina',
};
