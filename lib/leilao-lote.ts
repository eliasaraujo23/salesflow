// Função pura, sem diretiva de client/server — pode ser importada tanto por
// rotas de API (servidor) quanto por hooks/componentes 'use client'.
export function loteParaDia(lote: number, numDias: number): number {
  return Math.min(numDias, Math.ceil(lote / 200));
}
