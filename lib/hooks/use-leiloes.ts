'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

export type LeilaoStatus =
  | 'captando'
  | 'convite'
  | 'convite_catalogo'
  | 'venda_pos_leilao'
  | 'finalizado';

export interface Leilao {
  id: string;
  numero: string;
  nome: string;
  dataInicio: string; // yyyy-MM-dd
  dataFim: string;    // yyyy-MM-dd
  cor: string;
  codigoPlatforma: string;
  observacao?: string;
  status?: LeilaoStatus;
}

const QUERY_KEY = ['leilao-leiloes'];

const leilaoSchema = z.object({
  id: z.string(),
  numero: z.string(),
  nome: z.string(),
  dataInicio: z.string(),
  dataFim: z.string(),
  cor: z.string(),
  codigoPlatforma: z.string(),
  observacao: z.string().nullable(),
  status: z.enum(['captando', 'convite', 'convite_catalogo', 'venda_pos_leilao', 'finalizado']).nullable(),
});

async function fetchLeiloes(): Promise<Leilao[]> {
  const res = await fetch('/api/leilao/leiloes', { cache: 'no-store' });
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  const parsed = z.array(leilaoSchema).safeParse(body.data);
  if (!parsed.success) return [];
  return parsed.data.map((l) => ({
    ...l,
    observacao: l.observacao ?? undefined,
    status: l.status ?? undefined,
  }));
}

export function useLeiloes() {
  const qc = useQueryClient();
  const { data: leiloes = [] } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchLeiloes,
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
  });

  const addMutation = useMutation({
    mutationFn: async (l: Omit<Leilao, 'id'>) => {
      const res = await fetch('/api/leilao/leiloes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(l),
      });
      if (!res.ok) throw new Error('add failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: async (l: Leilao) => {
      const { id, ...rest } = l;
      const res = await fetch(`/api/leilao/leiloes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rest),
      });
      if (!res.ok) throw new Error('update failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leilao/leiloes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('remove failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const add = useCallback((l: Omit<Leilao, 'id'>) => {
    addMutation.mutate(l);
  }, [addMutation]);

  const update = useCallback((l: Leilao) => {
    updateMutation.mutate(l);
  }, [updateMutation]);

  const remove = useCallback((id: string) => {
    removeMutation.mutate(id);
  }, [removeMutation]);

  return { leiloes, add, update, remove };
}
