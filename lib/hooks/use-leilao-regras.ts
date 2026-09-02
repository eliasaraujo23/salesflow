'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

const QUERY_KEY = ['leilao-regras-destino'];

export interface RegraDestino {
  id:      string;
  destino: string;
  ativo:   boolean;
}

const regraSchema = z.object({ id: z.string(), destino: z.string(), ativo: z.boolean() });

async function fetchRegras(): Promise<RegraDestino[]> {
  const res = await fetch('/api/leilao/regras-destino', { cache: 'no-store' });
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  const parsed = z.array(regraSchema).safeParse(body.data);
  return parsed.success ? parsed.data : [];
}

export function useLeilaoRegras() {
  const qc = useQueryClient();
  const { data: regras = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchRegras,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });

  const activeDestinos = regras.map(r => r.destino);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const res = await fetch(`/api/leilao/regras-destino/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError:   (err: Error) => toast.error(`Erro ao atualizar: ${err.message}`),
  });

  const addMutation = useMutation({
    mutationFn: async (destino: string) => {
      const res = await fetch('/api/leilao/regras-destino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destino }),
      });
      if (!res.ok) throw new Error('Erro ao adicionar');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError:   (err: Error) => toast.error(`Erro ao adicionar: ${err.message}`),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leilao/regras-destino/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError:   (err: Error) => toast.error(`Erro ao remover: ${err.message}`),
  });

  const toggle = useCallback((id: string, ativo: boolean) =>
    toggleMutation.mutate({ id, ativo }), [toggleMutation]);

  const add = useCallback((destino: string) =>
    addMutation.mutate(destino), [addMutation]);

  const remove = useCallback((id: string) =>
    removeMutation.mutate(id), [removeMutation]);

  return { regras, activeDestinos, isLoading, toggle, add, remove };
}
