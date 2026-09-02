'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

const itemSchema = z.object({
  id: z.string(),
  uploadId: z.string().nullable(),
  referencia: z.string().nullable(),
  avaliador: z.string(),
  valor: z.number(),
  motivo: z.string().nullable(),
});

export type GratificacaoItem = z.infer<typeof itemSchema>;

const EMPTY: GratificacaoItem[] = [];

function queryKey(uploadIds: string[], referencias: string[] = []) {
  return ['analise-ht-gratificacao', ...[...uploadIds].sort(), ...[...referencias].sort()];
}

async function fetchGratificacoes(uploadIds: string[], referencias: string[]): Promise<GratificacaoItem[]> {
  const params = new URLSearchParams();
  for (const id of uploadIds) params.append('uploadId', id);
  for (const ref of referencias) params.append('referencia', ref);
  const res = await fetch(`/api/analise-ht/gratificacao?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  const parsed = z.array(itemSchema).safeParse(body.data);
  return parsed.success ? parsed.data : [];
}

export function useAnaliseHtGratificacao(uploadIds: string[], referencias: string[] = []) {
  const qc = useQueryClient();
  const key = queryKey(uploadIds, referencias);

  const { data: itens = EMPTY, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fetchGratificacoes(uploadIds, referencias),
    enabled: uploadIds.length > 0 || referencias.length > 0,
  });

  const salvarMutation = useMutation({
    mutationFn: async (payload: { uploadId?: string; referencia?: string; avaliador: string; valor: number; motivo?: string }) => {
      const res = await fetch('/api/analise-ht/gratificacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Falha ao salvar gratificação.');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (err: Error) => toast.error(err.message),
  });

  const removerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/analise-ht/gratificacao/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao remover gratificação.');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    itens,
    isLoading,
    salvar: salvarMutation.mutate,
    salvarAsync: salvarMutation.mutateAsync,
    isSaving: salvarMutation.isPending,
    remover: removerMutation.mutate,
  };
}
