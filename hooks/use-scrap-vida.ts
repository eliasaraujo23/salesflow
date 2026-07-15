'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchScrapVidaAction } from '@/lib/actions/fetch-scrap-vida';

export function useScrapVida(from: string | undefined, to: string | undefined) {
  return useQuery({
    queryKey: ['scrap-vida', from, to],
    queryFn: async () => {
      if (!from || !to) throw new Error('Date range required');
      const res = await fetchScrapVidaAction(from, to);
      if (!res.data) throw new Error(res.message ?? 'Erro');
      return res.data;
    },
    enabled: !!from && !!to,
    staleTime: 5 * 60 * 1000,
  });
}
