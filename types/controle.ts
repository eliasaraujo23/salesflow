export type TransacaoTipo = 'COMPRA' | 'NAO_COMPRA';

export interface MetalRecord {
  id: string;
  cod_interno: string;
  data: string;
  datetime: string;
  hora: string;
  avaliadores: string[];
  nome: string;
  cpf: string;
  transacao: TransacaoTipo;
  feedback_id: string | null;
  feedback_nc_id: string | null;
  modalidade_id: string | null;
  empresa_id: string | null;
  ouro_24k: number;
  ouro_22k: number;
  pt: number;
  ouro_750: number;
  ouro_720: number;
  bx: number;
  platina: number;
  prata: number;
  total_peso: number;
  preco: number;
  valor: number;
  pago_por_grama: number;
  observacao: string;
  created_at: string;
}

export interface DespesaRecord {
  id: string;
  data: string;
  tipo_despesa_id: string | null;
  forma_pagamento_id: string | null;
  banco_caixa_id: string | null;
  valor: number;
  observacao: string;
  created_at: string;
}

export interface LancamentoRecord {
  id: string;
  data: string;
  tipo_lancamento_id: string | null;
  banco_caixa_id: string | null;
  descricao: string;
  valor: number;
  created_at: string;
}

export interface CaixaEntry {
  local: string;
  valor: number;
}

export interface CaixaRecord {
  id: string;
  updatedAt: string;
  bruto: CaixaEntry[];
  trocados: CaixaEntry[];
}

export type MetalQualidade = 'ouro_24k' | 'ouro_22k' | 'pt' | 'ouro_750' | 'ouro_720' | 'bx' | 'platina' | 'prata';

export const QUALIDADE_LABELS: Record<MetalQualidade, string> = {
  ouro_24k: '24K',
  ouro_22k: '22K',
  pt: 'PT',
  ouro_750: '750',
  ouro_720: '720',
  bx: 'BX',
  platina: 'Platina',
  prata: 'Prata',
};

export const QUALIDADES: MetalQualidade[] = [
  'ouro_24k', 'ouro_22k', 'pt', 'ouro_750', 'ouro_720', 'bx', 'platina', 'prata',
];
