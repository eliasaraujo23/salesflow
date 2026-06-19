import { useQuery } from '@tanstack/react-query';
import { fetchResaleAction, type ResaleData } from '@/lib/actions/fetch-resale';

export function useResale(from: string, to: string) {
  return useQuery({
    queryKey: ['resale', from, to],
    queryFn: async (): Promise<ResaleData> => {
      const result = await fetchResaleAction(from, to);
      if (result.httpStatus !== 200 || !result.data) {
        throw new Error(result.message ?? 'Erro ao carregar dados de revenda');
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!from && !!to,
  });
}
