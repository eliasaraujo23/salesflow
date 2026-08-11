'use client';

import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const rowSchema = z.object({
  referencia:       z.string(),
  descricao_jewel:  z.string().nullable(),
  preco_avista:     z.number().nullable(),
  status_id:        z.number().nullable(),
  destino:          z.string().nullable(),
  produto:          z.string().nullable(),
  fotos:            z.number(),
  fotos_principal:  z.number(),
  fotos_secundaria: z.number(),
});

export type PendenciaRow = z.infer<typeof rowSchema> & {
  pendencias: Pendencia[];
};

export type Pendencia =
  | 'SEM_PRECO'
  | 'SEM_FOTOS'
  | 'FOTOS_INSUFICIENTES'
  | 'SEM_FOTO_PRINCIPAL'
  | 'SEM_FOTO_SECUNDARIA';

export const PENDENCIA_LABELS: Record<Pendencia, string> = {
  SEM_PRECO:           'Sem preço à vista',
  SEM_FOTOS:           'Sem fotos',
  FOTOS_INSUFICIENTES: 'Menos de 6 fotos',
  SEM_FOTO_PRINCIPAL:  'Sem foto principal',
  SEM_FOTO_SECUNDARIA: 'Sem foto secundária',
};

export const PENDENCIA_COLOR: Record<Pendencia, string> = {
  SEM_PRECO:           'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400',
  SEM_FOTOS:           'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400',
  FOTOS_INSUFICIENTES: 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400',
  SEM_FOTO_PRINCIPAL:  'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400',
  SEM_FOTO_SECUNDARIA: 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400',
};

function derivePendencias(r: z.infer<typeof rowSchema>): Pendencia[] {
  const p: Pendencia[] = [];
  if (!r.preco_avista || r.preco_avista === 0) p.push('SEM_PRECO');
  if (r.fotos === 0)              p.push('SEM_FOTOS');
  else if (r.fotos < 6)          p.push('FOTOS_INSUFICIENTES');
  if (r.fotos > 0 && r.fotos_principal === 0)  p.push('SEM_FOTO_PRINCIPAL');
  if (r.fotos > 0 && r.fotos_secundaria === 0) p.push('SEM_FOTO_SECUNDARIA');
  return p;
}

async function fetchPendencias(destinos: string[]): Promise<PendenciaRow[]> {
  const res = await fetch('/api/leilao/pendencias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destinos }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Erro ao buscar pendências');
  const json = await res.json();
  const rows = z.object({ data: z.array(rowSchema) }).parse(json).data;
  return rows.map(r => ({ ...r, pendencias: derivePendencias(r) }));
}

export function useLeilaoPendencias(activeDestinos: string[]) {
  return useQuery<PendenciaRow[]>({
    queryKey:  ['leilao-pendencias', activeDestinos],
    queryFn:   () => fetchPendencias(activeDestinos),
    staleTime: 5 * 60 * 1000,
  });
}
