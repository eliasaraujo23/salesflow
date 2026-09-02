// Mesmas cores usadas em Controle de Lojas (lib/controle-config.ts) — PCI é
// a sigla usada nos CSVs de Análise HT para a loja chamada "CI" em
// Controle de Lojas (ver premiacao.ts).
export const CORES_LOJAS: Record<string, string> = {
  GTT: '#6366f1',
  '24K': '#f59e0b',
  GTI: '#10b981',
  PCI: '#f43f5e',
  PTQ: '#0ea5e9',
  PGT: '#a855f7',
  Gerente: '#64748b',
  'Sem loja': '#71717a',
};

export const ORDEM_LOJAS = ['GTT', '24K', 'GTI', 'PCI', 'PTQ', 'PGT', 'Gerente', 'Sem loja'];

export function corDaLoja(loja: string): string {
  return CORES_LOJAS[loja] ?? '#71717a';
}
