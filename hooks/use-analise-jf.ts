import { useQuery } from '@tanstack/react-query';
import { fetchAnaliseJfAction, type AnaliseJfData } from '@/lib/actions/fetch-analise-jf';

export function useAnaliseJf() {
  return useQuery({
    queryKey: ['analise-jf'],
    queryFn: async (): Promise<AnaliseJfData> => {
      const result = await fetchAnaliseJfAction();
      if (result.httpStatus !== 200 || !result.data) {
        throw new Error(result.message || 'Erro ao carregar análise JF');
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}
