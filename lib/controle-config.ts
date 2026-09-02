export type LojaCode = 'gtt' | 'gti' | '24k' | 'ci' | 'ptq' | 'pgt';

export interface LojaConfig {
  code: LojaCode;
  label: string;
  sigla: string;
  cod_prefix: string;
  permission: string;
  cor: string;
  caixa_bruto: string[];
  trocados?: string[];
  avaliadores: string[];
  feedbacks_compra: string[];
  feedbacks_nc: string[];
  tipos: string[];
  empresas: string[];
  tipos_despesa: string[];
  formas_pagamento: string[];
  tipos_lancamento: string[];
  bancos_caixa: string[];
}

const AVALIADORES_ATIVOS = [
  'Ana Clara', 'Ana Paula', 'Andressa', 'Augusto', 'Bruno',
  'Caroline', 'Clarisse', 'Daiana', 'Eduardo', 'Fernanda',
  'Francesco', 'Giovanna', 'Helton', 'Joyce', 'Juliana',
  'Larissa', 'Luciana', 'Matheus', 'Paula',
  'Raphael Borges', 'Thaís', 'Thays', 'Vinicius de Paula',
];

const FEEDBACKS_TODOS = [
  'Aplicativo', 'Comerciante', 'Facebook', 'Faixa Sinal', 'Google',
  'Grão da Terra', 'Indicação', 'Instagram', 'Loja', 'Mochila Porta',
  'Não Sabe Dizer', 'Porta', 'Propaganda Concorrente', 'Retorno',
  'Sem FeedBack', 'Site',
];

const MOTIVOS_NC = [
  'MELHOR PREÇO CONCORRENTE',
  'IMAGINA PREÇO MELHOR',
  'ELO EMOCIONAL',
  'BIJUTERIA',
  'PEÇA DE TERCEIROS',
  'NÃO DEIXOU LIMAR',
  'IMAGINA PREÇO ACIMA DA COTAÇÃO',
  'PESQUISANDO PREÇO',
  'SEM DOCUMENTOS',
  'NÃO QUIS ASSINAR',
  'DISPENSADO',
  'FIZ MERDA',
];

const MODALIDADES = ['24K', 'ANTIGO', 'ETN', 'GTI', 'GTT', 'SCRAP', 'SECOND HAND'];

const EMPRESAS = [
  '24K Joias | Thais Joias LTDA',
  'A. Tech Comércio De Joias LTDA',
  'ETERNNO Comércio de Jóias e Artigos de Luxo LTDA',
  'G. Tech Comércio de Joias LTDA',
  'Gold Tech Comércio de Joias LTDA',
  'H. Tech Comércio De Joias LTDA',
  'Tech Gold Ipanema Comércio de Joias LTDA',
];

