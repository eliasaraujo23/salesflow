import { useQuery } from '@tanstack/react-query';
import { fetchJfVendasAction, type JfVendasItem } from '@/lib/actions/fetch-jf-vendas';

export function useJfVendas() {
  return useQuery({
    queryKey: ['jf-vendas'],
    queryFn: async (): Promise<JfVendasItem[]> => {
      const result = await fetchJfVendasAction();
      if (result.httpStatus !== 200 || !result.data) {
        throw new Error(result.message ?? 'Erro ao carregar vendas JF');
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}
