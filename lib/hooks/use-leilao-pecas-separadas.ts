'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

const rowSchema = z.object({ codigoPlatforma: z.string(), referencia: z.string() });

async function fetchSeparadas(codigoPlatforma: string): Promise<Set<string>> {
  const res = await fetch(`/api/leilao/pecas-separadas?codigoPlatforma=${encodeURIComponent(codigoPlatforma)}`, { cache: 'no-store' });
  if (!res.ok) return new Set();
  const body = await res.json().catch(() => ({}));
  const parsed = z.array(rowSchema).safeParse(body.data);
  return parsed.success ? new Set(parsed.data.map(r => r.referencia)) : new Set();
}

export function useLeilaoPecasSeparadas(codigoPlatforma: string) {
  const qc = useQueryClient();
  const queryKey = ['leilao-pecas-separadas', codigoPlatforma];

  const { data: separadas = new Set<string>() } = useQuery({
    queryKey,
    queryFn: () => fetchSeparadas(codigoPlatforma),
    enabled: !!codigoPlatforma,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ referencia, separado }: { referencia: string; separado: boolean }) => {
      const res = await fetch('/api/leilao/pecas-separadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigoPlatforma, referencia, separado }),
      });
      if (!res.ok) throw new Error('falha ao atualizar');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (err: Error) => toast.error(`Erro ao marcar peça: ${err.message}`),
  });

  const toggle = useCallback((referencia: string, separado: boolean) =>
    toggleMutation.mutate({ referencia, separado }), [toggleMutation]);

  return { separadas, toggle };
}
