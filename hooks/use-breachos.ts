'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

export interface Brecho {
  id: string;
  nome: string;
  estado: string;
  uf: string;
}

const QUERY_KEY = ['breachos'];

const brechoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  estado: z.string(),
  uf: z.string(),
});

async function fetchBreachos(): Promise<Brecho[]> {
  const res = await fetch('/api/breachos', { cache: 'no-store' });
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  const parsed = z.array(brechoSchema).safeParse(body.data);
  return parsed.success ? parsed.data : [];
}

export function useBreachos() {
  const qc = useQueryClient();
  const { data: breachos = [], isLoading: loading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchBreachos,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: async (data: Omit<Brecho, 'id'>) => {
      const res = await fetch('/api/breachos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao adicionar brechó');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/breachos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover brechó');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  async function addBrecho(data: Omit<Brecho, 'id'>) {
    await addMutation.mutateAsync(data);
  }

  async function removeBrecho(id: string) {
    await removeMutation.mutateAsync(id);
  }

  return { breachos, loading, addBrecho, removeBrecho };
}
