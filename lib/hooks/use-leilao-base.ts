'use client';

import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const rowSchema = z.object({
  referencia:      z.string(),
  descricao_jewel: z.string().nullable(),
  preco_avista:    z.number().nullable(),
  preco_parcelado: z.number().nullable(),
  status_id:       z.number().nullable(),
  destino:         z.string().nullable(),
  produto:         z.string().nullable(),
  fotos:           z.number(),
});

const responseSchema = z.object({
  data: z.array(rowSchema),
});

export type LeilaoBaseRow = z.infer<typeof rowSchema> & {
  recomendacao: 'NORMAL' | 'TOP';
};

function deriveRecomendacao(preco: number | null): 'NORMAL' | 'TOP' {
  if (preco == null) return 'NORMAL';
  return preco >= 5000 ? 'TOP' : 'NORMAL';
}

export function statusLabel(id: number | null): string {
  if (id === 6) return 'EM COMODATO';
  if (id === 3) return 'SEM VENDA EFETIVADA';
  return 'DISPONÍVEL';
}

async function fetchBase(destinos: string[]): Promise<LeilaoBaseRow[]> {
  const res = await fetch('/api/leilao/base', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destinos }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Erro ao buscar base');
  const json = await res.json();
  const { data } = responseSchema.parse(json);
  return data.map(r => ({ ...r, recomendacao: deriveRecomendacao(r.preco_avista) }));
}

export function useLeilaoBase(activeDestinos: string[]) {
  return useQuery<LeilaoBaseRow[]>({
    queryKey:  ['leilao-base', activeDestinos],
    queryFn:   () => fetchBase(activeDestinos),
    staleTime: 5 * 60 * 1000,
  });
}
