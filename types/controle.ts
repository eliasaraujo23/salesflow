import { type Timestamp } from 'firebase/firestore';

export type TransacaoTipo = 'COMPRA' | 'NAO_COMPRA';

export interface MetalRecord {
  id: string;
  cod_interno: string;
  data: Timestamp;
  hora: string;
  avaliadores: string[];
  nome: string;
  cpf: string;
  transacao: TransacaoTipo;
  feedback: string;
  motivo_nc: string;
  tipo: string;
  razao_social: string;
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
  createdAt: Timestamp;
}

export interface DespesaRecord {
  id: string;
  data: Timestamp;
  tipo_despesa: string;
  forma_pagamento: string;
  banco_caixa: string;
  valor: number;
  observacao: string;
  createdAt: Timestamp;
}

export interface LancamentoRecord {
  id: string;
  data: Timestamp;
  tipo: string;
  banco: string;
  descricao: string;
  valor: number;
  createdAt: Timestamp;
}

export interface CaixaEntry {
  local: string;
  valor: number;
}

export interface CaixaDoc {
  bruto: CaixaEntry[];
  trocados?: CaixaEntry[];
  updatedAt: Timestamp;
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