export const LOJAS: LojaConfig[] = [
  {
    code: 'gtt',
    label: 'Goldtech Tijuca',
    sigla: 'GTT',
    cod_prefix: 'T',
    permission: 'controle-gtt',
    cor: '#6366f1',
    caixa_bruto: ['Sala', 'Cofre', 'Papeleiro', 'Gaveta', 'Caixa'],
    trocados: ['Trocado Guardado', 'Trocado Caixa', 'Trocado Sala'],
    avaliadores: AVALIADORES_ATIVOS,
    feedbacks_compra: [
      ...FEEDBACKS_TODOS,
      'Banca 3 Banners', 'Banca Açaí', 'Banca Avenida Maracanã', 'Banca Bradesco',
      'Banca Espaço Mix', 'Banca Extra', 'Banca Fórum', 'Banca Igreja',
      'Banca Marise Barros', 'Banca Mundial', 'Banca Pacheco', 'Banca Pizzaria Parmê',
      'Banca Prezunic', 'Banca Rua Das Flores', 'Banca Uruguai', 'Caixa Caçula',
      'Casa Do Pão', 'Casa e Vídeo', 'Cavalete Santo Afonso', 'Dissantini',
      'Esquina 45', 'Igreja Conde De Bonfim', 'Igreja Conde De Bonfim 1',
      'Indicação Emerson', 'Jornal Meia Hora', 'Lirity', 'Ludgi', 'Magazine Luiza',
      'Mochila Banca Flores', 'Mochila Caixa', 'Mochila Drogas Mil', 'Mochila Flores',
      'Mochila Luidgi', 'Mochila Pacheco', 'Mundial', 'Nossa Drogaria', 'Otto',
      'Perna De Pau', 'Ponto 269', 'Porta Santo Afonso', 'Shopping 45', 'Táxi', 'Utilicasa',
    ].sort(),
    feedbacks_nc: MOTIVOS_NC,
    tipos: MODALIDADES,
    empresas: EMPRESAS,
    tipos_despesa: [
      'Alimentação', 'Transporte', 'Material de escritório',
      'Serviço', 'Fornecedor', 'Outros',
    ],
    formas_pagamento: ['Dinheiro', 'PIX', 'Transferência', 'Cartão'],
    tipos_lancamento: ['PIX', 'SAQUE', 'PAGAMENTO', 'EMPRÉSTIMO', 'ENTRADA', 'DEVOLUÇÃO', 'CORRETO'],
    bancos_caixa: [
      'BMG KADU',
      'BTG AUGUSTO', 'BTG ETERNNO', 'BTG HELTON', 'BTG KADU', 'BTG THAÍS',
      'C6 AUGUSTO', 'C6 HELTON', 'C6 KADU',
      'ESPECIE',
      'INTER CLARISSE', 'INTER KADU', 'INTER MATHEUS', 'INTER THAIS',
      'ITAÚ A. TECH', 'ITAÚ AUGUSTO', 'ITAÚ BRUNO', 'ITAÚ  G. TECH', 'ITAÚ KADU', 'ITAÚ MATHEUS',
      'LANCAMENTOS',
      'MERCADO PAGO 24K', 'MERCADO PAGO A. TECH', 'MERCADO PAGO AUGUSTO',
      'MERCADO PAGO ETERNNO', 'MERCADO PAGO GOLD TECH', 'MERCADO PAGO G. TECH',
      'MERCADO PAGO KADU', 'MERCADO PAGO TECH GOLD',
      'METAL',
      'NUBANK BRUNO', 'NUBANK G.TECH', 'NUBANK HELTON', 'NUBANK KADU', 'NUBANK THAÍS',
      'PAYPAL 24K', 'PAYPAL ETERNNO', 'PAYPAL GOLDTECH', 'PAYPAL TECHGOLD',
      'SANTANDER 24K', 'SANTANDER AUGUSTO', 'SANTANDER BRUNO', 'SANTANDER ETERNNO',
      'SANTANDER GOLD TECH', 'SANTANDER G. TECH', 'SANTANDER HELTON',
      'SANTANDER  H. TECH', 'SANTANDER KADU', 'SANTANDER TECH GOLD', 'SANTANDER THAIS',
      'SERGIO METAL',
      'SICREDI BRUNO',
    ],
  },
  {
    code: 'gti',
    label: 'Goldtech Ipanema',
    sigla: 'GTI',
    cod_prefix: 'I',
    permission: 'controle-gti',
    cor: '#10b981',
    caixa_bruto: ['Frente', 'Gaveta', 'Cafofo 1', 'Cafofo 2', 'Escritório'],
    trocados: ['Caixa 007', 'Caixa Trocados', 'Cofre'],
    avaliadores: AVALIADORES_ATIVOS,
    feedbacks_compra: [
      ...FEEDBACKS_TODOS,
      'Banca Aulus', 'Banca Banco do Brasil', 'Banca Hstern', 'Banca Porta',
      'Correios', 'Hidrante', 'Metro', 'Mochila Hstern', 'Zona Sul',
    ].sort(),
    feedbacks_nc: MOTIVOS_NC,
    tipos: MODALIDADES,
    empresas: EMPRESAS,
    tipos_despesa: [
      'Alimentação', 'Transporte', 'Material de escritório',
      'Serviço', 'Fornecedor', 'Outros',
    ],
    formas_pagamento: ['Dinheiro', 'PIX', 'Transferência', 'Cartão'],
    tipos_lancamento: ['PIX', 'SAQUE', 'PAGAMENTO', 'EMPRÉSTIMO', 'ENTRADA', 'DEVOLUÇÃO', 'CORRETO'],
    bancos_caixa: [
      'BMG KADU',
      'BTG AUGUSTO', 'BTG ETERNNO', 'BTG HELTON', 'BTG KADU', 'BTG THAÍS',
      'C6 AUGUSTO', 'C6 HELTON', 'C6 KADU',
      'ESPECIE',
      'INTER CLARISSE', 'INTER KADU', 'INTER MATHEUS', 'INTER THAIS',
      'ITAÚ A. TECH', 'ITAÚ AUGUSTO', 'ITAÚ BRUNO', 'ITAÚ  G. TECH', 'ITAÚ KADU', 'ITAÚ MATHEUS',
      'LANCAMENTOS',
      'MERCADO PAGO 24K', 'MERCADO PAGO A. TECH', 'MERCADO PAGO AUGUSTO',
      'MERCADO PAGO ETERNNO', 'MERCADO PAGO GOLD TECH', 'MERCADO PAGO G. TECH',
      'MERCADO PAGO KADU', 'MERCADO PAGO TECH GOLD',
      'METAL',
      'NUBANK BRUNO', 'NUBANK G.TECH', 'NUBANK HELTON', 'NUBANK KADU', 'NUBANK THAÍS',
      'PAYPAL 24K', 'PAYPAL ETERNNO', 'PAYPAL GOLDTECH', 'PAYPAL TECHGOLD',
      'SANTANDER 24K', 'SANTANDER AUGUSTO', 'SANTANDER BRUNO', 'SANTANDER ETERNNO',
      'SANTANDER GOLD TECH', 'SANTANDER G. TECH', 'SANTANDER HELTON',
      'SANTANDER  H. TECH', 'SANTANDER KADU', 'SANTANDER TECH GOLD', 'SANTANDER THAIS',
      'SERGIO METAL',
      'SICREDI BRUNO',
    ],
  },
  {
    code: '24k',
    label: '24K Méier',
    sigla: '24K',
    cod_prefix: 'M',
    permission: 'controle-24k',
    cor: '#f59e0b',
    caixa_bruto: ['Frente', 'Gaveta', 'Cafofo 1', 'Cafofo 2', 'Escritório'],
    trocados: ['Caixa 007', 'Caixa Trocados', 'Cofre'],
    avaliadores: AVALIADORES_ATIVOS,
    feedbacks_compra: [
      ...FEEDBACKS_TODOS,
      'Amigo Kids', 'Armadilha do Corpo', 'Banca Assaí', 'Banca Caixa', 'Banca Cartório',
      'Banca Casa Pedro', 'Banca Fórum', 'Banca Pernambucanas', 'Belíssima', 'Ex Padaria',
      'Habitual', 'Mochila Imperator', 'Mochila Venâncio', 'Nossa Drogaria', 'Objetiva',
      'Oxford', 'Pacheco', 'Padaria Rainha do Méier', 'Planeta Mulher', 'Ponto Mix',
      'Praça', 'Shopping Méier', 'Taco', 'Venâncio',
    ].sort(),
    feedbacks_nc: MOTIVOS_NC,
    tipos: MODALIDADES,
    empresas: EMPRESAS,
    tipos_despesa: [
      'Alimentação', 'Transporte', 'Material de escritório',
      'Serviço', 'Fornecedor', 'Outros',
    ],
    formas_pagamento: ['Dinheiro', 'PIX', 'Transferência', 'Cartão'],
    tipos_lancamento: ['PIX', 'SAQUE', 'PAGAMENTO', 'EMPRÉSTIMO', 'ENTRADA', 'DEVOLUÇÃO', 'CORRETO'],
    bancos_caixa: [
      'BMG KADU',
      'BTG AUGUSTO', 'BTG ETERNNO', 'BTG HELTON', 'BTG KADU', 'BTG THAÍS',
      'C6 AUGUSTO', 'C6 HELTON', 'C6 KADU',
      'ESPECIE',
      'INTER CLARISSE', 'INTER KADU', 'INTER MATHEUS', 'INTER THAIS',
      'ITAÚ A. TECH', 'ITAÚ AUGUSTO', 'ITAÚ BRUNO', 'ITAÚ  G. TECH', 'ITAÚ KADU', 'ITAÚ MATHEUS',
      'LANCAMENTOS',
      'MERCADO PAGO 24K', 'MERCADO PAGO A. TECH', 'MERCADO PAGO AUGUSTO',
      'MERCADO PAGO ETERNNO', 'MERCADO PAGO GOLD TECH', 'MERCADO PAGO G. TECH',
      'MERCADO PAGO KADU', 'MERCADO PAGO TECH GOLD',
      'METAL',
      'NUBANK BRUNO', 'NUBANK G.TECH', 'NUBANK HELTON', 'NUBANK KADU', 'NUBANK THAÍS',
      'PAYPAL 24K', 'PAYPAL ETERNNO', 'PAYPAL GOLDTECH', 'PAYPAL TECHGOLD',
      'SANTANDER 24K', 'SANTANDER AUGUSTO', 'SANTANDER BRUNO', 'SANTANDER ETERNNO',
      'SANTANDER GOLD TECH', 'SANTANDER G. TECH', 'SANTANDER HELTON',
      'SANTANDER  H. TECH', 'SANTANDER KADU', 'SANTANDER TECH GOLD', 'SANTANDER THAIS',
      'SERGIO METAL',
      'SICREDI BRUNO',
    ],
  },
  {
    code: 'ci',
    label: 'Prime Joias Copanema',
    sigla: 'CI',
    cod_prefix: 'CI',
    permission: 'controle-ci',
    cor: '#f43f5e',
    caixa_bruto: ['Frente', 'Gaveta', 'Cafofo 1', 'Cafofo 2', 'Escritório'],
    trocados: ['Caixa 007', 'Caixa Trocados', 'Cofre'],
    avaliadores: AVALIADORES_ATIVOS,
    feedbacks_compra: [...FEEDBACKS_TODOS].sort(),
    feedbacks_nc: MOTIVOS_NC,
    tipos: MODALIDADES,
    empresas: EMPRESAS,
    tipos_despesa: [
      'Alimentação', 'Transporte', 'Material de escritório',
      'Serviço', 'Fornecedor', 'Outros',
    ],
    formas_pagamento: ['Dinheiro', 'PIX', 'Transferência', 'Cartão'],
    tipos_lancamento: ['PIX', 'SAQUE', 'PAGAMENTO', 'EMPRÉSTIMO', 'ENTRADA', 'DEVOLUÇÃO', 'CORRETO'],
    bancos_caixa: [
      'BMG KADU',
      'BTG AUGUSTO', 'BTG ETERNNO', 'BTG HELTON', 'BTG KADU', 'BTG THAÍS',
      'C6 AUGUSTO', 'C6 HELTON', 'C6 KADU',
      'ESPECIE',
      'INTER CLARISSE', 'INTER KADU', 'INTER MATHEUS', 'INTER THAIS',
      'ITAÚ A. TECH', 'ITAÚ AUGUSTO', 'ITAÚ BRUNO', 'ITAÚ  G. TECH', 'ITAÚ KADU', 'ITAÚ MATHEUS',
      'LANCAMENTOS',
      'MERCADO PAGO 24K', 'MERCADO PAGO A. TECH', 'MERCADO PAGO AUGUSTO',
      'MERCADO PAGO ETERNNO', 'MERCADO PAGO GOLD TECH', 'MERCADO PAGO G. TECH',
      'MERCADO PAGO KADU', 'MERCADO PAGO TECH GOLD',
      'METAL',
      'NUBANK BRUNO', 'NUBANK G.TECH', 'NUBANK HELTON', 'NUBANK KADU', 'NUBANK THAÍS',
      'PAYPAL 24K', 'PAYPAL ETERNNO', 'PAYPAL GOLDTECH', 'PAYPAL TECHGOLD',
      'SANTANDER 24K', 'SANTANDER AUGUSTO', 'SANTANDER BRUNO', 'SANTANDER ETERNNO',
      'SANTANDER GOLD TECH', 'SANTANDER G. TECH', 'SANTANDER HELTON',
      'SANTANDER  H. TECH', 'SANTANDER KADU', 'SANTANDER TECH GOLD', 'SANTANDER THAIS',
      'SERGIO METAL',
      'SICREDI BRUNO',
    ],
  },
  {
    code: 'ptq',
    label: 'Prime Joias Taquara',
    sigla: 'PTQ',
    cod_prefix: 'Q',
    permission: 'controle-ptq',
    cor: '#0ea5e9',
    caixa_bruto: ['Frente', 'Gaveta', 'Cafofo 1', 'Cafofo 2', 'Escritório'],
    trocados: ['Caixa 007', 'Caixa Trocados', 'Cofre'],
    avaliadores: AVALIADORES_ATIVOS,
    feedbacks_compra: [...FEEDBACKS_TODOS].sort(),
    feedbacks_nc: MOTIVOS_NC,
    tipos: MODALIDADES,
    empresas: EMPRESAS,
    tipos_despesa: [
      'Alimentação', 'Transporte', 'Material de escritório',
      'Serviço', 'Fornecedor', 'Outros',
    ],
    formas_pagamento: ['Dinheiro', 'PIX', 'Transferência', 'Cartão'],
    tipos_lancamento: ['PIX', 'SAQUE', 'PAGAMENTO', 'EMPRÉSTIMO', 'ENTRADA', 'DEVOLUÇÃO', 'CORRETO'],
    bancos_caixa: [
      'BMG KADU',
      'BTG AUGUSTO', 'BTG ETERNNO', 'BTG HELTON', 'BTG KADU', 'BTG THAÍS',
      'C6 AUGUSTO', 'C6 HELTON', 'C6 KADU',
      'ESPECIE',
      'INTER CLARISSE', 'INTER KADU', 'INTER MATHEUS', 'INTER THAIS',
      'ITAÚ A. TECH', 'ITAÚ AUGUSTO', 'ITAÚ BRUNO', 'ITAÚ  G. TECH', 'ITAÚ KADU', 'ITAÚ MATHEUS',
      'LANCAMENTOS',
      'MERCADO PAGO 24K', 'MERCADO PAGO A. TECH', 'MERCADO PAGO AUGUSTO',
      'MERCADO PAGO ETERNNO', 'MERCADO PAGO GOLD TECH', 'MERCADO PAGO G. TECH',
      'MERCADO PAGO KADU', 'MERCADO PAGO TECH GOLD',
      'METAL',
      'NUBANK BRUNO', 'NUBANK G.TECH', 'NUBANK HELTON', 'NUBANK KADU', 'NUBANK THAÍS',
      'PAYPAL 24K', 'PAYPAL ETERNNO', 'PAYPAL GOLDTECH', 'PAYPAL TECHGOLD',
      'SANTANDER 24K', 'SANTANDER AUGUSTO', 'SANTANDER BRUNO', 'SANTANDER ETERNNO',
      'SANTANDER GOLD TECH', 'SANTANDER G. TECH', 'SANTANDER HELTON',
      'SANTANDER  H. TECH', 'SANTANDER KADU', 'SANTANDER TECH GOLD', 'SANTANDER THAIS',
      'SERGIO METAL',
      'SICREDI BRUNO',
    ],
  },
  {
    code: 'pgt',
    label: 'Premier Gold Tijuca',
    sigla: 'PGT',
    cod_prefix: 'GT',
    permission: 'controle-pgt',
    cor: '#a855f7',
    caixa_bruto: ['Frente', 'Gaveta', 'Cafofo 1', 'Cafofo 2', 'Escritório'],
    trocados: ['Caixa 007', 'Caixa Trocados', 'Cofre'],
    avaliadores: AVALIADORES_ATIVOS,
    feedbacks_compra: [...FEEDBACKS_TODOS].sort(),
    feedbacks_nc: MOTIVOS_NC,
    tipos: MODALIDADES,
    empresas: EMPRESAS,
    tipos_despesa: [
      'Alimentação', 'Transporte', 'Material de escritório',
      'Serviço', 'Fornecedor', 'Outros',
    ],
    formas_pagamento: ['Dinheiro', 'PIX', 'Transferência', 'Cartão'],
    tipos_lancamento: ['PIX', 'SAQUE', 'PAGAMENTO', 'EMPRÉSTIMO', 'ENTRADA', 'DEVOLUÇÃO', 'CORRETO'],
    bancos_caixa: [
      'BMG KADU',
      'BTG AUGUSTO', 'BTG ETERNNO', 'BTG HELTON', 'BTG KADU', 'BTG THAÍS',
      'C6 AUGUSTO', 'C6 HELTON', 'C6 KADU',
      'ESPECIE',
      'INTER CLARISSE', 'INTER KADU', 'INTER MATHEUS', 'INTER THAIS',
      'ITAÚ A. TECH', 'ITAÚ AUGUSTO', 'ITAÚ BRUNO', 'ITAÚ  G. TECH', 'ITAÚ KADU', 'ITAÚ MATHEUS',
      'LANCAMENTOS',
      'MERCADO PAGO 24K', 'MERCADO PAGO A. TECH', 'MERCADO PAGO AUGUSTO',
      'MERCADO PAGO ETERNNO', 'MERCADO PAGO GOLD TECH', 'MERCADO PAGO G. TECH',
      'MERCADO PAGO KADU', 'MERCADO PAGO TECH GOLD',
      'METAL',
      'NUBANK BRUNO', 'NUBANK G.TECH', 'NUBANK HELTON', 'NUBANK KADU', 'NUBANK THAÍS',
      'PAYPAL 24K', 'PAYPAL ETERNNO', 'PAYPAL GOLDTECH', 'PAYPAL TECHGOLD',
      'SANTANDER 24K', 'SANTANDER AUGUSTO', 'SANTANDER BRUNO', 'SANTANDER ETERNNO',
      'SANTANDER GOLD TECH', 'SANTANDER G. TECH', 'SANTANDER HELTON',
      'SANTANDER  H. TECH', 'SANTANDER KADU', 'SANTANDER TECH GOLD', 'SANTANDER THAIS',
      'SERGIO METAL',
      'SICREDI BRUNO',
    ],
  },
];

export function getLojaConfig(code: string): LojaConfig | undefined {
  return LOJAS.find(l => l.code === code);
}

export function metalCollection(loja: LojaCode): string {
  return `metal_${loja}`;
}

export function despesaCollection(loja: LojaCode): string {
  return `despesa_${loja}`;
}

export function lancamentoCollection(loja: LojaCode): string {
  return `lancamento_${loja}`;
}

export function caixaDoc(loja: LojaCode): string {
  return `caixa_${loja}`;
}

export const EMPRESA_TIPO_MAP: Record<string, string> = {
  'G. Tech Comércio de Joias LTDA': 'SCRAP',
  'A. Tech Comércio De Joias LTDA': 'SCRAP',
  'H. Tech Comércio De Joias LTDA': 'SCRAP',
  'Gold Tech Comércio de Joias LTDA': 'SECOND HAND',
  'Tech Gold Ipanema Comércio de Joias LTDA': 'SECOND HAND',
  '24K Joias | Thais Joias LTDA': 'SECOND HAND',
  'ETERNNO Comércio de Jóias e Artigos de Luxo LTDA': 'SECOND HAND',
};
