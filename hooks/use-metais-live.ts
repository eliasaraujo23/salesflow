'use client';

import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { Metal } from '@/components/firebase-provider';

const metalSchema = z.object({
  id: z.string(),
  tipo: z.enum(['entrada', 'cadastro', 'antigo']),
  metal: z.enum(['ouro', 'prata', 'platina']),
  chegou: z.number(),
  cadastrado: z.number(),
  sobrou: z.number(),
  peso: z.number(),
  origem: z.string(),
  data: z.string(),
  obs: z.string().nullable(),
  createdAt: z.string(),
});

async function fetchMetais(): Promise<Metal[]> {
  const res = await fetch('/api/metais', { cache: 'no-store' });
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({}));
  const parsed = z.array(metalSchema).safeParse(body.data);
  if (!parsed.success) return [];

  return parsed.data.map((m) => ({
    id: m.id,
    docId: m.id,
    tipo: m.tipo,
    metal: m.metal,
    chegou: m.chegou,
    cadastrado: m.cadastrado,
    sobrou: m.sobrou,
    peso: m.peso,
    origem: m.origem,
    data: m.data,
    obs: m.obs ?? undefined,
    createdAt: m.createdAt,
  }));
}

// Substitui o onSnapshot em Firestore metais.
export function useMetaisLive(enabled: boolean) {
  return useQuery({
    queryKey: ['metais-live'],
    queryFn: fetchMetais,
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
