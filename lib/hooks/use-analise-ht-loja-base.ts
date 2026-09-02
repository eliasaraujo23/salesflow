'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

const itemSchema = z.object({
  id: z.string(),
  avaliador: z.string(),
  loja: z.string(),
});

export type LojaBaseItem = z.infer<typeof itemSchema>;

const QUERY_KEY = ['analise-ht-loja-base'];
const EMPTY: LojaBaseItem[] = [];

async function fetchLojaBase(): Promise<LojaBaseItem[]> {
  const res = await fetch('/api/analise-ht/loja-base', { cache: 'no-store' });
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  const parsed = z.array(itemSchema).safeParse(body.data);
  return parsed.success ? parsed.data : [];
}

export function useAnaliseHtLojaBase() {
  const qc = useQueryClient();
  const { data: itens = EMPTY, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchLojaBase,
  });

  const addMutation = useMutation({
    mutationFn: async (payload: { avaliador: string; loja: string }) => {
      const res = await fetch('/api/analise-ht/loja-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Falha ao adicionar avaliadora.');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (err: Error) => toast.error(err.message),
  });

  const moverMutation = useMutation({
    mutationFn: async ({ id, loja }: { id: string; loja: string }) => {
      const res = await fetch(`/api/analise-ht/loja-base/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loja }),
      });
      if (!res.ok) throw new Error('Falha ao mover avaliadora.');
    },
    onMutate: async ({ id, loja }) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const anterior = qc.getQueryData<LojaBaseItem[]>(QUERY_KEY);
      qc.setQueryData<LojaBaseItem[]>(QUERY_KEY, prev =>
        (prev ?? []).map(item => (item.id === id ? { ...item, loja } : item))
      );
      return { anterior };
    },
    onError: (err: Error, _vars, context) => {
      if (context?.anterior) qc.setQueryData(QUERY_KEY, context.anterior);
      toast.error(err.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/analise-ht/loja-base/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao remover avaliadora.');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    itens,
    isLoading,
    adicionar: addMutation.mutate,
    mover: moverMutation.mutate,
    remover: removeMutation.mutate,
  };
}
